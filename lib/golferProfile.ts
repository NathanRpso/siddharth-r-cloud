// The golfer's own profile — their handicap, who they want to be measured
// against, and the goals they're chasing. Persisted to localStorage so the
// app stops *assuming* a 20-handicap and instead compares against the level
// the golfer actually sets, and against their own targets.
//
// The benchmark scaling here is a transparent model, not measured data: the
// reference tables in stats.ts are anchored at a 20-handicap, and we scale
// them up/down by handicap (lower handicap → longer + tighter). It's an
// estimate — same spirit as the existing "rough approximations" — but it lets
// every comparison move with the handicap the golfer chooses.

import { CARRY_BENCHMARKS_20, HANDICAP_BENCHMARKS_20 } from './stats';
import type { ClubId } from './types';

export interface GolferGoals {
  /** Target handicap to play to. */
  targetHandicap: number;
  /** Target driver carry (yds). */
  driverCarry: number;
  /** Target putts per round. */
  puttsPerRound: number;
}

export interface GolferProfile {
  /** The golfer's current handicap. */
  handicap: number;
  /** The cohort to benchmark against (defaults to their own handicap, but
   *  they can aim higher — e.g. compare to a 10 to see the gap to their goal). */
  comparisonHandicap: number;
  goals: GolferGoals;
}

export const DEFAULT_PROFILE: GolferProfile = {
  handicap: 15,
  comparisonHandicap: 15,
  goals: { targetHandicap: 10, driverCarry: 240, puttsPerRound: 30 },
};

export const PROFILE_STORAGE_KEY = 'rcloud:golfer-v1';

export function loadProfile(): GolferProfile {
  if (typeof window === 'undefined') return DEFAULT_PROFILE;
  try {
    const raw = window.localStorage.getItem(PROFILE_STORAGE_KEY);
    if (!raw) return DEFAULT_PROFILE;
    const parsed = JSON.parse(raw);
    // Merge so missing keys fall back to defaults.
    return {
      ...DEFAULT_PROFILE,
      ...parsed,
      goals: { ...DEFAULT_PROFILE.goals, ...(parsed?.goals ?? {}) },
    };
  } catch {
    return DEFAULT_PROFILE;
  }
}

export function saveProfile(p: GolferProfile) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(p));
  } catch {
    /* ignore */
  }
}

/** Multipliers vs the 20-handicap anchor. Lower handicap → longer and a touch
 *  faster; smash barely moves. Clamped to a sane handicap range. */
export function benchmarkScale(handicap: number) {
  const h = Math.max(0, Math.min(36, handicap));
  const d = 20 - h;
  return {
    carry: 1 + d * 0.0085,
    speed: 1 + d * 0.0075,
    smash: 1 + d * 0.0015,
  };
}

type CarryBand = { p25: number; p50: number; p75: number };

function scaleBand(b: CarryBand, f: number): CarryBand {
  return {
    p25: Math.round(b.p25 * f),
    p50: Math.round(b.p50 * f),
    p75: Math.round(b.p75 * f),
  };
}

/** Per-club carry benchmarks scaled to a given handicap. */
export function scaledCarryBenchmarks(handicap: number): Partial<Record<ClubId, CarryBand>> {
  const { carry } = benchmarkScale(handicap);
  const out: Partial<Record<ClubId, CarryBand>> = {};
  for (const key of Object.keys(CARRY_BENCHMARKS_20) as ClubId[]) {
    const b = CARRY_BENCHMARKS_20[key];
    if (b) out[key] = scaleBand(b, carry);
  }
  return out;
}

/** Headline percentile benchmarks scaled to a given handicap. */
export function scaledHandicapBenchmarks(handicap: number): typeof HANDICAP_BENCHMARKS_20 {
  const { carry, speed, smash } = benchmarkScale(handicap);
  const b = HANDICAP_BENCHMARKS_20;
  return {
    driverCarry:        scaleBand(b.driverCarry, carry),
    driverClubSpeed:    scaleBand(b.driverClubSpeed, speed),
    driverSmash: {
      p25: +(b.driverSmash.p25 * smash).toFixed(2),
      p50: +(b.driverSmash.p50 * smash).toFixed(2),
      p75: +(b.driverSmash.p75 * smash).toFixed(2),
    },
    sevenIronCarry:     scaleBand(b.sevenIronCarry, carry),
    pitchingWedgeCarry: scaleBand(b.pitchingWedgeCarry, carry),
  };
}
