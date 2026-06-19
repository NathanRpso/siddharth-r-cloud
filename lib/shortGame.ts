// Short game & putting — the scoring zone a launch monitor never sees.
//
// The MLM/launch-monitor data is all full-swing ball flight, but golfers score
// from inside 100 yards. There's no sensor data for this, so the numbers are a
// transparent model rather than measured — same spirit as the carry/handicap
// benchmarks in stats.ts. Every metric is a clamped-linear function of
// handicap, anchored so a ~15-handicap reproduces the original prototype
// numbers. The golfer's own value is evaluated at THEIR handicap; the
// benchmark on each tile/chart is the same model evaluated at the comparison
// handicap they set on the My Game page. So the whole short game now moves with
// the handicap, exactly like the full-swing side.

export type SGTone = 'positive' | 'neutral' | 'warn' | 'caution';

export interface SGHeadline {
  key: string;
  label: string;
  value: number;
  unit: string;
  decimals: number;
  /** Which direction is good — putts/round lower is better, up&down higher. */
  goodDirection: 'up' | 'down';
  /** Comparison-cohort baseline (the handicap the golfer benchmarks against). */
  benchmark: number;
  /** Aspirational tour-ish reference. */
  tour: number;
  /** Quiet supporting line. */
  sub: string;
  /** Plain-English coaching cue when this is the weak spot. */
  advice: string;
}

export interface PuttBand {
  band: string;
  makePct: number;   // 0..1
  attempts: number;
  benchmark: number; // comparison-cohort make rate 0..1
}

export interface WedgeProximity {
  distance: string;
  proximityFt: number;
  benchmark: number;
}

// ============================================================================
// Handicap scaling model
// ============================================================================

const HCP_MIN = 0;
const HCP_MAX = 36;

function clampHcp(h: number): number {
  return Math.max(HCP_MIN, Math.min(HCP_MAX, h));
}

function roundTo(n: number, decimals: number): number {
  const f = 10 ** decimals;
  return Math.round(n * f) / f;
}

/** A metric modelled as `base + slope·handicap`, clamped to a sane range. */
interface Line {
  base: number;
  slope: number;
  min?: number;
  max?: number;
}

function evalLine(l: Line, handicap: number): number {
  const v = l.base + l.slope * clampHcp(handicap);
  const lo = l.min ?? -Infinity;
  const hi = l.max ?? Infinity;
  return Math.max(lo, Math.min(hi, v));
}

// ---- Headline scoring-zone stats ------------------------------------------

interface HeadlineSpec {
  key: string;
  label: string;
  unit: string;
  decimals: number;
  goodDirection: 'up' | 'down';
  tour: number;
  line: Line;
  sub: string | ((value: number) => string);
  advice: string;
}

const HEADLINE_SPECS: HeadlineSpec[] = [
  {
    key: 'putts',
    label: 'Putts / round',
    unit: '', decimals: 1, goodDirection: 'down', tour: 28.5,
    line: { base: 30.2, slope: 0.18, min: 27, max: 40 },
    sub: (v) => `≈ ${(v / 18).toFixed(1)} putts per hole`,
    advice: 'Tighten your lag putting so your second putt is a tap-in.',
  },
  {
    key: 'updown',
    label: 'Up & down',
    unit: '%', decimals: 0, goodDirection: 'up', tour: 63,
    line: { base: 58, slope: -1.13, min: 8, max: 72 },
    sub: 'Saving par when you miss the green',
    advice: 'Pick one go-to chip and commit — most amateurs lose strokes by getting fancy.',
  },
  {
    key: 'threeputt',
    label: '3-putts / round',
    unit: '', decimals: 1, goodDirection: 'down', tour: 0.3,
    line: { base: 0.5, slope: 0.087, min: 0.2, max: 4 },
    sub: 'Avoiding the big number on the green',
    advice: 'Spend warm-ups on 30–40 ft lag putts to two-putt from distance.',
  },
  {
    key: 'sand',
    label: 'Sand saves',
    unit: '%', decimals: 0, goodDirection: 'up', tour: 55,
    line: { base: 48.5, slope: -1.17, min: 6, max: 60 },
    sub: 'Getting up & down from bunkers',
    advice: 'Commit to accelerating through the sand — most thin/chunk misses are deceleration.',
  },
];

/** Headline short-game stats for a golfer at `handicap`, benchmarked against
 *  `comparisonHandicap`. In the order a golfer reads them. */
export function shortGameHeadlines(
  handicap: number,
  comparisonHandicap: number,
): SGHeadline[] {
  return HEADLINE_SPECS.map((s) => {
    const value = roundTo(evalLine(s.line, handicap), s.decimals);
    const benchmark = roundTo(evalLine(s.line, comparisonHandicap), s.decimals);
    return {
      key: s.key,
      label: s.label,
      value,
      unit: s.unit,
      decimals: s.decimals,
      goodDirection: s.goodDirection,
      benchmark,
      tour: s.tour,
      sub: typeof s.sub === 'function' ? s.sub(value) : s.sub,
      advice: s.advice,
    };
  });
}

// ---- Putting make-rate by distance ----------------------------------------

interface PuttSpec {
  band: string;
  attempts: number;
  line: Line; // models make rate (0..1)
}

const PUTT_SPECS: PuttSpec[] = [
  { band: '3 ft',     attempts: 48, line: { base: 0.99,   slope: -0.0015, min: 0.85, max: 0.995 } },
  { band: '4–6 ft',   attempts: 34, line: { base: 0.785,  slope: -0.0077, min: 0.30, max: 0.95 } },
  { band: '7–10 ft',  attempts: 29, line: { base: 0.462,  slope: -0.0055, min: 0.12, max: 0.80 } },
  { band: '11–20 ft', attempts: 31, line: { base: 0.211,  slope: -0.0027, min: 0.05, max: 0.55 } },
  { band: '21 ft +',  attempts: 26, line: { base: 0.0715, slope: -0.0014, min: 0.01, max: 0.30 } },
];

/** Putting make-rate by distance bucket — golfer at `handicap`, benchmark line
 *  at `comparisonHandicap`. The signature short-game view. */
export function puttingMakeRates(
  handicap: number,
  comparisonHandicap: number,
): PuttBand[] {
  return PUTT_SPECS.map((s) => ({
    band: s.band,
    attempts: s.attempts,
    makePct: roundTo(evalLine(s.line, handicap), 2),
    benchmark: roundTo(evalLine(s.line, comparisonHandicap), 2),
  }));
}

// ---- Wedge proximity & lag putting ----------------------------------------

interface WedgeSpec {
  distance: string;
  line: Line; // models proximity in feet (lower better)
}

const WEDGE_SPECS: WedgeSpec[] = [
  { distance: '50 yds',  line: { base: 8.5,  slope: 0.43, min: 6 } },
  { distance: '75 yds',  line: { base: 12.5, slope: 0.57, min: 9 } },
  { distance: '100 yds', line: { base: 16.5, slope: 0.77, min: 12 } },
];

/** Proximity to the hole from inside scoring range (wedge play). */
export function wedgeProximity(
  handicap: number,
  comparisonHandicap: number,
): WedgeProximity[] {
  return WEDGE_SPECS.map((s) => ({
    distance: s.distance,
    proximityFt: Math.round(evalLine(s.line, handicap)),
    benchmark: Math.round(evalLine(s.line, comparisonHandicap)),
  }));
}

const LAG_PUTT_LINE: Line = { base: 2.0, slope: 0.107, min: 1.5 };

/** Average distance left after a lag putt from 30 ft+ (feet, lower better). */
export function lagPuttProximity(
  handicap: number,
  comparisonHandicap: number,
): { value: number; benchmark: number } {
  return {
    value: roundTo(evalLine(LAG_PUTT_LINE, handicap), 1),
    benchmark: roundTo(evalLine(LAG_PUTT_LINE, comparisonHandicap), 1),
  };
}

// ============================================================================
// Ratings & synthesis (operate on already-computed values)
// ============================================================================

/** How good a value is vs its benchmark and tour reference (0..1, higher
 *  = better), normalised so the different metrics can be compared. */
function strength(h: SGHeadline): number {
  const span = Math.abs(h.tour - h.benchmark) || 1;
  const gain = h.goodDirection === 'up' ? h.value - h.benchmark : h.benchmark - h.value;
  return gain / span;
}

/** Rate a headline vs its benchmark into a tone + label. */
export function rateHeadline(h: SGHeadline): { label: string; tone: SGTone } {
  const s = strength(h);
  if (s >= 0.45) return { label: 'Strength', tone: 'positive' };
  if (s >= 0.15) return { label: 'Above average', tone: 'positive' };
  if (s >= -0.05) return { label: 'About average', tone: 'neutral' };
  if (s >= -0.3) return { label: 'Costing you shots', tone: 'warn' };
  return { label: 'Biggest leak', tone: 'caution' };
}

export function ratePuttBand(b: PuttBand): SGTone {
  const diff = b.makePct - b.benchmark;
  if (diff > 0.05) return 'positive';
  if (diff >= -0.01) return 'neutral';
  return 'warn';
}

/** Delta vs benchmark, signed so callers can show "+" / "-". */
export function headlineDelta(h: SGHeadline): number {
  return +(h.value - h.benchmark).toFixed(h.decimals);
}

/** One-line synthesis: lead with the strength, name the biggest leak, and
 *  give the cue for it. The same "here's what to work on" voice as the rest
 *  of the app. When the golfer is level with their cohort across the board,
 *  say so plainly instead of forcing a leak. */
export function shortGameSynthesis(headlines: SGHeadline[]): string {
  const ranked = [...headlines].sort((a, b) => strength(a) - strength(b));
  const weakest = ranked[0];
  const strongest = ranked[ranked.length - 1];
  if (strength(weakest) >= -0.05) {
    return `Your short game is right where a player of your level sits — no single leak stands out. Aim the comparison at your goal handicap to see where the next strokes are.`;
  }
  return `Your ${strongest.label.toLowerCase()} is a real strength. The strokes are hiding in your ${weakest.label.toLowerCase()} — ${weakest.advice}`;
}
