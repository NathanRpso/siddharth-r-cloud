import type { ClubId, HoleResult, Session, Shot, VenueType } from './types';
import { CLUB_AVERAGES, CLUB_ORDER } from './clubs';

export function mean(nums: number[]) {
  if (!nums.length) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

export function median(nums: number[]) {
  if (!nums.length) return 0;
  const sorted = [...nums].sort((a, b) => a - b);
  const m = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[m] : (sorted[m - 1] + sorted[m]) / 2;
}

export function stdDev(nums: number[]) {
  if (nums.length < 2) return 0;
  const m = mean(nums);
  const variance = nums.reduce((a, b) => a + (b - m) ** 2, 0) / (nums.length - 1);
  return Math.sqrt(variance);
}

/** Bounding ellipse area (sq yds) over (sideCarry, carry) for a club's shots. */
export function dispersionArea(shots: Shot[]) {
  if (shots.length < 3) return 0;
  const sideSd = stdDev(shots.map((s) => s.sideCarry));
  const carrySd = stdDev(shots.map((s) => s.carry));
  // 2-sigma ellipse area = π × 2σx × 2σy
  return Math.round(Math.PI * 2 * sideSd * 2 * carrySd);
}

export interface ClubAggregate {
  club: ClubId;
  count: number;
  avgCarry: number;
  medianCarry: number;
  carrySd: number;
  avgTotal: number;
  avgBallSpeed: number;
  avgClubSpeed: number;
  avgSmash: number;
  smashSd: number;
  avgLaunch: number;
  avgSpin: number;
  avgSideCarry: number;
  sideCarrySd: number;
  dispersion: number;
  best: Shot;
  worst: Shot;
}

export function aggregateByClub(shots: Shot[]): ClubAggregate[] {
  const byClub = new Map<ClubId, Shot[]>();
  for (const s of shots) {
    const arr = byClub.get(s.club) ?? [];
    arr.push(s);
    byClub.set(s.club, arr);
  }
  const result: ClubAggregate[] = [];
  for (const club of CLUB_ORDER) {
    const arr = byClub.get(club);
    if (!arr || !arr.length) continue;
    const carries = arr.map((s) => s.carry);
    const smashes = arr.map((s) => s.smash);
    const sideCarries = arr.map((s) => s.sideCarry);
    const avgCarryVal = mean(carries);
    // "Best" = closest-to-ideal-and-longest. "Worst" = furthest from avg.
    const best = arr.reduce((b, s) => (s.carry > b.carry ? s : b));
    const worst = arr.reduce((w, s) =>
      Math.abs(s.carry - avgCarryVal) > Math.abs(w.carry - avgCarryVal) ? s : w
    );
    result.push({
      club,
      count: arr.length,
      avgCarry: avgCarryVal,
      medianCarry: median(carries),
      carrySd: stdDev(carries),
      avgTotal: mean(arr.map((s) => s.total)),
      avgBallSpeed: mean(arr.map((s) => s.ballSpeed)),
      avgClubSpeed: mean(arr.map((s) => s.clubSpeed)),
      avgSmash: mean(smashes),
      smashSd: stdDev(smashes),
      avgLaunch: mean(arr.map((s) => s.launchAngle)),
      avgSpin: mean(arr.map((s) => s.spinRate)),
      avgSideCarry: mean(sideCarries),
      sideCarrySd: stdDev(sideCarries),
      dispersion: dispersionArea(arr),
      best,
      worst,
    });
  }
  return result;
}

export interface SessionInsights {
  shotCount: number;
  clubCount: number;
  avgCarry: number;
  avgSmash: number;
  smashSd: number;
  sideCarrySd: number;       // session-wide left/right tightness (yds)
  consistencyScore: number;  // 0-100, derived from avg per-club carry sd
  outlierCount: number;
  best: Shot;
  worst: Shot;
  bestClub: { club: ClubId; consistency: number };
  worstClub: { club: ClubId; consistency: number };
  longestShot: Shot;
  fastestBallSpeed: Shot;
  byClub: ClubAggregate[];
}

export function sessionInsights(session: Session): SessionInsights | null {
  const shots = session.shots;
  if (!shots.length) return null;

  const byClub = aggregateByClub(shots);
  // Consistency score = inverse of normalised carry std-dev.
  const consistencyByClub = byClub.map((c) => ({
    club: c.club,
    consistency: 100 - Math.min(100, (c.carrySd / c.avgCarry) * 100 * 8),
  }));
  consistencyByClub.sort((a, b) => b.consistency - a.consistency);

  const carries = shots.map((s) => s.carry);
  const smashes = shots.map((s) => s.smash);

  // Avg per-club carry sd, normalised by avg carry → consistency score 0-100.
  const carryCv = byClub.map((c) => c.carrySd / c.avgCarry);
  const avgCv = mean(carryCv);
  const consistencyScore = Math.max(0, Math.min(100, 100 - avgCv * 100 * 6));

  return {
    shotCount: shots.length,
    clubCount: byClub.length,
    avgCarry: mean(carries),
    avgSmash: mean(smashes),
    smashSd: stdDev(smashes),
    sideCarrySd: stdDev(shots.map((s) => s.sideCarry)),
    consistencyScore,
    outlierCount: shots.filter((s) => s.isOutlier).length,
    best: shots.reduce((b, s) => (s.carry > b.carry ? s : b)),
    worst: shots.reduce((w, s) => (s.carry < w.carry ? s : w)),
    bestClub: consistencyByClub[0],
    worstClub: consistencyByClub[consistencyByClub.length - 1],
    longestShot: shots.reduce((b, s) => (s.total > b.total ? s : b)),
    fastestBallSpeed: shots.reduce((b, s) => (s.ballSpeed > b.ballSpeed ? s : b)),
    byClub,
  };
}

/** Compare a session to all prior shots for the same clubs.
 *  Returns deltas (current - prior) so positive = improvement for carry/smash,
 *  positive = worse for sd/dispersion. */
export interface SessionDeltas {
  carryDelta: number | null;
  smashDelta: number | null;
  smashSdDelta: number | null;
  sideCarrySdDelta: number | null;
  bestClubDeltaPct: number | null;
}

export function compareToBaseline(
  session: Session,
  priorShots: Shot[],
): SessionDeltas {
  const sessionClubs = new Set(session.shots.map((s) => s.club));
  const baseline = priorShots.filter((s) => sessionClubs.has(s.club));
  if (!baseline.length) {
    return {
      carryDelta: null, smashDelta: null, smashSdDelta: null,
      sideCarrySdDelta: null, bestClubDeltaPct: null,
    };
  }
  const sessionCarry = mean(session.shots.map((s) => s.carry));
  const sessionSmash = mean(session.shots.map((s) => s.smash));
  const sessionSmashSd = stdDev(session.shots.map((s) => s.smash));
  const sessionSideSd = stdDev(session.shots.map((s) => s.sideCarry));

  const baseCarry = mean(baseline.map((s) => s.carry));
  const baseSmash = mean(baseline.map((s) => s.smash));
  const baseSmashSd = stdDev(baseline.map((s) => s.smash));
  const baseSideSd = stdDev(baseline.map((s) => s.sideCarry));

  return {
    carryDelta: sessionCarry - baseCarry,
    smashDelta: sessionSmash - baseSmash,
    smashSdDelta: sessionSmashSd - baseSmashSd,
    sideCarrySdDelta: sessionSideSd - baseSideSd,
    bestClubDeltaPct: null,
  };
}

/* ────────────────────────────────────────────────────────────────────
   PER-CARD HEADLINE
   A short one-liner above each session card giving it a memorable
   identity beyond the score. Built from comparisons against lifetime
   data so the language is grounded ("PB on Driver — 232 yds") rather
   than generic ("Great session!").
   ──────────────────────────────────────────────────────────────────── */

export interface HeadlineContext {
  /** Per-club lifetime PB carry — { shotId, value }. The shotId lets a
   *  card flag itself as the holder of the PB rather than every session
   *  whose max equals the lifetime max. */
  pbCarryByClub: Partial<Record<ClubId, { shotId: string; carry: number }>>;
  /** Per-club lifetime avg carry, used as the "your usual" baseline. */
  carryAvgByClub: Partial<Record<ClubId, number>>;
}

export function buildHeadlineContext(shots: Shot[]): HeadlineContext {
  const pbCarryByClub: HeadlineContext['pbCarryByClub'] = {};
  const sums: Partial<Record<ClubId, number>> = {};
  const counts: Partial<Record<ClubId, number>> = {};
  for (const s of shots) {
    const cur = pbCarryByClub[s.club];
    if (!cur || s.carry > cur.carry) {
      pbCarryByClub[s.club] = { shotId: s.id, carry: s.carry };
    }
    sums[s.club] = (sums[s.club] ?? 0) + s.carry;
    counts[s.club] = (counts[s.club] ?? 0) + 1;
  }
  const carryAvgByClub: HeadlineContext['carryAvgByClub'] = {};
  for (const c of CLUB_ORDER) {
    const count = counts[c];
    if (count && count > 0) carryAvgByClub[c] = (sums[c] ?? 0) / count;
  }
  return { pbCarryByClub, carryAvgByClub };
}

export type CardHeadlineKind = 'pb' | 'improvement' | 'outliers' | 'cleanest';

export interface CardHeadline {
  kind: CardHeadlineKind;
  tone: 'positive' | 'warn';
  /** One-liner to display above the card body. */
  text: string;
}

/** Pick the most memorable one-liner for this session, or null when no
 *  insight rises above the noise floor. Priority is PB → big carry
 *  improvement → cleanest contact → notable outlier count. */
export function pickCardHeadline(
  session: Session,
  ctx: HeadlineContext,
): CardHeadline | null {
  const shots = session.shots;
  if (!shots.length) return null;

  // 1. Personal-best carry — flag only the session containing the PB shot.
  for (const sh of shots) {
    const pb = ctx.pbCarryByClub[sh.club];
    if (pb && pb.shotId === sh.id && sh.carry > 0) {
      return {
        kind: 'pb',
        tone: 'positive',
        text: `Personal best on ${sh.club} — ${Math.round(sh.carry)} yds`,
      };
    }
  }

  // 2. Carry-up on a club — biggest positive delta vs lifetime average.
  const byClub = aggregateByClub(shots);
  let bestImprovement: { club: ClubId; delta: number } | null = null;
  for (const c of byClub) {
    if (c.count < 5) continue;
    const baseline = ctx.carryAvgByClub[c.club];
    if (!baseline) continue;
    const delta = c.avgCarry - baseline;
    if (delta >= 4 && (!bestImprovement || delta > bestImprovement.delta)) {
      bestImprovement = { club: c.club, delta };
    }
  }
  if (bestImprovement) {
    return {
      kind: 'improvement',
      tone: 'positive',
      text: `+${Math.round(bestImprovement.delta)} yds on ${bestImprovement.club} vs your usual`,
    };
  }

  // 3. Cleanest contact — smash std-dev unusually tight for this session.
  const smashSd = stdDev(shots.map((s) => s.smash));
  if (shots.length >= 10 && smashSd < 0.035) {
    return {
      kind: 'cleanest',
      tone: 'positive',
      text: 'Cleanest contact in a while',
    };
  }

  // 4. Surprise shots — useful to call out when there are several to review.
  const outliers = shots.filter((s) => s.isOutlier).length;
  if (outliers >= 3) {
    return {
      kind: 'outliers',
      tone: 'warn',
      text: `${outliers} surprise shots — worth a look`,
    };
  }

  return null;
}

/** Plain-English insight callouts. Returns 2-4 prioritised narratives. */
export type NarrativeKind =
  | 'best-club'
  | 'worst-club'
  | 'smash-up'
  | 'smash-down'
  | 'surprise-shots';

export interface Narrative {
  kind: NarrativeKind;
  tone: 'positive' | 'warn' | 'neutral';
  /** Small anchor strip above the headline — leads with the data. */
  eyebrow: string;
  /** Main one-liner takeaway. */
  headline: string;
  /** Supporting "why this matters" line. */
  detail: string;
  /** Club this insight is about — shown as a coloured chip when set. */
  club?: ClubId;
  /** Optional in-card action. */
  cta?: { label: string; href: string };
}

export function generateNarratives(
  insights: SessionInsights,
  deltas: SessionDeltas,
  sessionId: string,
): Narrative[] {
  const out: Narrative[] = [];

  // 1. Best club today — anchor narrative.
  if (insights.bestClub && insights.byClub.length > 1) {
    const club = insights.byClub.find((c) => c.club === insights.bestClub.club);
    if (club) {
      const range = Math.round(club.carrySd * 2);
      out.push({
        kind: 'best-club',
        tone: 'positive',
        club: club.club,
        eyebrow: `${club.count} shots · ±${range} yds spread`,
        headline: 'Your most reliable club today.',
        detail: 'Tighter than the rest of the bag — keep this groove going.',
      });
    }
  }

  // 2. Smash trend
  if (deltas.smashDelta !== null && Math.abs(deltas.smashDelta) > 0.015) {
    const better = deltas.smashDelta > 0;
    const sign = deltas.smashDelta > 0 ? '+' : '';
    out.push({
      kind: better ? 'smash-up' : 'smash-down',
      tone: better ? 'positive' : 'warn',
      eyebrow: `${sign}${deltas.smashDelta.toFixed(2)} smash vs your usual`,
      headline: better
        ? 'Striking the ball cleaner today.'
        : 'Strike quality dropped a touch.',
      detail: better
        ? 'Centre-face contact is up — more distance per swing.'
        : 'Contact is drifting off-centre. Check setup and ball position next session.',
    });
  }

  // 3. Outliers
  if (insights.outlierCount > 0) {
    out.push({
      kind: 'surprise-shots',
      tone: 'warn',
      eyebrow: `${insights.outlierCount} flagged`,
      headline: `${insights.outlierCount} surprise shot${insights.outlierCount > 1 ? 's' : ''} worth a look.`,
      detail: 'Each one landed well off your usual for the club used. Open them side-by-side to spot a pattern.',
      cta: { label: 'Open in Shot Review', href: `/shot-review?session=${sessionId}&outliers=1` },
    });
  }

  // 4. Worst club
  if (insights.worstClub && insights.byClub.length > 1) {
    const club = insights.byClub.find((c) => c.club === insights.worstClub.club);
    if (club && club.count >= 3) {
      const range = Math.round(club.carrySd * 2);
      out.push({
        kind: 'worst-club',
        tone: 'neutral',
        club: club.club,
        eyebrow: `${club.count} swings · ±${range} yds spread`,
        headline: 'Your widest club today.',
        detail: 'Worth a focused block next session.',
      });
    }
  }

  return out.slice(0, 4);
}

/** Weekly trend buckets for a chosen metric, over the past N weeks. */
export function weeklyTrend(
  shots: Shot[],
  metric: keyof Pick<Shot, 'carry' | 'ballSpeed' | 'clubSpeed' | 'smash'>,
  weeks = 12,
) {
  const now = new Date();
  const buckets: { weekStart: Date; values: number[] }[] = [];
  for (let i = 0; i < weeks; i++) {
    const start = new Date(now);
    start.setDate(start.getDate() - (weeks - 1 - i) * 7);
    start.setHours(0, 0, 0, 0);
    buckets.push({ weekStart: start, values: [] });
  }
  for (const s of shots) {
    const t = new Date(s.timestamp).getTime();
    for (let i = buckets.length - 1; i >= 0; i--) {
      if (t >= buckets[i].weekStart.getTime()) {
        buckets[i].values.push(s[metric] as number);
        break;
      }
    }
  }
  return buckets.map((b) => ({
    weekStart: b.weekStart,
    label: b.weekStart.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }),
    avg: b.values.length ? mean(b.values) : null,
    count: b.values.length,
  }));
}

/** Percentile band for handicap 20 — very rough public references. */
export const HANDICAP_BENCHMARKS_20: Record<string, { p25: number; p50: number; p75: number }> = {
  driverCarry:        { p25: 195, p50: 215, p75: 235 },
  driverClubSpeed:    { p25: 82,  p50: 88,  p75: 95 },
  driverSmash:        { p25: 1.36, p50: 1.43, p75: 1.47 },
  sevenIronCarry:     { p25: 125, p50: 135, p75: 148 },
  pitchingWedgeCarry: { p25: 95,  p50: 105, p75: 115 },
};

/** Per-club carry distance benchmarks for a 20-handicap.
 *  Used by the Vs Handicap tab on Performance to render a percentile
 *  band for every club the user actually hits.
 *  These are rough approximations — production would source from a
 *  proper distribution dataset. */
export const CARRY_BENCHMARKS_20: Partial<Record<ClubId, { p25: number; p50: number; p75: number }>> = {
  Dr:   { p25: 195, p50: 215, p75: 235 },
  '3W': { p25: 175, p50: 195, p75: 210 },
  '5W': { p25: 165, p50: 180, p75: 195 },
  '4i': { p25: 150, p50: 165, p75: 178 },
  '5i': { p25: 142, p50: 155, p75: 168 },
  '6i': { p25: 132, p50: 145, p75: 158 },
  '7i': { p25: 125, p50: 135, p75: 148 },
  '8i': { p25: 115, p50: 125, p75: 137 },
  '9i': { p25: 105, p50: 115, p75: 127 },
  PW:   { p25: 95,  p50: 105, p75: 115 },
  GW:   { p25: 80,  p50: 90,  p75: 100 },
  SW:   { p25: 70,  p50: 78,  p75: 88 },
  LW:   { p25: 50,  p50: 60,  p75: 70 },
};

/** Left / Centre / Right tendency per club.
 *  Each shot is bucketed by its `sideCarry` (yards off target line).
 *  The centre band scales with club avg carry — longer clubs naturally
 *  scatter more, so a relative tolerance reads fairer than a fixed yard
 *  threshold.
 */
export interface ClubAccuracy {
  club: ClubId;
  total: number;
  leftPct: number;
  centerPct: number;
  rightPct: number;
}

export function clubAccuracy(shots: Shot[]): ClubAccuracy[] {
  const byClub = new Map<ClubId, Shot[]>();
  for (const s of shots) {
    const arr = byClub.get(s.club) ?? [];
    arr.push(s);
    byClub.set(s.club, arr);
  }
  const out: ClubAccuracy[] = [];
  for (const club of CLUB_ORDER) {
    const arr = byClub.get(club);
    if (!arr || arr.length < 5) continue;
    const avgCarry = mean(arr.map((s) => s.carry));
    // Centre tolerance = 8% of avg carry. ~17 yds for driver, ~8 for PW.
    const tolerance = Math.max(6, avgCarry * 0.08);
    let left = 0, center = 0, right = 0;
    for (const s of arr) {
      if (s.sideCarry < -tolerance) left++;
      else if (s.sideCarry > tolerance) right++;
      else center++;
    }
    const total = arr.length;
    out.push({
      club,
      total,
      leftPct:   left   / total,
      centerPct: center / total,
      rightPct:  right  / total,
    });
  }
  return out;
}

/** One-line takeaway for the Accuracy tab — picks the club with the
 *  strongest miss tendency, or notes consistency if everything's tight. */
export function accuracySummary(data: ClubAccuracy[]): string | null {
  if (!data.length) return null;

  // Detect a consistent directional bias across the bag.
  const avgLeft  = mean(data.map((d) => d.leftPct));
  const avgRight = mean(data.map((d) => d.rightPct));
  if (avgRight > 0.32 && avgRight - avgLeft > 0.12) {
    return `You tend to miss right across the bag — looks like a slice tendency.`;
  }
  if (avgLeft > 0.32 && avgLeft - avgRight > 0.12) {
    return `You tend to miss left across the bag — looks like a hook or pull tendency.`;
  }

  // Otherwise, single-club worst-offender callout.
  const sorted = [...data].sort(
    (a, b) => Math.max(b.leftPct, b.rightPct) - Math.max(a.leftPct, a.rightPct),
  );
  const worst = sorted[0];
  if (worst.leftPct > 0.35) {
    return `Your ${worst.club} tends left — ${Math.round(worst.leftPct * 100)}% of shots.`;
  }
  if (worst.rightPct > 0.35) {
    return `Your ${worst.club} tends right — ${Math.round(worst.rightPct * 100)}% of shots.`;
  }
  return `You're holding the centre line well across the bag.`;
}

/** Strokes gained per club vs a 20-handicap benchmark.
 *
 *  Adapts Mark Broadie's framework to our data: we don't have shot-by-shot
 *  expected-strokes tables, so we approximate by comparing the user's
 *  per-club distance + spread against the handicap benchmark and converting
 *  the gap to a strokes-per-round estimate, weighted by how much that club
 *  impacts scoring.
 *
 *  Values are illustrative for the prototype — production would source from
 *  proper strokes-gained tables. */
export function clubStrokesGained(shots: Shot[]): Array<{ club: ClubId; value: number }> {
  const byClub = aggregateByClub(shots);
  const results: Array<{ club: ClubId; value: number }> = [];

  for (const c of byClub) {
    const benchmark = CARRY_BENCHMARKS_20[c.club];
    if (!benchmark || c.count < 5) continue;

    // Distance component — where user's avg sits between p25 and p75.
    const carryDelta = c.avgCarry - benchmark.p50;
    const carryRange = benchmark.p75 - benchmark.p25;
    const distanceFactor = carryDelta / (carryRange || 1); // -1..+1 typically

    // Accuracy component — tighter than typical CV = bonus.
    const expectedCv = 0.06;
    const userCv = c.carrySd / Math.max(c.avgCarry, 1);
    const accuracyFactor = (expectedCv - userCv) / expectedCv;

    // Scoring weight per club: driver and wedges matter most for amateurs.
    const weight =
      c.club === 'Dr' ? 1.5 :
      c.club === '3W' || c.club === '5W' ? 1.0 :
      c.club === 'PW' || c.club === 'GW' || c.club === 'SW' || c.club === 'LW' ? 0.8 :
      0.6; // mid/long irons

    const value = (distanceFactor * 1.2 + accuracyFactor * 0.8) * weight;
    results.push({ club: c.club, value: Math.round(value * 10) / 10 });
  }
  // Sort in bag order (longest → shortest) for the chart.
  return results.sort((a, b) => CLUB_ORDER.indexOf(a.club) - CLUB_ORDER.indexOf(b.club));
}

/** Top-of-Performance synthesis — one line that ties the whole page
 *  together before the user picks a tab. Composes from strokes gained:
 *  total + best/worst club callout. */
export function performanceSynthesis(shots: Shot[]): string | null {
  const data = clubStrokesGained(shots);
  if (!data.length) return null;

  const total = data.reduce((s, d) => s + d.value, 0);
  const sorted = [...data].sort((a, b) => b.value - a.value);
  const best = sorted[0];
  const worst = sorted[sorted.length - 1];

  let head: string;
  if (total > 2) {
    head = `You're gaining about ${total.toFixed(1)} strokes per round vs the typical 20-handicap.`;
  } else if (total < -2) {
    head = `You're leaking about ${Math.abs(total).toFixed(1)} strokes per round vs the typical 20-handicap.`;
  } else {
    head = `You're roughly even with the typical 20-handicap overall.`;
  }

  let tail = '';
  if (worst.value < -1) {
    tail = ` Your ${worst.club} is the biggest leak — worth focused work.`;
  } else if (best.value > 1) {
    tail = ` Your ${best.club} is your biggest weapon.`;
  }

  return head + tail;
}

/** Club-focused takeaway for strokes-gained — the total lives in the
 *  big headline number, so this line surfaces the single club worth
 *  acting on instead of restating the total. */
export function strokesGainedSummary(
  data: Array<{ club: ClubId; value: number }>,
): string | null {
  if (!data.length) return null;
  const sorted = [...data].sort((a, b) => b.value - a.value);
  const best = sorted[0];
  const worst = sorted[sorted.length - 1];

  if (worst.value < -1) {
    return `Your ${worst.club} is leaking the most strokes — worth focused practice.`;
  }
  if (best.value > 1) {
    return `Your ${best.club} is your biggest weapon, contributing ${best.value.toFixed(1)} strokes per round.`;
  }
  if (best.value > 0.4 && worst.value > -0.4) {
    return `Your bag is well-balanced — no obvious weak link.`;
  }
  return null;
}

/** Per-club carry percentile snapshots — one row per club the user
 *  has hit enough shots with AND that has a benchmark defined. */
export function perClubCarryPercentiles(shots: Shot[]): Array<PercentileSnapshot & { club: ClubId }> {
  const byClub = new Map<ClubId, Shot[]>();
  for (const s of shots) {
    const arr = byClub.get(s.club) ?? [];
    arr.push(s);
    byClub.set(s.club, arr);
  }
  const out: Array<PercentileSnapshot & { club: ClubId }> = [];
  for (const club of CLUB_ORDER) {
    const benchmark = CARRY_BENCHMARKS_20[club];
    if (!benchmark) continue;
    const clubShots = byClub.get(club);
    if (!clubShots || clubShots.length < 5) continue;
    const carry = mean(clubShots.map((s) => s.carry));
    const p = percentile(carry, benchmark.p25, benchmark.p50, benchmark.p75);
    const band: PercentileSnapshot['band'] =
      p >= 75 ? 'top' : p >= 50 ? 'above' : p >= 25 ? 'average' : 'below';
    out.push({
      club,
      metric: `${club} carry`,
      unit: 'yds',
      value: carry,
      percentile: p,
      band,
    });
  }
  return out;
}

export function percentile(value: number, p25: number, p50: number, p75: number) {
  // Piecewise linear estimate.
  if (value <= p25) return Math.max(5, (value / p25) * 25);
  if (value <= p50) return 25 + ((value - p25) / (p50 - p25)) * 25;
  if (value <= p75) return 50 + ((value - p50) / (p75 - p50)) * 25;
  return Math.min(99, 75 + ((value - p75) / p75) * 25);
}

/** Synthesise a one-line read of where the golfer sits across the
 *  percentile snapshots. Used as the "Where you stand" headline. */
export function synthesisePercentiles(snapshots: PercentileSnapshot[]): string | null {
  if (!snapshots.length) return null;
  const bands = snapshots.map((s) => s.band);
  const total = bands.length;
  const top    = bands.filter((b) => b === 'top').length;
  const above  = bands.filter((b) => b === 'above').length;
  const below  = bands.filter((b) => b === 'below').length;

  if (top === total) {
    return "You're in elite territory for your handicap.";
  }
  if (top + above === total) {
    return "You're above the typical 20-handicap on every metric.";
  }
  if (below === total) {
    return 'Plenty of room to grow — every metric below the typical 20-handicap.';
  }

  // Mixed picture — surface the best/worst extremes.
  const sorted = [...snapshots].sort((a, b) => b.percentile - a.percentile);
  const best = sorted[0];
  const worst = sorted[sorted.length - 1];
  if (best.percentile - worst.percentile < 15) {
    return 'Solid across the board for your handicap.';
  }
  return `Strong on ${best.metric.toLowerCase()}, with room to grow on ${worst.metric.toLowerCase()}.`;
}

/* ────────────────────────────────────────────────────────────────────
   Plain-English rating bands — these are what the UI shows.
   Raw std-dev / variance numbers stay in this file; the UI never
   surfaces "±SD" or "2σ" directly to the golfer.
   ──────────────────────────────────────────────────────────────────── */

export type Rating = {
  label: string;
  tone: 'positive' | 'neutral' | 'warn' | 'caution';
  /** 0-1, where on the band the value sits (for progress bars). */
  band: number;
};

/** Strike consistency from smash-factor std-dev. */
export function rateStrike(smashSd: number): Rating {
  if (smashSd < 0.04) return { label: 'Solid contact',    tone: 'positive', band: 1 - smashSd / 0.04 };
  if (smashSd < 0.07) return { label: 'Variable contact', tone: 'neutral',  band: 1 - (smashSd - 0.04) / 0.03 };
  return                       { label: 'Inconsistent',   tone: 'warn',     band: Math.max(0, 1 - (smashSd - 0.07) / 0.05) };
}

/** Left/right spread from side-carry std-dev (yds). */
export function rateSpread(sideCarrySd: number): Rating {
  if (sideCarrySd < 6)  return { label: 'Tight spread',    tone: 'positive', band: 1 - sideCarrySd / 6 };
  if (sideCarrySd < 12) return { label: 'Steady spread',   tone: 'neutral',  band: 1 - (sideCarrySd - 6) / 6 };
  if (sideCarrySd < 20) return { label: 'Wide spread',     tone: 'warn',     band: 1 - (sideCarrySd - 12) / 8 };
  return                        { label: 'Scattered',      tone: 'caution',  band: Math.max(0, 1 - (sideCarrySd - 20) / 10) };
}

/** Overall session consistency score (0-100). */
export function rateConsistency(score: number): Rating {
  if (score >= 85) return { label: 'Dialled in',    tone: 'positive', band: 1 };
  if (score >= 70) return { label: 'Solid',         tone: 'positive', band: (score - 70) / 15 };
  if (score >= 50) return { label: 'Decent',        tone: 'neutral',  band: (score - 50) / 20 };
  return                  { label: 'Inconsistent',  tone: 'warn',     band: Math.max(0, score / 50) };
}

/** Distance consistency from carry std-dev relative to avg carry. */
export function rateDistanceConsistency(carrySd: number, avgCarry: number): Rating {
  const cv = carrySd / Math.max(avgCarry, 1);  // coefficient of variation
  if (cv < 0.04) return { label: 'Steady distance', tone: 'positive', band: 1 - cv / 0.04 };
  if (cv < 0.07) return { label: 'Decent distance', tone: 'neutral',  band: 1 - (cv - 0.04) / 0.03 };
  return                 { label: 'Wide range',      tone: 'warn',     band: Math.max(0, 1 - (cv - 0.07) / 0.05) };
}

/* ────────────────────────────────────────────────────────────────────
   HOME / DASHBOARD HELPERS
   ──────────────────────────────────────────────────────────────────── */

export interface LifetimeInsights {
  shotCount: number;
  sessionCount: number;
  hoursPracticed: number;
  longestShot: Shot;
  fastestBall: Shot;
  fastestClub: Shot;
  avgSmash: number;
  byClub: ClubAggregate[];
}

export function lifetimeInsights(shots: Shot[], sessions: Session[]): LifetimeInsights | null {
  if (!shots.length) return null;
  // Hours practiced = sum across sessions of (shotCount / 30) — ~30 shots/hour rule of thumb.
  const hoursPracticed =
    sessions.reduce((total, s) => total + s.shots.length / 30, 0);
  return {
    shotCount: shots.length,
    sessionCount: sessions.length,
    hoursPracticed,
    longestShot: shots.reduce((b, s) => (s.total > b.total ? s : b)),
    fastestBall: shots.reduce((b, s) => (s.ballSpeed > b.ballSpeed ? s : b)),
    fastestClub: shots.reduce((b, s) => (s.clubSpeed > b.clubSpeed ? s : b)),
    avgSmash: mean(shots.map((s) => s.smash)),
    byClub: aggregateByClub(shots),
  };
}

/** Sliding-window comparison: last N days vs the N before that.
 *  Returns avg of the given metric for each window, plus an absolute delta. */
export function compareWindows(
  shots: Shot[],
  metric: keyof Pick<Shot, 'carry' | 'ballSpeed' | 'clubSpeed' | 'smash'>,
  windowDays = 30,
) {
  const now = Date.now();
  const cutCurrent = now - windowDays * 86_400_000;
  const cutPrior   = now - windowDays * 2 * 86_400_000;
  const current: number[] = [];
  const prior: number[] = [];
  for (const s of shots) {
    const t = new Date(s.timestamp).getTime();
    if (t >= cutCurrent) current.push(s[metric] as number);
    else if (t >= cutPrior) prior.push(s[metric] as number);
  }
  const currentAvg = current.length ? mean(current) : null;
  const priorAvg = prior.length ? mean(prior) : null;
  const delta =
    currentAvg !== null && priorAvg !== null ? currentAvg - priorAvg : null;
  return { currentAvg, priorAvg, delta, currentCount: current.length, priorCount: prior.length };
}

/** Pick the single most compelling insight to feature as a Home hero.
 *  Ordering of considerations:
 *  1. Strike (smash) trend, if meaningfully different.
 *  2. Carry trend on driver, if meaningfully different.
 *  3. Most reliable club lifetime.
 *  Returns null if there's not enough data. */
export interface HeroInsight {
  kind: 'smash-up' | 'smash-down' | 'carry-up' | 'carry-down' | 'best-club';
  tone: 'positive' | 'warn' | 'neutral';
  eyebrow: string;
  headline: string;
  detail: string;
  metric: keyof Pick<Shot, 'carry' | 'ballSpeed' | 'clubSpeed' | 'smash'>;
  club?: ClubId;
}

export function pickHeroInsight(shots: Shot[]): HeroInsight | null {
  if (shots.length < 20) return null;

  // 1. Smash trend
  const smash = compareWindows(shots, 'smash', 30);
  if (smash.delta !== null && Math.abs(smash.delta) >= 0.02) {
    const up = smash.delta > 0;
    return {
      kind: up ? 'smash-up' : 'smash-down',
      tone: up ? 'positive' : 'warn',
      eyebrow: 'Last 30 days · Strike quality',
      headline: up
        ? 'You\'re striking the ball cleaner.'
        : 'Strike quality has slipped a little.',
      detail: up
        ? `Smash factor up ${smash.delta.toFixed(2)} on average — more energy reaching the ball each swing.`
        : `Smash factor down ${Math.abs(smash.delta).toFixed(2)}. Worth a check on setup and contact next session.`,
      metric: 'smash',
    };
  }

  // 2. Carry trend, isolated to driver
  const driver = shots.filter((s) => s.club === 'Dr');
  const driverCarry = compareWindows(driver, 'carry', 30);
  if (driverCarry.delta !== null && Math.abs(driverCarry.delta) >= 4) {
    const up = driverCarry.delta > 0;
    return {
      kind: up ? 'carry-up' : 'carry-down',
      tone: up ? 'positive' : 'warn',
      eyebrow: 'Last 30 days · Driver',
      headline: up
        ? 'Picking up driver distance.'
        : 'Driver distance is dropping.',
      detail: up
        ? `Carry up about ${Math.round(driverCarry.delta)} yds on average — keep doing whatever you changed.`
        : `Carry down about ${Math.round(Math.abs(driverCarry.delta))} yds on average. Could be contact, could be effort. Take a look.`,
      metric: 'carry',
      club: 'Dr',
    };
  }

  // 3. Best club lifetime
  const byClub = aggregateByClub(shots);
  if (byClub.length) {
    const best = [...byClub].sort(
      (a, b) => a.carrySd / a.avgCarry - b.carrySd / b.avgCarry,
    )[0];
    if (best && best.count >= 10) {
      const range = Math.round(best.carrySd * 2);
      return {
        kind: 'best-club',
        tone: 'positive',
        eyebrow: 'Lifetime',
        headline: `Your ${best.club} is the most reliable club in the bag.`,
        detail: `Across ${best.count} shots, most carries land within ±${range} yds — your tightest dispersion.`,
        metric: 'carry',
        club: best.club,
      };
    }
  }

  return null;
}

/** Per-club lifetime summary, plus the gap to the next-shorter club. */
export interface BagSlot {
  club: ClubId;
  count: number;
  avgCarry: number;
  minCarry: number;
  maxCarry: number;
  carrySd: number;
  /** Yds gap to the next-shorter club's avg carry. */
  gapToNext: number | null;
  /** Flag if this gap is unusual (much bigger than typical 10-12 yds). */
  gapFlag: 'tight' | 'normal' | 'wide' | null;
}

export function bagSummary(shots: Shot[]): BagSlot[] {
  const byClub = aggregateByClub(shots);

  // Min/max carry per club, computed from raw shots.
  const range = new Map<ClubId, { min: number; max: number }>();
  for (const s of shots) {
    const cur = range.get(s.club);
    if (cur) {
      cur.min = Math.min(cur.min, s.carry);
      cur.max = Math.max(cur.max, s.carry);
    } else {
      range.set(s.club, { min: s.carry, max: s.carry });
    }
  }

  const sorted = [...byClub].sort((a, b) => b.avgCarry - a.avgCarry);
  return sorted.map((c, i) => {
    const next = sorted[i + 1];
    const gap = next ? c.avgCarry - next.avgCarry : null;
    let gapFlag: BagSlot['gapFlag'] = null;
    if (gap !== null) {
      if (gap < 6) gapFlag = 'tight';
      else if (gap > 20) gapFlag = 'wide';
      else gapFlag = 'normal';
    }
    const r = range.get(c.club);
    return {
      club: c.club,
      count: c.count,
      avgCarry: c.avgCarry,
      minCarry: r?.min ?? c.avgCarry,
      maxCarry: r?.max ?? c.avgCarry,
      carrySd: c.carrySd,
      gapToNext: gap,
      gapFlag,
    };
  });
}

/** Pick the single most actionable bag insight to surface on Home.
 *  Prioritises: most variable club (worth focused practice), then a
 *  reliable-club celebration when the bag is mostly tight. */
export type BagTone = 'warn' | 'positive' | 'neutral';

/** Tone → hex colour for the insight-highlighted bag bar.
 *  Lives in this server-safe module so both `app/page.tsx` (server) and
 *  `BagGappingChart` (client) can index into it. */
export const BAG_TONE_HEX: Record<BagTone, string> = {
  warn:     '#F59E0B',
  positive: '#1BE377',
  neutral:  '#737373',
};

export interface BagInsight {
  club: ClubId;
  headline: string;
  detail: string;
  tone: BagTone;
}

export function pickBagInsight(bag: BagSlot[]): BagInsight | null {
  const eligible = bag.filter((s) => s.count >= 10);
  if (!eligible.length) return null;

  const byVariability = [...eligible].sort(
    (a, b) => b.carrySd / b.avgCarry - a.carrySd / a.avgCarry,
  );
  const widest = byVariability[0];

  // If even the widest club is tight, celebrate the tightest instead.
  if (widest.carrySd / widest.avgCarry < 0.08) {
    const tightest = byVariability[byVariability.length - 1];
    const range = Math.round(tightest.carrySd * 2);
    return {
      club: tightest.club,
      headline: `Your ${tightest.club} has been your most reliable club lately.`,
      detail: `${tightest.count} shots, almost all landing within ±${range} yds.`,
      tone: 'positive',
    };
  }

  return {
    club: widest.club,
    headline: `Your ${widest.club} has had the widest spread lately.`,
    detail: `${widest.count} shots ranging ${widest.minCarry.toFixed(0)}–${widest.maxCarry.toFixed(0)} yds. Worth a focused block.`,
    tone: 'warn',
  };
}

/* ────────────────────────────────────────────────────────────────────
   DEVICE / VENUE ATTRIBUTION
   R-Cloud is a data lens — these helpers surface lifetime stats for
   the kit you own and the places you've played, not management chrome.
   ──────────────────────────────────────────────────────────────────── */

export interface SourceSummary {
  /** Total shots captured through this source. */
  shotCount: number;
  /** Sessions count. */
  sessionCount: number;
  /** Earliest and latest shot dates as ISO strings. */
  firstShot: string;
  lastShot: string;
  /** The club hit most through this source. */
  topClub: { club: ClubId; count: number };
  /** Best shot through this source — longest total distance. */
  bestShot: Shot;
  /** Avg smash factor through this source. */
  avgSmash: number;
}

function summarise(shots: Shot[], sessions: Session[]): SourceSummary | null {
  if (!shots.length) return null;
  const times = shots.map((s) => +new Date(s.timestamp));
  const counts = new Map<ClubId, number>();
  for (const s of shots) counts.set(s.club, (counts.get(s.club) ?? 0) + 1);
  let topClub: { club: ClubId; count: number } = { club: shots[0].club, count: 0 };
  for (const [club, count] of counts) {
    if (count > topClub.count) topClub = { club, count };
  }
  return {
    shotCount: shots.length,
    sessionCount: sessions.length,
    firstShot: new Date(Math.min(...times)).toISOString(),
    lastShot: new Date(Math.max(...times)).toISOString(),
    topClub,
    bestShot: shots.reduce((b, s) => (s.total > b.total ? s : b)),
    avgSmash: mean(shots.map((s) => s.smash)),
  };
}

export interface DeviceRow {
  device: 'MLM2PRO' | 'MLM';
  summary: SourceSummary;
}

export function deviceSummaries(sessions: Session[]): DeviceRow[] {
  const buckets = new Map<'MLM2PRO' | 'MLM', { shots: Shot[]; sessions: Session[] }>();
  for (const s of sessions) {
    // A session can technically mix devices; attribute it to the dominant one.
    const counts: Record<string, number> = {};
    for (const sh of s.shots) counts[sh.device] = (counts[sh.device] ?? 0) + 1;
    const dominant = (Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ??
      'MLM2PRO') as 'MLM2PRO' | 'MLM';
    const bucket = buckets.get(dominant) ?? { shots: [], sessions: [] };
    bucket.shots.push(...s.shots);
    bucket.sessions.push(s);
    buckets.set(dominant, bucket);
  }
  const rows: DeviceRow[] = [];
  for (const [device, b] of buckets) {
    const summary = summarise(b.shots, b.sessions);
    if (summary) rows.push({ device, summary });
  }
  // Newest activity first.
  return rows.sort((a, b) => +new Date(b.summary.lastShot) - +new Date(a.summary.lastShot));
}

export interface VenueRow {
  name: string;
  type: VenueType;
  city: string;
  summary: SourceSummary;
}

interface VenueBucket {
  name: string;
  type: VenueRow['type'];
  city: string;
  shots: Shot[];
  sessions: Session[];
}

export function venueSummaries(sessions: Session[]): VenueRow[] {
  const buckets = new Map<string, VenueBucket>();
  for (const s of sessions) {
    if (!s.venue) continue;
    const key = s.venue.name;
    const bucket =
      buckets.get(key) ?? { ...s.venue, shots: [], sessions: [] };
    bucket.shots.push(...s.shots);
    bucket.sessions.push(s);
    buckets.set(key, bucket);
  }
  const rows: VenueRow[] = [];
  for (const [, b] of buckets) {
    const summary = summarise(b.shots, b.sessions);
    if (summary) {
      rows.push({ name: b.name, type: b.type, city: b.city, summary });
    }
  }
  return rows.sort((a, b) => +new Date(b.summary.lastShot) - +new Date(a.summary.lastShot));
}

/** Snapshot of how the golfer compares to 20-handicap reference distributions
 *  on a few headline metrics. Returns 0-100 percentile estimates. */
export interface PercentileSnapshot {
  metric: string;
  unit: string;
  value: number;
  percentile: number;  // 0-100
  band: 'top' | 'above' | 'average' | 'below';
}

export function handicapPercentiles(shots: Shot[]): PercentileSnapshot[] {
  const out: PercentileSnapshot[] = [];
  const driver = shots.filter((s) => s.club === 'Dr');
  const sevenI = shots.filter((s) => s.club === '7i');
  const pw     = shots.filter((s) => s.club === 'PW');

  function bandFor(p: number): PercentileSnapshot['band'] {
    return p >= 75 ? 'top' : p >= 50 ? 'above' : p >= 25 ? 'average' : 'below';
  }

  if (driver.length >= 5) {
    // Driver distance
    const carry = mean(driver.map((s) => s.carry));
    const bC = HANDICAP_BENCHMARKS_20.driverCarry;
    const pC = percentile(carry, bC.p25, bC.p50, bC.p75);
    out.push({ metric: 'Driver carry', unit: 'yds', value: carry, percentile: pC, band: bandFor(pC) });

    // Driver power / swing speed
    const clubSpeed = mean(driver.map((s) => s.clubSpeed));
    const bCS = HANDICAP_BENCHMARKS_20.driverClubSpeed;
    const pCS = percentile(clubSpeed, bCS.p25, bCS.p50, bCS.p75);
    out.push({ metric: 'Driver swing speed', unit: 'mph', value: clubSpeed, percentile: pCS, band: bandFor(pCS) });
  }

  if (sevenI.length >= 5) {
    // Mid-iron — the golfer's bread-and-butter club
    const carry = mean(sevenI.map((s) => s.carry));
    const b = HANDICAP_BENCHMARKS_20.sevenIronCarry;
    const p = percentile(carry, b.p25, b.p50, b.p75);
    out.push({ metric: '7-iron carry', unit: 'yds', value: carry, percentile: p, band: bandFor(p) });
  }

  if (pw.length >= 5) {
    // Short game — scoring distance
    const carry = mean(pw.map((s) => s.carry));
    const b = HANDICAP_BENCHMARKS_20.pitchingWedgeCarry;
    const p = percentile(carry, b.p25, b.p50, b.p75);
    out.push({ metric: 'Pitching wedge carry', unit: 'yds', value: carry, percentile: p, band: bandFor(p) });
  }

  return out;
}

/* ────────────────────────────────────────────────────────────────────
   SESSION SCORE + HIGHLIGHTS + IMPROVEMENT INSIGHTS
   Built on top of sessionInsights to power the Session Detail page.
   ──────────────────────────────────────────────────────────────────── */

export type ScoreBand = 'great' | 'solid' | 'decent' | 'off';

export interface SessionScore {
  /** 0-100 composite of consistency, strike quality, and spread. */
  value: number;
  band: ScoreBand;
  label: string;
}

/** Per-axis breakdown of a session's composite score — used by the
 *  Score hero popover to show *where* the points came from / leaked,
 *  not just the abstract formula. Each axis returns its 0-100 score,
 *  weight, and resulting contribution (weighted) in points. */
export interface SessionScoreBreakdown {
  axes: Array<{
    key: 'consistency' | 'strike' | 'spread';
    label: string;
    /** 0-100 score on this axis alone. */
    score: number;
    /** Weight applied to this axis (sums to 1.0 across axes). */
    weight: number;
    /** Weighted contribution to the total — score × weight. */
    contribution: number;
    /** Plain-English explanation of what this axis measures. */
    description: string;
  }>;
  outlierPenalty: number;
  outlierCount: number;
  /** Sum of contributions minus the outlier penalty, clamped to 0-100. */
  total: number;
}

export function sessionScoreBreakdown(insights: SessionInsights): SessionScoreBreakdown {
  const consistency = Math.max(0, Math.min(100, insights.consistencyScore));
  const strike = Math.max(0, Math.min(100, 100 - (insights.smashSd / 0.10) * 100));
  const spread = Math.max(0, Math.min(100, 100 - (insights.sideCarrySd / 25) * 100));
  const outlierPenalty = Math.min(10, insights.outlierCount * 2);
  const raw = consistency * 0.45 + strike * 0.30 + spread * 0.25;
  const total = Math.round(Math.max(0, Math.min(100, raw - outlierPenalty)));

  return {
    axes: [
      {
        key: 'consistency',
        label: 'Distance consistency',
        score: Math.round(consistency),
        weight: 0.45,
        contribution: consistency * 0.45,
        description: 'How tight your carry distances are per club',
      },
      {
        key: 'strike',
        label: 'Strike quality',
        score: Math.round(strike),
        weight: 0.30,
        contribution: strike * 0.30,
        description: 'How cleanly you caught the ball (smash factor)',
      },
      {
        key: 'spread',
        label: 'Spread',
        score: Math.round(spread),
        weight: 0.25,
        contribution: spread * 0.25,
        description: 'Tightness of your left/right miss',
      },
    ],
    outlierPenalty,
    outlierCount: insights.outlierCount,
    total,
  };
}

/** Single 0-100 score that ties the three rating axes together.
 *  Weights chosen so distance consistency dominates (it's what most
 *  golfers actually feel), with strike + spread as supporting axes. */
export function sessionScore(insights: SessionInsights): SessionScore {
  // Normalise each axis to 0-100.
  const consistency = Math.max(0, Math.min(100, insights.consistencyScore));
  // Strike: smashSd of 0 → 100, smashSd of 0.10 → 0.
  const strike = Math.max(0, Math.min(100, 100 - (insights.smashSd / 0.10) * 100));
  // Spread: sideCarrySd of 0 yds → 100, 25 yds → 0.
  const spread = Math.max(0, Math.min(100, 100 - (insights.sideCarrySd / 25) * 100));

  const raw = consistency * 0.45 + strike * 0.30 + spread * 0.25;
  // Outliers dock a few points each, capped at 10.
  const outlierPenalty = Math.min(10, insights.outlierCount * 2);
  const value = Math.round(Math.max(0, Math.min(100, raw - outlierPenalty)));

  let band: ScoreBand;
  let label: string;
  if (value >= 80)      { band = 'great';  label = 'Great session'; }
  else if (value >= 65) { band = 'solid';  label = 'Solid session'; }
  else if (value >= 50) { band = 'decent'; label = 'Decent session'; }
  else                  { band = 'off';    label = 'Off day'; }

  return { value, band, label };
}

/** Find the session immediately preceding `current` chronologically.
 *  `sessions` is expected newest-first (mockData.SESSIONS order). */
export function previousSession(
  currentId: string,
  sessions: Session[],
): Session | null {
  const idx = sessions.findIndex((s) => s.id === currentId);
  if (idx === -1 || idx === sessions.length - 1) return null;
  return sessions[idx + 1];
}

export interface SessionHighlight {
  kind: 'cleanest-strike' | 'longest-drive' | 'straightest' | 'fastest-ball';
  label: string;          // "Cleanest Strike"
  shot: Shot;
  /** Primary metric to feature on the card. */
  metricLabel: string;    // "1.49 smash"
  /** Secondary descriptor line. */
  sub: string;            // "Driver · 218 yds carry"
}

/** Up to four highlight cards across the session — the most striking
 *  individual shots, framed for celebration. Skips a highlight if no
 *  qualifying shot exists (eg no driver swings → no longest-drive). */
export function sessionHighlights(session: Session): SessionHighlight[] {
  const shots = session.shots;
  if (!shots.length) return [];
  const out: SessionHighlight[] = [];

  // Cleanest strike — highest smash factor across the session.
  const cleanest = shots.reduce((b, s) => (s.smash > b.smash ? s : b));
  out.push({
    kind: 'cleanest-strike',
    label: 'Cleanest Strike',
    shot: cleanest,
    metricLabel: `${cleanest.smash.toFixed(2)} smash`,
    sub: `${cleanest.club} · ${cleanest.carry.toFixed(0)} yds carry`,
  });

  // Longest drive vs longest shot — "Longest Drive" requires an actual
  // driver swing in the session. Without one, fall back to "Longest
  // Shot" against the full set so the highlight still surfaces.
  const driverShots = shots.filter((s) => s.club === 'Dr');
  const longShot = driverShots.length
    ? driverShots.reduce((b, s) => (s.total > b.total ? s : b))
    : shots.reduce((b, s) => (s.total > b.total ? s : b));
  out.push({
    kind: 'longest-drive',
    label: driverShots.length ? 'Longest Drive' : 'Longest Shot',
    shot: longShot,
    metricLabel: `${longShot.total.toFixed(0)} yds`,
    sub: `${longShot.club} · ${longShot.ballSpeed.toFixed(0)} mph ball`,
  });

  // Straightest shot — smallest absolute sideCarry, on a meaningful shot
  // (filter very short ones so tiny wedge taps don't always win).
  const straightCandidates = shots.filter((s) => s.carry >= 60);
  if (straightCandidates.length) {
    const straightest = straightCandidates.reduce((b, s) =>
      Math.abs(s.sideCarry) < Math.abs(b.sideCarry) ? s : b,
    );
    out.push({
      kind: 'straightest',
      label: 'Straightest Shot',
      shot: straightest,
      metricLabel: `${Math.abs(straightest.sideCarry).toFixed(1)} yds offline`,
      sub: `${straightest.club} · ${straightest.carry.toFixed(0)} yds carry`,
    });
  }

  // Fastest ball — peak ball speed.
  const fastest = shots.reduce((b, s) => (s.ballSpeed > b.ballSpeed ? s : b));
  out.push({
    kind: 'fastest-ball',
    label: 'Fastest Ball',
    shot: fastest,
    metricLabel: `${fastest.ballSpeed.toFixed(0)} mph`,
    sub: `${fastest.club} · ${fastest.clubSpeed.toFixed(0)} mph swing`,
  });

  return out;
}

export type ImprovementDirection = 'up' | 'down';

export interface ImprovementInsight {
  /** Stable id for keying / linking — composed of club + metric. */
  id: string;
  club: ClubId;
  metric: 'carry' | 'smash' | 'spread' | 'consistency';
  metricLabel: string;     // "Carry", "Strike quality", "Spread", "Distance consistency"
  /** Saw improvement vs prior baseline, or needs improvement. */
  trend: 'improved' | 'needs-work';
  /** One-line headline. */
  headline: string;
  /** Secondary supporting line — the numbers behind the call. */
  detail: string;
  /** How many shots this session, for context. */
  shotCount: number;
}

/** Per-metric, per-club comparison of this session vs the user's prior
 *  baseline on the same club. Returns improvement insights split into
 *  things that got better and things that need work, suitable for the
 *  "Saw improvement / Needs improvement" toggle. */
export function sessionImprovementInsights(
  session: Session,
  priorShots: Shot[],
): ImprovementInsight[] {
  const out: ImprovementInsight[] = [];
  const sessionByClub = aggregateByClub(session.shots);

  for (const c of sessionByClub) {
    if (c.count < 4) continue;
    const baseline = priorShots.filter((s) => s.club === c.club);
    if (baseline.length < 10) continue;

    const baseCarry = mean(baseline.map((s) => s.carry));
    const baseSmash = mean(baseline.map((s) => s.smash));
    const baseCarryCv = stdDev(baseline.map((s) => s.carry)) / Math.max(baseCarry, 1);
    const baseSideSd = stdDev(baseline.map((s) => s.sideCarry));

    const sessionCarryCv = c.carrySd / Math.max(c.avgCarry, 1);

    // Carry — higher better.
    const carryDelta = c.avgCarry - baseCarry;
    const carryRelDelta = carryDelta / baseCarry;
    if (Math.abs(carryRelDelta) >= 0.03) {
      const trend: 'improved' | 'needs-work' = carryDelta > 0 ? 'improved' : 'needs-work';
      const sign = carryDelta > 0 ? '+' : '';
      out.push({
        id: `${c.club}-carry`,
        club: c.club,
        metric: 'carry',
        metricLabel: 'Carry',
        trend,
        headline:
          trend === 'improved'
            ? `${c.club} carry stepped up`
            : `${c.club} carry fell short`,
        detail: `${c.avgCarry.toFixed(0)} yds today vs ${baseCarry.toFixed(0)} yds typical (${sign}${carryDelta.toFixed(0)} yds)`,
        shotCount: c.count,
      });
    }

    // Strike quality (smash factor) — higher better.
    const smashDelta = c.avgSmash - baseSmash;
    if (Math.abs(smashDelta) >= 0.02) {
      const trend: 'improved' | 'needs-work' = smashDelta > 0 ? 'improved' : 'needs-work';
      const sign = smashDelta > 0 ? '+' : '';
      out.push({
        id: `${c.club}-smash`,
        club: c.club,
        metric: 'smash',
        metricLabel: 'Strike quality',
        trend,
        headline:
          trend === 'improved'
            ? `Cleaner contact on ${c.club}`
            : `Contact drifted off centre on ${c.club}`,
        detail: `${c.avgSmash.toFixed(2)} smash today vs ${baseSmash.toFixed(2)} typical (${sign}${smashDelta.toFixed(2)})`,
        shotCount: c.count,
      });
    }

    // Spread (side carry SD) — lower better. Compare in yards.
    const spreadDelta = c.sideCarrySd - baseSideSd;
    if (Math.abs(spreadDelta) >= 2) {
      const trend: 'improved' | 'needs-work' = spreadDelta < 0 ? 'improved' : 'needs-work';
      out.push({
        id: `${c.club}-spread`,
        club: c.club,
        metric: 'spread',
        metricLabel: 'Spread',
        trend,
        headline:
          trend === 'improved'
            ? `Tighter spread on ${c.club}`
            : `Wider spread on ${c.club}`,
        detail: `±${c.sideCarrySd.toFixed(0)} yds today vs ±${baseSideSd.toFixed(0)} yds typical`,
        shotCount: c.count,
      });
    }

    // Distance consistency — lower CV better.
    const cvDelta = sessionCarryCv - baseCarryCv;
    if (Math.abs(cvDelta) >= 0.015) {
      const trend: 'improved' | 'needs-work' = cvDelta < 0 ? 'improved' : 'needs-work';
      const sessionRange = Math.round(c.carrySd * 2);
      const baseRange = Math.round(stdDev(baseline.map((s) => s.carry)) * 2);
      out.push({
        id: `${c.club}-consistency`,
        club: c.club,
        metric: 'consistency',
        metricLabel: 'Distance consistency',
        trend,
        headline:
          trend === 'improved'
            ? `Tighter distance on ${c.club}`
            : `Distance got more variable on ${c.club}`,
        detail: `±${sessionRange} yds today vs ±${baseRange} yds typical`,
        shotCount: c.count,
      });
    }
  }

  // Sort each group by shot count (more swings = more confident) descending.
  return out.sort((a, b) => b.shotCount - a.shotCount);
}

/* ────────────────────────────────────────────────────────────────────
   TARGET-BASED MODES — Target Range, Combine, Closest to Pin
   These sessions had an *intent* (hit a number / a pin), so the drilldown
   measures result-against-intent: proximity to the target landing point,
   not dispersion around a centroid.
   ──────────────────────────────────────────────────────────────────── */

/** 2-D distance (yds) from where a shot landed to its intended target —
 *  combining how short/long the carry was with how far offline it finished.
 *  Returns null for shots that weren't aimed at a target. */
export function shotProximity(shot: Shot): number | null {
  if (shot.targetCarry == null) return null;
  const long = shot.carry - shot.targetCarry; // + long, − short (yds)
  return Math.sqrt(long * long + shot.sideCarry * shot.sideCarry);
}

/** A shot counts as "on target" within 8% of the target distance (min 6 yds). */
function proximityTolerance(target: number): number {
  return Math.max(6, target * 0.08);
}

function modalClub(shots: Shot[]): ClubId {
  const counts = new Map<ClubId, number>();
  for (const s of shots) counts.set(s.club, (counts.get(s.club) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
}

/** Group a session's target-based shots by their station (target distance). */
function groupByStation(shots: Shot[]): Map<number, Shot[]> {
  const byTarget = new Map<number, Shot[]>();
  for (const s of shots) {
    if (s.targetCarry == null) continue;
    const arr = byTarget.get(s.targetCarry) ?? [];
    arr.push(s);
    byTarget.set(s.targetCarry, arr);
  }
  return byTarget;
}

export interface TargetStation {
  target: number;        // yds
  club: ClubId;
  shots: number;
  avgCarry: number;
  carryDelta: number;    // avgCarry − target (+ long / − short)
  lateralBias: number;   // avg sideCarry (+ right / − left)
  avgProximity: number;  // yds from target landing point
  hitRate: number;       // 0-1 within tolerance
}

export interface TargetRangeResult {
  shotCount: number;
  avgProximity: number;  // yds
  hitRate: number;       // 0-1 overall within tolerance
  carryBias: number;     // overall avg carry delta (+ tends long / − short)
  lateralBias: number;   // overall avg side (+ right / − left)
  best: { shot: Shot; proximity: number };
  stations: TargetStation[];
}

/** Distance-control read for a Target Range session. Null if no targeted shots. */
export function targetRangeResult(session: Session): TargetRangeResult | null {
  const targeted = session.shots.filter((s) => s.targetCarry != null);
  if (!targeted.length) return null;

  const byTarget = groupByStation(targeted);
  const stations: TargetStation[] = [];
  for (const [target, arr] of byTarget) {
    const proximities = arr.map((s) => shotProximity(s) ?? 0);
    const tol = proximityTolerance(target);
    stations.push({
      target,
      club: modalClub(arr),
      shots: arr.length,
      avgCarry: mean(arr.map((s) => s.carry)),
      carryDelta: mean(arr.map((s) => s.carry - target)),
      lateralBias: mean(arr.map((s) => s.sideCarry)),
      avgProximity: mean(proximities),
      hitRate: proximities.filter((p) => p <= tol).length / arr.length,
    });
  }
  stations.sort((a, b) => b.target - a.target);

  const allProx = targeted.map((s) => ({ shot: s, proximity: shotProximity(s) ?? Infinity }));
  const best = allProx.reduce((b, p) => (p.proximity < b.proximity ? p : b));
  const onTarget = targeted.filter(
    (s) => (shotProximity(s) ?? Infinity) <= proximityTolerance(s.targetCarry!),
  ).length;

  return {
    shotCount: targeted.length,
    avgProximity: mean(allProx.map((p) => p.proximity)),
    hitRate: onTarget / targeted.length,
    carryBias: mean(targeted.map((s) => s.carry - s.targetCarry!)),
    lateralBias: mean(targeted.map((s) => s.sideCarry)),
    best,
    stations,
  };
}

/** 0-100 score for a single Combine shot — how close it finished to the
 *  station target, scaled relative to the target distance. */
export function combineShotScore(shot: Shot): number {
  const prox = shotProximity(shot);
  if (prox == null || !shot.targetCarry) return 0;
  const ratio = prox / shot.targetCarry;
  return Math.max(0, Math.min(100, Math.round(100 - ratio * 100 * 3.2)));
}

export interface CombineStation {
  target: number;
  club: ClubId;
  shots: number;
  avgProximity: number;  // yds
  score: number;         // 0-100
  best: { shot: Shot; proximity: number };
}

export type CombineBand = 'elite' | 'sharp' | 'solid' | 'building';

export interface CombineResult {
  score: number;         // 0-100 overall
  band: CombineBand;
  label: string;
  shotCount: number;
  stations: CombineStation[];
  bestStation: CombineStation;
  worstStation: CombineStation;
}

/** Scorecard read for a Combine session. Null if no station data. */
export function combineResult(session: Session): CombineResult | null {
  const targeted = session.shots.filter((s) => s.targetCarry != null);
  if (!targeted.length) return null;

  const byTarget = groupByStation(targeted);
  const stations: CombineStation[] = [];
  for (const [target, arr] of byTarget) {
    const withProx = arr.map((s) => ({ shot: s, proximity: shotProximity(s) ?? Infinity }));
    const best = withProx.reduce((b, p) => (p.proximity < b.proximity ? p : b));
    stations.push({
      target,
      club: modalClub(arr),
      shots: arr.length,
      avgProximity: mean(arr.map((s) => shotProximity(s) ?? 0)),
      score: Math.round(mean(arr.map(combineShotScore))),
      best,
    });
  }
  stations.sort((a, b) => b.target - a.target);

  const score = Math.round(mean(targeted.map(combineShotScore)));
  const byScore = [...stations].sort((a, b) => b.score - a.score);

  let band: CombineBand;
  let label: string;
  if (score >= 80)      { band = 'elite';    label = 'Elite test'; }
  else if (score >= 65) { band = 'sharp';    label = 'Sharp test'; }
  else if (score >= 50) { band = 'solid';    label = 'Solid test'; }
  else                  { band = 'building'; label = 'Building'; }

  return {
    score,
    band,
    label,
    shotCount: targeted.length,
    stations,
    bestStation: byScore[0],
    worstStation: byScore[byScore.length - 1],
  };
}

/** Closest-to-pin leaderboard — shots ranked by proximity (in feet). */
export interface PinShot {
  shot: Shot;
  proximityFt: number;
}

export interface ClosestToPinResult {
  shotCount: number;
  closest: PinShot;
  avgProximityFt: number;
  /** Make-rate inside reference circles. */
  inside3: number;
  inside10: number;
  inside20: number;
  /** All shots ranked closest-first. */
  ranked: PinShot[];
}

/** Closest-to-pin read. Proximity is reported in feet (3 ft = 1 yd). */
export function closestToPinResult(session: Session): ClosestToPinResult | null {
  const targeted = session.shots.filter((s) => s.targetCarry != null);
  if (!targeted.length) return null;

  const ranked: PinShot[] = targeted
    .map((s) => ({ shot: s, proximityFt: (shotProximity(s) ?? Infinity) * 3 }))
    .sort((a, b) => a.proximityFt - b.proximityFt);

  const fts = ranked.map((p) => p.proximityFt);
  return {
    shotCount: targeted.length,
    closest: ranked[0],
    avgProximityFt: mean(fts),
    inside3: fts.filter((f) => f <= 3).length,
    inside10: fts.filter((f) => f <= 10).length,
    inside20: fts.filter((f) => f <= 20).length,
    ranked,
  };
}

/* ────────────────────────────────────────────────────────────────────
   ON-COURSE — virtual 9/18-hole round
   The drilldown is a scorecard, not a metrics dump: score vs par,
   GIR / fairways, putting, and the scoring shape.
   ──────────────────────────────────────────────────────────────────── */

export interface NineSummary {
  par: number;
  strokes: number;
}

export interface CourseScorecard {
  par: number;
  strokes: number;
  toPar: number;          // strokes − par (+ over / − under)
  holesPlayed: 9 | 18;
  girCount: number;
  girPct: number;         // 0-1
  fairwayHits: number;
  fairwayEligible: number;
  fairwayPct: number;     // 0-1
  putts: number;
  puttsPerHole: number;
  scoring: {
    eagles: number; birdies: number; pars: number;
    bogeys: number; doubles: number; others: number;
  };
  front: NineSummary;
  back: NineSummary | null;
  holes: HoleResult[];
}

/** Build the scorecard read for a Course round. Null without hole data. */
export function courseScorecard(session: Session): CourseScorecard | null {
  const course = session.course;
  if (!course?.holes?.length) return null;
  const holes = course.holes;

  const girCount = holes.filter((h) => h.gir).length;
  const fairwayEligible = holes.filter((h) => h.fairwayHit !== null).length;
  const fairwayHits = holes.filter((h) => h.fairwayHit === true).length;
  const putts = holes.reduce((a, h) => a + h.putts, 0);

  const scoring = { eagles: 0, birdies: 0, pars: 0, bogeys: 0, doubles: 0, others: 0 };
  for (const h of holes) {
    const d = h.strokes - h.par;
    if (d <= -2) scoring.eagles++;
    else if (d === -1) scoring.birdies++;
    else if (d === 0) scoring.pars++;
    else if (d === 1) scoring.bogeys++;
    else if (d === 2) scoring.doubles++;
    else scoring.others++;
  }

  const frontHoles = holes.slice(0, 9);
  const backHoles = holes.slice(9);
  const nine = (hs: HoleResult[]): NineSummary => ({
    par: hs.reduce((a, h) => a + h.par, 0),
    strokes: hs.reduce((a, h) => a + h.strokes, 0),
  });

  return {
    par: course.par,
    strokes: course.strokes,
    toPar: course.strokes - course.par,
    holesPlayed: course.holesPlayed,
    girCount,
    girPct: girCount / holes.length,
    fairwayHits,
    fairwayEligible,
    fairwayPct: fairwayEligible ? fairwayHits / fairwayEligible : 0,
    putts,
    puttsPerHole: putts / holes.length,
    scoring,
    front: nine(frontHoles),
    back: backHoles.length ? nine(backHoles) : null,
    holes,
  };
}

/** Find the previous session of a given mode (for combine-vs-combine deltas).
 *  `sessions` expected newest-first. */
export function previousSessionOfMode(
  currentId: string,
  sessions: Session[],
): Session | null {
  const idx = sessions.findIndex((s) => s.id === currentId);
  if (idx === -1) return null;
  const mode = sessions[idx].mode;
  for (let i = idx + 1; i < sessions.length; i++) {
    if (sessions[i].mode === mode) return sessions[i];
  }
  return null;
}
