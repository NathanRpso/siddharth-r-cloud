// "What's my typical miss?" — synthesises a golfer's dominant shot shape
// per club from clubPath, spinAxis, and sideCarry. Designed to power the
// most actionable single insight a launch monitor can offer.

import type { Shot, ClubId } from './types';
import { shotShape, type ShotShape } from './shotDiagnosis';

export interface ClubMiss {
  club: ClubId;
  count: number;
  /** The shape that shows up most often. */
  dominantShape: ShotShape;
  /** What fraction of shots are that shape (0..1). */
  dominantPct: number;
  /** Average side-carry, in yds (+ right, − left). */
  avgSideCarry: number;
  /** Standard deviation of side-carry — how spread out the miss is. */
  sideCarrySd: number;
  /** Short headline ("Pull-draw, ~8 yds left"). */
  headline: string;
  /** Tone: warn = persistent miss, neutral = mixed, positive = mostly straight. */
  tone: 'positive' | 'neutral' | 'warn';
}

const MIN_SHOTS = 8;

function mean(xs: number[]): number {
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}
function sd(xs: number[]): number {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  return Math.sqrt(xs.reduce((s, x) => s + (x - m) ** 2, 0) / (xs.length - 1));
}

function headlineFor(m: Omit<ClubMiss, 'headline' | 'tone'>): string {
  const side = Math.round(Math.abs(m.avgSideCarry));
  const dir = m.avgSideCarry > 0 ? 'right' : 'left';
  const pct = Math.round(m.dominantPct * 100);
  const shapeName =
    m.dominantShape === 'straight' ? 'Mostly straight'
    : m.dominantShape === 'push'   ? 'Push'
    : m.dominantShape === 'pull'   ? 'Pull'
    : m.dominantShape === 'draw'   ? 'Draw'
    :                                 'Fade';
  if (m.dominantShape === 'straight') {
    return `${shapeName} — ${pct}% on line`;
  }
  return `${shapeName}, ~${side} yds ${dir} (${pct}% of shots)`;
}

function toneFor(m: Omit<ClubMiss, 'headline' | 'tone'>): 'positive' | 'neutral' | 'warn' {
  if (m.dominantShape === 'straight' && m.dominantPct >= 0.55) return 'positive';
  // Persistent same-direction miss = warn (something to fix).
  if (m.dominantPct >= 0.55 && m.dominantShape !== 'straight') return 'warn';
  return 'neutral';
}

export function typicalMissForClub(shots: Shot[]): ClubMiss | null {
  if (shots.length < MIN_SHOTS) return null;

  const tally: Record<ShotShape, number> = {
    push: 0, pull: 0, draw: 0, fade: 0, straight: 0,
  };
  for (const s of shots) tally[shotShape(s)]++;

  let dominantShape: ShotShape = 'straight';
  let dominantCount = 0;
  (Object.keys(tally) as ShotShape[]).forEach((k) => {
    if (tally[k] > dominantCount) {
      dominantCount = tally[k];
      dominantShape = k;
    }
  });

  const sides = shots.map((s) => s.sideCarry);
  const base = {
    club: shots[0].club,
    count: shots.length,
    dominantShape,
    dominantPct: dominantCount / shots.length,
    avgSideCarry: mean(sides),
    sideCarrySd: sd(sides),
  };

  return {
    ...base,
    headline: headlineFor(base),
    tone: toneFor(base),
  };
}

/** Per-club typical miss summary, ordered with the most problematic
 *  (persistent same-direction misses, big side-carry) first. */
export function typicalMissByClub(shots: Shot[]): ClubMiss[] {
  const byClub = new Map<ClubId, Shot[]>();
  for (const s of shots) {
    const arr = byClub.get(s.club);
    if (arr) arr.push(s);
    else byClub.set(s.club, [s]);
  }
  const summaries: ClubMiss[] = [];
  for (const arr of byClub.values()) {
    const m = typicalMissForClub(arr);
    if (m) summaries.push(m);
  }
  // Order: warn first (most actionable), then by absolute side-carry.
  return summaries.sort((a, b) => {
    const toneRank = (t: ClubMiss['tone']) => (t === 'warn' ? 0 : t === 'neutral' ? 1 : 2);
    const diff = toneRank(a.tone) - toneRank(b.tone);
    if (diff !== 0) return diff;
    return Math.abs(b.avgSideCarry) - Math.abs(a.avgSideCarry);
  });
}
