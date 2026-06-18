// Smart aim — given a golfer's actual dispersion with a club, suggests how
// far left/right of a target line to aim so the *centre* of their pattern
// lands on the target. Course-management tool: turn the dispersion plot
// into a single, plain-English instruction.

import type { Shot, ClubId } from './types';

export interface AimRecommendation {
  club: ClubId;
  shots: number;
  /** How far the average shot drifts off the line (yds, + right / − left). */
  bias: number;
  /** Standard deviation of side-carry — the width of your pattern. */
  spreadSd: number;
  /** Suggested aim offset = −bias (yds, + right / − left). */
  aimOffset: number;
  /** What share of shots you'd fit on a 30-yd fairway if you aim the offset. */
  fairwayFitPct: number;
  /** Plain-English instruction. */
  instruction: string;
  /** Confidence: high if >=20 shots, medium >=10, low otherwise. */
  confidence: 'high' | 'medium' | 'low';
}

function mean(xs: number[]): number {
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}
function sd(xs: number[]): number {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  return Math.sqrt(xs.reduce((s, x) => s + (x - m) ** 2, 0) / (xs.length - 1));
}

/** Approximate normal-distribution CDF (Abramowitz–Stegun 26.2.17). The
 *  precision is well within what we need for a fairway-fit estimate. */
function normalCdf(z: number): number {
  const sign = z < 0 ? -1 : 1;
  const x = Math.abs(z) / Math.sqrt(2);
  const t = 1 / (1 + 0.3275911 * x);
  const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
  return 0.5 * (1 + sign * y);
}

const FAIRWAY_HALF = 15; // half-width of a 30-yd fairway, in yds

function instructionFor(rec: Omit<AimRecommendation, 'instruction' | 'confidence'>): string {
  const yds = Math.round(Math.abs(rec.aimOffset));
  const dir = rec.aimOffset > 0 ? 'right' : 'left';
  const fit = Math.round(rec.fairwayFitPct * 100);
  if (yds <= 2) {
    return `Aim straight — your ${rec.club} pattern centres on the target (${fit}% inside a 30-yd window).`;
  }
  const shape = rec.bias > 0 ? 'right' : 'left';
  return `Aim ${yds} yds ${dir} with your ${rec.club} — your shots favour ${shape}, so the centre of your pattern lands on the target ${fit}% of the time inside a 30-yd window.`;
}

export function aimForClub(shots: Shot[]): AimRecommendation | null {
  if (shots.length < 6) return null;
  const club = shots[0].club;
  const sides = shots.map((s) => s.sideCarry);
  const bias = mean(sides);
  const spreadSd = sd(sides) || 1;
  const aimOffset = -bias;

  // After aiming the offset, the residual mean is 0 and SD is unchanged.
  // Fraction inside ±FAIRWAY_HALF = P(|X| < 15) = 2Φ(15/σ) − 1.
  const fairwayFitPct = Math.min(1, Math.max(0, 2 * normalCdf(FAIRWAY_HALF / spreadSd) - 1));

  const base = { club, shots: shots.length, bias, spreadSd, aimOffset, fairwayFitPct };
  const confidence: AimRecommendation['confidence'] =
    shots.length >= 20 ? 'high' : shots.length >= 10 ? 'medium' : 'low';
  return { ...base, confidence, instruction: instructionFor(base) };
}

export function aimByClub(shots: Shot[]): AimRecommendation[] {
  const byClub = new Map<ClubId, Shot[]>();
  for (const s of shots) {
    const arr = byClub.get(s.club);
    if (arr) arr.push(s);
    else byClub.set(s.club, [s]);
  }
  const out: AimRecommendation[] = [];
  for (const arr of byClub.values()) {
    const r = aimForClub(arr);
    if (r) out.push(r);
  }
  return out;
}
