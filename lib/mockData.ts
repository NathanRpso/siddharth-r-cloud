import type {
  BallType,
  ClubId,
  CourseInfo,
  Device,
  Environment,
  Golfer,
  HoleResult,
  Session,
  SessionMode,
  Shot,
  Venue,
} from './types';
import { CLUB_AVERAGES, CLUB_ORDER } from './clubs';

// ============================================================================
// Seeded RNG (Mulberry32) — stable mock data across renders.
// ============================================================================
function rng(seed: number) {
  return function next() {
    seed = (seed + 0x6D2B79F5) | 0;
    let t = seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Box-Muller normal distribution.
function gauss(r: () => number, mean: number, sd: number) {
  const u = Math.max(r(), 1e-9);
  const v = r();
  const z = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  return mean + sd * z;
}

// ============================================================================
// Persona
// ============================================================================
export const GOLFER: Golfer = {
  firstName: 'Alex',
  lastName: 'Carter',
  email: 'alex.carter@example.com',
  birthday: '1995-08-12',
  gender: 'Male',
  country: 'United Kingdom',
  handicap: '20.1+',
  dexterity: 'Right Handed',
  units: 'Yards · mph',
  membership: { tier: 'Premium Membership', expiresOn: '07/13/2026' },
};

// "Today" anchors every relative date in the dataset. We use the real clock
// (evaluated once when this module loads, i.e. at build/launch) so the
// prototype always has a full year of mock data running right up to now —
// no stale "point in time" gaps on the dashboard. The seeded RNG keeps shot
// *values* stable; only the dates ride along with the calendar.
const TODAY = new Date();

// ============================================================================
// Shot generator
// ============================================================================
function generateShot(
  r: () => number,
  club: ClubId,
  sessionId: string,
  timestamp: string,
  device: Device,
  weekIndex: number,
): Shot {
  const avg = CLUB_AVERAGES[club];

  // Improvement arc across the full year: ~5% carry gain, ~20% tighter SD.
  const trend = 1 + (weekIndex / (TOTAL_WEEKS - 1)) * 0.05;
  const consistencyImprovement = 1 - (weekIndex / (TOTAL_WEEKS - 1)) * 0.2;

  // 20-handicap dispersion: ~6% std-dev on carry. Tighter on speeds, wider on direction.
  const carrySd = avg.carry * 0.06 * consistencyImprovement;
  const ballSpeedSd = avg.ballSpeed * 0.03 * consistencyImprovement;
  const clubSpeedSd = avg.clubSpeed * 0.025 * consistencyImprovement;
  const launchSd = 1.8 * consistencyImprovement;
  const spinSd = avg.spin * 0.12 * consistencyImprovement;
  const smashSd = 0.04 * consistencyImprovement;

  const carry = Math.max(20, gauss(r, avg.carry * trend, carrySd));
  const ballSpeed = Math.max(40, gauss(r, avg.ballSpeed * trend, ballSpeedSd));
  const clubSpeed = Math.max(40, gauss(r, avg.clubSpeed, clubSpeedSd));
  const smashRaw = ballSpeed / clubSpeed;
  const smash = Math.min(1.55, Math.max(1.05, gauss(r, avg.smash, smashSd) * 0.4 + smashRaw * 0.6));
  const launchAngle = gauss(r, avg.launch, launchSd);
  const launchDirection = gauss(r, 0.5, 3.2); // slight right bias for the persona
  const spinRate = Math.max(800, gauss(r, avg.spin, spinSd));
  const spinAxis = gauss(r, 4, 6); // bias toward fade
  const descentAngle = Math.max(10, gauss(r, avg.descent, 3));
  const apex = Math.max(8, gauss(r, avg.apex, avg.apex * 0.12));
  const rollFactor = club === 'Dr' ? 1.12 : club === '3W' || club === '5W' ? 1.06 : 1.02;
  const total = carry * rollFactor + gauss(r, 0, 2);
  // Side carry derived from launch direction + spin axis; scale by carry distance.
  const sideCarry = (launchDirection * 0.6 + spinAxis * 0.4) * (carry / 100);
  const attackAngle = club === 'Dr' ? gauss(r, -2, 1.5) : gauss(r, -3.5, 1.4);
  const clubPath = gauss(r, -2.5, 2.2);

  // Outlier flag: >2 sd from carry mean. Used by Session Detail to flag.
  const isOutlier = Math.abs(carry - avg.carry * trend) > 2 * carrySd;

  return {
    id: `${sessionId}-${club}-${Math.floor(r() * 1e9).toString(36)}`,
    sessionId,
    timestamp,
    club,
    carry: round1(carry),
    total: round1(total),
    ballSpeed: round1(ballSpeed),
    clubSpeed: round1(clubSpeed),
    smash: round2(smash),
    launchAngle: round1(launchAngle),
    launchDirection: round1(launchDirection),
    spinRate: Math.round(spinRate),
    spinAxis: round1(spinAxis),
    descentAngle: round1(descentAngle),
    apex: Math.round(apex),
    sideCarry: round1(sideCarry),
    attackAngle: round1(attackAngle),
    clubPath: round1(clubPath),
    device,
    hasVideo: device === 'MLM2PRO' && r() > 0.15, // most MLM2PRO shots have video
    isOutlier,
  };
}

function round1(n: number) { return Math.round(n * 10) / 10; }
function round2(n: number) { return Math.round(n * 100) / 100; }

// ============================================================================
// Session generator — 1 year back from TODAY, 2-3 sessions per week.
// ============================================================================
const SESSION_RECIPES: Array<{
  mode: SessionMode; clubs: ClubId[]; minShots: number; maxShots: number; env: Environment;
}> = [
  // Core "favourite club" sessions
  { mode: 'Range', clubs: ['Dr', '7i', 'PW'], minShots: 24, maxShots: 60, env: 'Outdoor' },
  { mode: 'Practice', clubs: ['Dr', '7i'], minShots: 20, maxShots: 40, env: 'Indoor' },
  { mode: 'Practice', clubs: ['Dr'], minShots: 12, maxShots: 24, env: 'Indoor' },
  // Iron focus — short irons
  { mode: 'Practice', clubs: ['7i', '8i', '9i', 'PW'], minShots: 24, maxShots: 48, env: 'Indoor' },
  { mode: 'Target Range', clubs: ['7i', '8i', '9i', 'PW'], minShots: 14, maxShots: 30, env: 'Outdoor' },
  // Iron focus — long/mid irons (ensures 4i, 5i, 6i get steady coverage)
  { mode: 'Practice', clubs: ['4i', '5i', '6i'], minShots: 18, maxShots: 30, env: 'Indoor' },
  { mode: 'Range', clubs: ['4i', '5i', '6i', '7i', '8i', '9i'], minShots: 30, maxShots: 60, env: 'Outdoor' },
  // Mixed range sessions
  { mode: 'Range', clubs: ['Dr', '5W', '6i', '8i', 'PW'], minShots: 40, maxShots: 80, env: 'Outdoor' },
  { mode: 'Range', clubs: ['Dr', '3W', '5i', '7i', '9i', 'SW'], minShots: 50, maxShots: 90, env: 'Outdoor' },
  // Full-bag range — ensures every club, including GW / LW / 4i, appears periodically
  { mode: 'Range', clubs: ['Dr', '3W', '5W', '4i', '5i', '6i', '7i', '8i', '9i', 'PW', 'GW', 'SW', 'LW'],
    minShots: 60, maxShots: 110, env: 'Outdoor' },
  // Wedge session — covers GW, SW, LW
  { mode: 'Practice', clubs: ['PW', 'GW', 'SW', 'LW'], minShots: 24, maxShots: 40, env: 'Indoor' },
  // Combine standardised skills test — generated by station, not by recipe
  // block; clubs/shot-count here are placeholders (see generateCombineShots).
  { mode: 'Combine', clubs: ['Dr', '6i', 'PW'], minShots: 30, maxShots: 30, env: 'Outdoor' },
  // Closest-to-pin game — scoring wedges, hit at a pin for proximity.
  { mode: 'Closest to Pin', clubs: ['9i', 'PW', 'GW', 'SW'], minShots: 10, maxShots: 18, env: 'Outdoor' },
  // Course rounds — broad club mix mirroring on-course shot selection. No
  // putter (R-Cloud doesn't capture putts), so shot counts skew lower than
  // total strokes.
  { mode: 'Course', clubs: ['Dr', '3W', '5i', '6i', '7i', '8i', '9i', 'PW', 'GW', 'SW'],
    minShots: 55, maxShots: 80, env: 'Outdoor' },
  { mode: 'Course', clubs: ['Dr', '3W', '5W', '4i', '6i', '7i', '8i', '9i', 'PW', 'GW', 'SW', 'LW'],
    minShots: 60, maxShots: 85, env: 'Outdoor' },
];

const BALL_TYPES: BallType[] = ['Range Ball', 'Callaway Chrome Soft X', 'Pro V1', 'TaylorMade TP5'];

// Named venues that occasionally host sessions (vs the default "home" setup).
// All fictional — no real-world brand names.
const VENUES: Venue[] = [
  { name: 'Smythe Park Golf Club', type: 'Range',          city: 'Surrey' },
  { name: 'Putterz Mayfair',       type: 'Sim Centre',     city: 'London' },
  { name: 'Lineworks Studio',      type: 'Fitting Studio', city: 'Edinburgh' },
  { name: 'Golf5 Tokyo',           type: 'Fitting Studio', city: 'Tokyo' },
  // Golf courses for on-course rounds.
  { name: 'Heathwood Links',       type: 'Golf Course',    city: 'Kent' },
  { name: 'Brackley Park GC',      type: 'Golf Course',    city: 'Northants' },
  { name: 'St Pavers Old Course',  type: 'Golf Course',    city: 'East Lothian' },
  { name: 'Wildmere Heath',        type: 'Golf Course',    city: 'Surrey' },
];

/** Course pars — par 70/71/72 mix matches most UK parkland & links courses. */
const COURSE_PARS: Record<string, number> = {
  'Heathwood Links':      71,
  'Brackley Park GC':     72,
  'St Pavers Old Course': 70,
  'Wildmere Heath':       72,
};

function pickVenue(r: () => number, env: Environment, mode: SessionMode): Venue | null {
  // Course rounds are always at a Golf Course venue.
  if (mode === 'Course') {
    const courses = VENUES.filter((v) => v.type === 'Golf Course');
    return courses[Math.floor(r() * courses.length)];
  }
  // Roughly 35% of outdoor sessions and 15% of indoor sessions are at a named venue.
  const isVenue =
    env === 'Outdoor'
      ? r() < 0.35
      : mode === 'Combine' || r() < 0.15;
  if (!isVenue) return null;
  // Pick by environment compatibility — exclude course venues from non-course modes.
  const pool =
    env === 'Outdoor'
      ? VENUES.filter((v) => v.type === 'Range')
      : VENUES.filter((v) => v.type === 'Sim Centre' || v.type === 'Fitting Studio');
  if (!pool.length) return null;
  return pool[Math.floor(r() * pool.length)];
}

/** Build a par sequence summing to `par`, with a realistic 3/4/5 mix. */
function buildPars(r: () => number, holes: number, par: number): (3 | 4 | 5)[] {
  const arr: (3 | 4 | 5)[] = new Array(holes).fill(4);
  // sum = 4*holes + (#par5 − #par3) = par  →  #par5 − #par3 = diff
  const diff = par - 4 * holes;
  const baseThrees = holes === 18 ? 4 : 2;
  let n3 = baseThrees;
  let n5 = n3 + diff;
  if (n5 < 0) { n3 += -n5; n5 = 0; }
  // Fisher–Yates shuffle of hole indices so the 3s/5s land in varied spots.
  const idx = Array.from({ length: holes }, (_, i) => i);
  for (let i = holes - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [idx[i], idx[j]] = [idx[j], idx[i]];
  }
  for (let k = 0; k < n3 && k < idx.length; k++) arr[idx[k]] = 3;
  for (let k = 0; k < n5 && n3 + k < idx.length; k++) arr[idx[n3 + k]] = 5;
  return arr;
}

/** Build a hole-by-hole scorecard for a ~20-handicap virtual round. */
function buildHoles(r: () => number, holesPlayed: number, par: number): HoleResult[] {
  const pars = buildPars(r, holesPlayed, par);
  return pars.map((p, i) => {
    // Score relative to par — bogey-golfer distribution.
    const roll = r();
    const delta = roll < 0.04 ? -1 : roll < 0.24 ? 0 : roll < 0.64 ? 1 : roll < 0.89 ? 2 : 3;
    const strokes = p + delta;
    // GIR correlates with scoring; fairways looser. Both illustrative.
    const gir = delta <= 0 ? r() < 0.85 : delta === 1 ? r() < 0.3 : r() < 0.08;
    const putts = gir ? (r() < 0.2 ? 1 : 2) : (r() < 0.55 ? 2 : 1);
    const fairwayHit = p === 3 ? null : delta <= 1 ? r() < 0.55 : r() < 0.32;
    const yards =
      p === 3 ? 130 + Math.floor(r() * 70) :
      p === 4 ? 330 + Math.floor(r() * 130) :
      480 + Math.floor(r() * 75);
    return { hole: i + 1, par: p, yards, strokes, fairwayHit, gir, putts };
  });
}

/** Generate course-round metadata for a 20-handicap. Builds the scorecard
 *  first so the headline strokes/par always reconcile with the holes. */
function generateCourseInfo(r: () => number, venue: Venue): CourseInfo {
  const holesPlayed: 9 | 18 = r() < 0.2 ? 9 : 18;
  const basePar = COURSE_PARS[venue.name] ?? 72;
  const par = holesPlayed === 18 ? basePar : Math.round(basePar / 2);
  const holes = buildHoles(r, holesPlayed, par);
  const strokes = holes.reduce((a, h) => a + h.strokes, 0);
  return { name: venue.name, par, strokes, holesPlayed, holes };
}

/** Assign each shot a hole number, distributed monotonically across the
 *  round by per-hole full-swing count (strokes minus putts). */
function assignHoles(shots: Shot[], holes: HoleResult[]) {
  const slots: number[] = [];
  for (const h of holes) {
    const full = Math.max(1, h.strokes - h.putts);
    for (let k = 0; k < full; k++) slots.push(h.hole);
  }
  if (!slots.length || !shots.length) return;
  shots.forEach((sh, i) => {
    const slot = Math.min(slots.length - 1, Math.floor((i / shots.length) * slots.length));
    sh.hole = slots[slot];
  });
}

/** Round a club's nominal carry to a clean 5-yd target "station". */
function targetForClub(club: ClubId): number {
  return Math.round(CLUB_AVERAGES[club].carry / 5) * 5;
}

/** Combine is a standardised test: fixed stations down the bag, equal
 *  shots each, so the scorecard reads station-by-station. */
const COMBINE_STATION_CLUBS: ClubId[] = ['Dr', '7i', '9i', 'PW', 'GW', 'SW'];
const COMBINE_SHOTS_PER_STATION = 5;

function generateCombineShots(
  r: () => number,
  sessionId: string,
  date: Date,
  device: Device,
  weekIndex: number,
): Shot[] {
  const shots: Shot[] = [];
  let i = 0;
  for (const club of COMBINE_STATION_CLUBS) {
    for (let k = 0; k < COMBINE_SHOTS_PER_STATION; k++) {
      const ts = new Date(date);
      ts.setMinutes(ts.getMinutes() + i * 2);
      const sh = generateShot(r, club, sessionId, ts.toISOString(), device, weekIndex);
      sh.targetCarry = targetForClub(club);
      shots.push(sh);
      i++;
    }
  }
  return shots;
}

function pickBallType(r: () => number, env: Environment, mode: SessionMode): BallType {
  if (env === 'Outdoor' && (mode === 'Range' || mode === 'Target Range')) return 'Range Ball';
  return BALL_TYPES[1 + Math.floor(r() * 3)];
}

// Total history span — 52 weeks gives the trend chart enough data for
// 3 months / 6 months / 1 year toggles.
const TOTAL_WEEKS = 52;

function pickDevice(r: () => number, weekIndex: number): Device {
  // Newer weeks weighted toward MLM2PRO; older weeks were mostly MLM
  // (mirroring a real golfer who upgraded mid-period).
  const pro2Bias = 0.25 + (weekIndex / (TOTAL_WEEKS - 1)) * 0.70;
  return r() < pro2Bias ? 'MLM2PRO' : 'MLM';
}

function generateSessions(): Session[] {
  const r = rng(20260513);
  const sessions: Session[] = [];

  for (let w = 0; w < TOTAL_WEEKS; w++) {
    const sessionsThisWeek = 1 + Math.floor(r() * 3); // 1-3
    for (let s = 0; s < sessionsThisWeek; s++) {
      const recipe = SESSION_RECIPES[Math.floor(r() * SESSION_RECIPES.length)];
      const weekIndex = (TOTAL_WEEKS - 1) - w; // chronological order: highest = newest
      const dayOffset = w * 7 + Math.floor(r() * 7);
      const date = new Date(TODAY);
      date.setDate(date.getDate() - dayOffset);
      date.setHours(9 + Math.floor(r() * 10), Math.floor(r() * 60), 0, 0);

      const sessionId = `s-${date.getFullYear()}${(date.getMonth() + 1).toString().padStart(2, '0')}${date.getDate().toString().padStart(2, '0')}-${s}`;
      const totalShots = recipe.minShots + Math.floor(r() * (recipe.maxShots - recipe.minShots + 1));
      const device = pickDevice(r, weekIndex);

      // Real golfers practice in blocks — hit the same club for a stretch
      // before switching. Pick a club, stay on it for 5-15 shots, then
      // re-roll. Course rounds break this pattern (you naturally switch
      // clubs hole-to-hole) so they use short 1-3 blocks instead. Combine
      // is generated by fixed station instead of blocks.
      let shots: Shot[];
      if (recipe.mode === 'Combine') {
        shots = generateCombineShots(r, sessionId, date, device, weekIndex);
      } else {
        const minBlock = recipe.mode === 'Course' ? 1 : 5;
        const maxBlock = recipe.mode === 'Course' ? 3 : 15;
        shots = [];
        let currentClub: ClubId = recipe.clubs[Math.floor(r() * recipe.clubs.length)];
        let blockRemaining = minBlock + Math.floor(r() * (maxBlock - minBlock + 1));
        for (let i = 0; i < totalShots; i++) {
          if (blockRemaining <= 0) {
            currentClub = recipe.clubs[Math.floor(r() * recipe.clubs.length)];
            blockRemaining = minBlock + Math.floor(r() * (maxBlock - minBlock + 1));
          }
          const ts = new Date(date);
          ts.setMinutes(ts.getMinutes() + i * 2); // ~2 min between shots
          shots.push(generateShot(r, currentClub, sessionId, ts.toISOString(), device, weekIndex));
          blockRemaining--;
        }
        // Target-based open modes: tag each shot with its chosen station.
        if (recipe.mode === 'Target Range' || recipe.mode === 'Closest to Pin') {
          for (const sh of shots) sh.targetCarry = targetForClub(sh.club);
        }
      }

      const venue = pickVenue(r, recipe.env, recipe.mode);
      const course =
        recipe.mode === 'Course' && venue ? generateCourseInfo(r, venue) : undefined;
      if (course?.holes) assignHoles(shots, course.holes);
      sessions.push({
        id: sessionId,
        date: date.toISOString(),
        mode: recipe.mode,
        environment: recipe.env,
        ballType: pickBallType(r, recipe.env, recipe.mode),
        elevation: recipe.env === 'Indoor' ? 0 : Math.floor(r() * 110),
        venue,
        shots,
        course,
      });
    }
  }

  // Newest first.
  return sessions.sort((a, b) => +new Date(b.date) - +new Date(a.date));
}

export const SESSIONS: Session[] = generateSessions();

export const ALL_SHOTS: Shot[] = SESSIONS.flatMap((s) => s.shots);

export function getSession(id: string): Session | undefined {
  return SESSIONS.find((s) => s.id === id);
}

export function getShotsForClub(club: ClubId): Shot[] {
  return ALL_SHOTS.filter((sh) => sh.club === club);
}

export function getClubsUsedInSession(session: Session): ClubId[] {
  const seen = new Set<ClubId>();
  for (const sh of session.shots) seen.add(sh.club);
  return CLUB_ORDER.filter((c) => seen.has(c));
}
