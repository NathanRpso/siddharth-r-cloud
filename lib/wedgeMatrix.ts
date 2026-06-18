// Wedge yardage matrix — how repeatable is each wedge at each "stock"
// scoring-zone distance? Built from real shots filtered to PW / GW / SW
// (LW left out — most amateurs don't have stock yardages with it).
//
// For each wedge × target distance we report: shots in that band, average
// carry vs the target (so you can see whether you flight it short/long),
// and a tone signalling how tight the cluster is.

import type { Shot, ClubId } from './types';

export type WedgeId = 'PW' | 'GW' | 'SW';
export const WEDGE_IDS: WedgeId[] = ['PW', 'GW', 'SW'];
export const WEDGE_TARGETS = [50, 75, 100] as const;
export type WedgeTarget = (typeof WEDGE_TARGETS)[number];

export interface WedgeCell {
  club: WedgeId;
  target: WedgeTarget;
  count: number;
  /** Average actual carry of shots in the band, yds. */
  avgCarry: number;
  /** Average error vs target, signed (+ long / − short), yds. */
  bias: number;
  /** Standard deviation of carry — band tightness, yds. */
  sd: number;
  /** Hit-rate inside ±5 yds of target (a "stock" wedge window). */
  windowPct: number;
  /** Tone for the cell. */
  tone: 'positive' | 'neutral' | 'warn' | 'empty';
}

const BAND_HALF = 12; // a shot counts toward a 75-yd target if 63 ≤ carry ≤ 87
const STOCK_WINDOW = 5;
const MIN_SHOTS_PER_CELL = 4;

function mean(xs: number[]): number {
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}
function sd(xs: number[]): number {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  return Math.sqrt(xs.reduce((s, x) => s + (x - m) ** 2, 0) / (xs.length - 1));
}

function toneFor(cell: Omit<WedgeCell, 'tone'>): WedgeCell['tone'] {
  if (cell.count < MIN_SHOTS_PER_CELL) return 'empty';
  if (cell.windowPct >= 0.55 && Math.abs(cell.bias) <= 3) return 'positive';
  if (cell.windowPct >= 0.30) return 'neutral';
  return 'warn';
}

export function wedgeMatrix(shots: Shot[]): WedgeCell[][] {
  return WEDGE_IDS.map((club) => {
    const clubShots = shots.filter((s) => s.club === club);
    return WEDGE_TARGETS.map((target): WedgeCell => {
      const band = clubShots.filter(
        (s) => s.carry >= target - BAND_HALF && s.carry <= target + BAND_HALF,
      );
      if (!band.length) {
        return { club, target, count: 0, avgCarry: 0, bias: 0, sd: 0, windowPct: 0, tone: 'empty' };
      }
      const carries = band.map((s) => s.carry);
      const avgCarry = mean(carries);
      const bias = avgCarry - target;
      const inWindow = band.filter(
        (s) => Math.abs(s.carry - target) <= STOCK_WINDOW,
      ).length;
      const base = {
        club,
        target,
        count: band.length,
        avgCarry,
        bias,
        sd: sd(carries),
        windowPct: inWindow / band.length,
      };
      return { ...base, tone: toneFor(base) };
    });
  });
}

/** Coaching cue derived from the matrix — pick the worst cell and say what
 *  it means. Used to power the headline line on the wedge card. */
export function wedgeMatrixHeadline(matrix: WedgeCell[][]): string | null {
  const cells = matrix.flat().filter((c) => c.tone !== 'empty');
  if (!cells.length) return null;

  const worst = cells.sort((a, b) => a.windowPct - b.windowPct)[0];
  if (worst.tone === 'positive') {
    return `Your ${worst.club} from ${worst.target} yds is stock — ${Math.round(worst.windowPct * 100)}% inside ±${STOCK_WINDOW} yds.`;
  }
  if (Math.abs(worst.bias) > 5) {
    const dir = worst.bias > 0 ? 'long' : 'short';
    return `Your ${worst.club} from ${worst.target} yds plays ${Math.round(Math.abs(worst.bias))} yds ${dir} — recalibrate before you take it on the course.`;
  }
  return `Your ${worst.club} from ${worst.target} yds is the loosest cluster — only ${Math.round(worst.windowPct * 100)}% inside ±${STOCK_WINDOW} yds.`;
}

/** Re-export a typed reference for any UI that needs to pretty-print
 *  the club id with the bag colour token. */
export const WEDGE_CLUB_ID: ReadonlyArray<ClubId> = WEDGE_IDS;
