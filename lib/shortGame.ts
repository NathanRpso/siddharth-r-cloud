// Short game & putting — the scoring zone a launch monitor never sees.
//
// The MLM/launch-monitor data is all full-swing ball flight, but golfers score
// from inside 100 yards. For the prototype these numbers are synthesised (a
// deterministic, mid-handicap-but-improving profile that matches the rest of
// the mock golfer) rather than measured — but they're shaped exactly like the
// stats a real golfer tracks, so the screens and language are honest even if
// the source isn't a sensor.

export type SGTone = 'positive' | 'neutral' | 'warn' | 'caution';

export interface SGHeadline {
  key: string;
  label: string;
  value: number;
  unit: string;
  decimals: number;
  /** Which direction is good — putts/round lower is better, up&down higher. */
  goodDirection: 'up' | 'down';
  /** Typical mid-handicap amateur baseline. */
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
  benchmark: number; // amateur make rate 0..1
}

export interface WedgeProximity {
  distance: string;
  proximityFt: number;
  benchmark: number;
}

/** Headline short-game stats, in the order a golfer reads them. */
export const SHORT_GAME_HEADLINES: SGHeadline[] = [
  {
    key: 'putts',
    label: 'Putts / round',
    value: 32.8, unit: '', decimals: 1,
    goodDirection: 'down', benchmark: 35.5, tour: 28.5,
    sub: '≈ 1.8 putts per hole',
    advice: 'Tighten your lag putting so your second putt is a tap-in.',
  },
  {
    key: 'updown',
    label: 'Up & down',
    value: 41, unit: '%', decimals: 0,
    goodDirection: 'up', benchmark: 33, tour: 60,
    sub: 'Saving par when you miss the green',
    advice: 'Pick one go-to chip and commit — most amateurs lose strokes by getting fancy.',
  },
  {
    key: 'threeputt',
    label: '3-putts / round',
    value: 1.8, unit: '', decimals: 1,
    goodDirection: 'down', benchmark: 2.8, tour: 0.4,
    sub: 'Avoiding the big number on the green',
    advice: 'Spend warm-ups on 30–40 ft lag putts to two-putt from distance.',
  },
  {
    key: 'sand',
    label: 'Sand saves',
    value: 31, unit: '%', decimals: 0,
    goodDirection: 'up', benchmark: 22, tour: 50,
    sub: 'Getting up & down from bunkers',
    advice: 'Commit to accelerating through the sand — most thin/chunk misses are deceleration.',
  },
];

/** Putting make-rate by distance bucket — the signature short-game view. */
export const PUTTING_MAKE_RATES: PuttBand[] = [
  { band: '3 ft',    makePct: 0.97, attempts: 48, benchmark: 0.95 },
  { band: '4–6 ft',  makePct: 0.67, attempts: 34, benchmark: 0.60 },
  { band: '7–10 ft', makePct: 0.38, attempts: 29, benchmark: 0.33 },
  { band: '11–20 ft', makePct: 0.17, attempts: 31, benchmark: 0.16 },
  { band: '21 ft +', makePct: 0.05, attempts: 26, benchmark: 0.04 },
];

/** Proximity to the hole from inside scoring range (wedge play). */
export const WEDGE_PROXIMITY: WedgeProximity[] = [
  { distance: '50 yds',  proximityFt: 15, benchmark: 21 },
  { distance: '75 yds',  proximityFt: 21, benchmark: 27 },
  { distance: '100 yds', proximityFt: 28, benchmark: 33 },
];

/** Average distance left after a lag putt from 30 ft+. */
export const LAG_PUTT_PROXIMITY = { value: 3.6, benchmark: 5.2 };

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
 *  of the app. */
export function shortGameSynthesis(): string {
  const ranked = [...SHORT_GAME_HEADLINES].sort((a, b) => strength(a) - strength(b));
  const weakest = ranked[0];
  const strongest = ranked[ranked.length - 1];
  return `Inside 6 feet you're money, and your ${strongest.label.toLowerCase()} is a real strength. The strokes are hiding in your ${weakest.label.toLowerCase()} — ${weakest.advice}`;
}
