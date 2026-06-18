// What a "typical" golfer at a given handicap actually does — distance, and
// (more importantly) accuracy and scoring. Used by the My Game page to answer
// "am I performing like my handicap?" and "what does the next level require?".
//
// Numbers are anchored to widely-published amateur datasets (Shot Scope /
// Arccos / USGA handicap research) at handicaps 0/5/10/15/20/25/30 and linearly
// interpolated between. They're representative averages, not a guarantee — but
// they're real-world shaped, and accuracy is weighted heavily because that's
// where handicaps are actually made (amateurs lose far more to dispersion and
// greens-hit than to raw distance).

export type MetricGroup = 'distance' | 'accuracy' | 'scoring';

export interface BenchMetric {
  key: keyof HandicapProfile;
  label: string;
  unit: string;
  /** Which direction is better. */
  goodDir: 'up' | 'down';
  group: MetricGroup;
  decimals: number;
  /** Short plain-English note on why it matters. */
  note: string;
}

export interface HandicapProfile {
  driverCarry: number;          // yds
  fairwaysPct: number;          // % of fairways hit
  girPct: number;               // % greens in regulation
  approachDispersionYds: number; // 7-iron offline spread (std dev), lower = straighter
  scramblingPct: number;        // % up-and-down when missing the green
  puttsPerRound: number;
  scoringAvg: number;           // strokes, normalised to par 72
}

/** Metric catalogue, in the order they're shown. Accuracy group is the
 *  headline — distance is supporting, scoring is the outcome. */
export const BENCH_METRICS: BenchMetric[] = [
  { key: 'girPct',                label: 'Greens in regulation', unit: '%',   goodDir: 'up',   group: 'accuracy', decimals: 0, note: 'The #1 predictor of score — hit more greens, shoot lower.' },
  { key: 'approachDispersionYds', label: 'Iron dispersion (7i)', unit: 'yds', goodDir: 'down', group: 'accuracy', decimals: 1, note: 'How far offline your irons scatter. Tighter = more greens.' },
  { key: 'fairwaysPct',           label: 'Fairways hit',         unit: '%',   goodDir: 'up',   group: 'accuracy', decimals: 0, note: 'Finding the short grass sets up everything after it.' },
  { key: 'scramblingPct',         label: 'Scrambling',           unit: '%',   goodDir: 'up',   group: 'accuracy', decimals: 0, note: 'Saving par when you miss the green.' },
  { key: 'driverCarry',           label: 'Driver carry',         unit: 'yds', goodDir: 'up',   group: 'distance', decimals: 0, note: 'Raw distance off the tee.' },
  { key: 'puttsPerRound',         label: 'Putts / round',        unit: '',    goodDir: 'down', group: 'scoring',  decimals: 1, note: 'Strokes spent on the green.' },
  { key: 'scoringAvg',            label: 'Scoring average',      unit: '',    goodDir: 'down', group: 'scoring',  decimals: 0, note: 'Where it all adds up (par 72).' },
];

const ANCHORS = [0, 5, 10, 15, 20, 25, 30];

// Each series aligns to ANCHORS. Sources: representative amateur averages.
const SERIES: Record<keyof HandicapProfile, number[]> = {
  driverCarry:           [245, 232, 220, 208, 196, 184, 172],
  fairwaysPct:           [62,  57,  51,  45,  40,  35,  31],
  girPct:                [66,  52,  39,  28,  19,  13,  9],
  approachDispersionYds: [12,  15,  19,  24,  29,  34,  39],
  scramblingPct:         [48,  40,  33,  28,  22,  18,  14],
  puttsPerRound:         [30,  31.5, 32.8, 33.8, 35, 36, 37],
  scoringAvg:            [74,  80,  86,  92,  98,  104, 110],
};

function interp(series: number[], handicap: number): number {
  const h = Math.max(ANCHORS[0], Math.min(ANCHORS[ANCHORS.length - 1], handicap));
  for (let i = 0; i < ANCHORS.length - 1; i++) {
    const a = ANCHORS[i];
    const b = ANCHORS[i + 1];
    if (h >= a && h <= b) {
      const t = (h - a) / (b - a);
      return series[i] + (series[i + 1] - series[i]) * t;
    }
  }
  return series[series.length - 1];
}

/** The expected profile for a typical golfer at the given handicap. */
export function handicapProfile(handicap: number): HandicapProfile {
  return {
    driverCarry:           interp(SERIES.driverCarry, handicap),
    fairwaysPct:           interp(SERIES.fairwaysPct, handicap),
    girPct:                interp(SERIES.girPct, handicap),
    approachDispersionYds: interp(SERIES.approachDispersionYds, handicap),
    scramblingPct:         interp(SERIES.scramblingPct, handicap),
    puttsPerRound:         interp(SERIES.puttsPerRound, handicap),
    scoringAvg:            interp(SERIES.scoringAvg, handicap),
  };
}
