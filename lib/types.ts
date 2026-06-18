export type ClubId =
  | 'Dr' | '3W' | '5W'
  | '4i' | '5i' | '6i' | '7i' | '8i' | '9i'
  | 'PW' | 'GW' | 'SW' | 'LW';

export type ClubCategory = 'driver' | 'wood' | 'iron' | 'wedge';

export interface Club {
  id: ClubId;
  label: string;
  category: ClubCategory;
  color: string;
}

export type Device = 'MLM2PRO' | 'MLM';
export type BallType = 'Range Ball' | 'Callaway Chrome Soft X' | 'Pro V1' | 'TaylorMade TP5';
export type SessionMode = 'Practice' | 'Range' | 'Target Range' | 'Combine' | 'Closest to Pin' | 'Course';
export type Environment = 'Indoor' | 'Outdoor';

/** Per-hole result on a (virtual) course round. */
export interface HoleResult {
  /** 1-based hole number. */
  hole: number;
  par: 3 | 4 | 5;
  /** Hole length in yards. */
  yards: number;
  /** Strokes taken on the hole (includes putts). */
  strokes: number;
  /** Tee shot found the fairway. Null on par 3s (no fairway to hit). */
  fairwayHit: boolean | null;
  /** Green in regulation — reached the green with ≥2 putts for par left. */
  gir: boolean;
  /** Putts taken on the hole. */
  putts: number;
}

/** Course-round metadata, populated only when SessionMode === 'Course'.
 *  In this prototype a "course" round is a virtual 9 or 18 holes played
 *  on the simulator, not GPS-tracked on-course play. */
export interface CourseInfo {
  /** Course name (typically matches the session's venue). */
  name: string;
  /** Course par for the round (e.g. 72 for full 18, 36 for front-9). */
  par: number;
  /** Golfer's total strokes for the round. */
  strokes: number;
  /** Holes played — typically 9 or 18. */
  holesPlayed: 9 | 18;
  /** Hole-by-hole scorecard. */
  holes?: HoleResult[];
}

export interface Shot {
  id: string;
  sessionId: string;
  timestamp: string;        // ISO
  club: ClubId;
  carry: number;            // yds
  total: number;            // yds
  ballSpeed: number;        // mph
  clubSpeed: number;        // mph
  smash: number;            // ratio
  launchAngle: number;      // deg
  launchDirection: number;  // deg (+ right, − left)
  spinRate: number;         // rpm
  spinAxis: number;         // deg (+ slice, − draw)
  descentAngle: number;     // deg
  apex: number;             // ft
  sideCarry: number;        // yds (+ right, − left)
  attackAngle: number;      // deg
  clubPath: number;         // deg
  device: Device;
  hasVideo: boolean;
  isOutlier?: boolean;
  /** Intended carry target (yds) for target-based modes — the station
   *  distance in a Combine, the chosen target in Target Range, or the
   *  pin distance in Closest to Pin. Absent for open-practice modes. */
  targetCarry?: number;
  /** Hole number (1-based) this shot belongs to, for Course rounds. */
  hole?: number;
}

export type VenueType = 'Range' | 'Sim Centre' | 'Fitting Studio' | 'Golf Course';

export interface Venue {
  name: string;
  type: VenueType;
  city: string;
}

/** Weather snapshot logged with an outdoor session. The launch monitor
 *  doesn't capture these — they're entered/inferred per session so a
 *  windy practice doesn't look like a bad ball-striking day. */
export interface SessionConditions {
  /** Wind speed in mph, 0 for calm. */
  windMph: number;
  /** Wind direction the ball is travelling INTO, in compass degrees
   *  (0 = N, 90 = E). For golf purposes the headwind/tailwind/cross
   *  classification matters more than the exact bearing. */
  windDir: number;
  /** Air temperature in °F (1°F warmer ≈ ~0.25 yds more carry on
   *  a 7-iron, so a 30°F day plays meaningfully short). */
  tempF: number;
  /** Free-text classifier so the UI can show "Calm" / "Breezy" / "Gusty"
   *  without re-deriving it everywhere. */
  label: 'Calm' | 'Light' | 'Breezy' | 'Windy' | 'Gusty';
}

export interface Session {
  id: string;
  date: string;              // ISO
  mode: SessionMode;
  environment: Environment;
  ballType: BallType;
  elevation: number;         // ft
  /** Optional named venue. When unset, the session was at home. */
  venue?: Venue | null;
  shots: Shot[];
  /** Course-round data, present only when mode === 'Course'. */
  course?: CourseInfo;
  /** Weather conditions — only set for Outdoor sessions. */
  conditions?: SessionConditions;
}

export type Gender = 'Male' | 'Female' | 'Non-binary' | 'Prefer not to say';
export type UnitSystem = 'Yards · mph' | 'Metres · kph';

export interface Golfer {
  firstName: string;
  lastName: string;
  email: string;
  birthday: string;          // ISO date (YYYY-MM-DD)
  gender: Gender;
  country: string;
  handicap: string;
  dexterity: 'Right Handed' | 'Left Handed';
  units: UnitSystem;
  membership: { tier: string; expiresOn: string };
}
