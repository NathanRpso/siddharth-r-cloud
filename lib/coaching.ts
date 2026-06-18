// "Work on this next" — turns the golfer's data into a ranked practice plan.
//
// It compares the golfer's real numbers against a typical player at their GOAL
// handicap (the gap they actually want to close), scores each lever by how far
// behind it is, weights accuracy more heavily (that's where handicaps are
// made), and pairs each one with a concrete drill. The biggest gap becomes the
// primary focus; the rest are secondary.

import type { Shot, Session } from './types';
import {
  courseStats,
  lateralDispersion,
  aggregateByClub,
  clubStrokesGained,
} from './stats';
import {
  handicapProfile,
  BENCH_METRICS,
  type HandicapProfile,
  type BenchMetric,
} from './handicapBenchmarks';
import { CLUBS } from './clubs';
import type { GolferProfile } from './golferProfile';

export interface FocusArea {
  id: string;
  title: string;
  /** Higher = more urgent. */
  severity: number;
  accuracy: boolean;
  /** The gap, in one line. */
  headline: string;
  /** Why it matters. */
  why: string;
  /** A concrete thing to do. */
  drill: string;
  yourLabel: string;
  targetLabel: string;
}

interface Lever {
  key: keyof HandicapProfile;
  scale: number;   // deficit per "1 unit" of severity
  weight: number;  // accuracy levers weighted up, distance down
  drill: string;
}

const LEVERS: Lever[] = [
  {
    key: 'girPct', scale: 10, weight: 1.3,
    drill: 'Approach ladder: from 120, 140 and 160 yds hit 6 balls each at a green-sized target and count how many would hold. Re-test weekly and chase the number up.',
  },
  {
    key: 'approachDispersionYds', scale: 6, weight: 1.3,
    drill: 'Gate drill: stick two tees just outside your clubface at address and brush through without clipping them. Then hit 15 seven-irons at one target, tracking how many start on line.',
  },
  {
    key: 'fairwaysPct', scale: 12, weight: 1.0,
    drill: 'Fairway-finder routine: pick an intermediate target a foot ahead of the ball and make a smooth 3/4 swing. Play 14 "tee shots" and score fairways hit.',
  },
  {
    key: 'scramblingPct', scale: 12, weight: 1.1,
    drill: 'Up-and-down game: drop 10 balls in different lies around one green and get each up and down. Score it out of 10 and beat it next time.',
  },
  {
    key: 'puttsPerRound', scale: 2.5, weight: 1.0,
    drill: 'Lag ladder + circle: roll putts to 30/40/50 ft leaving each inside 3 ft, then make a full circle of 6 balls from 4 ft before you leave.',
  },
  {
    key: 'driverCarry', scale: 20, weight: 0.6,
    drill: 'Overspeed work: 3 sets of 6 near-max swings, twice a week. Track clubhead speed — carry follows speed once contact stays centred.',
  },
];

function metricMeta(key: keyof HandicapProfile): BenchMetric {
  return BENCH_METRICS.find((m) => m.key === key)!;
}

function fmt(m: BenchMetric, v: number): string {
  const n = v.toFixed(m.decimals);
  return m.unit === '%' ? `${n}%` : m.unit ? `${n} ${m.unit}` : n;
}

/** Build the ranked plan. `goal` is the handicap the golfer is chasing. */
export function coachingPlan(
  profile: GolferProfile,
  shots: Shot[],
  sessions: Session[],
): FocusArea[] {
  const goal = profile.goals.targetHandicap;
  const target = handicapProfile(goal);

  const cs = courseStats(sessions);
  const dr = aggregateByClub(shots).find((c) => c.club === 'Dr');
  const me: Partial<Record<keyof HandicapProfile, number | null>> = {
    driverCarry: dr ? dr.avgCarry : null,
    fairwaysPct: cs ? cs.fairwaysPct : null,
    girPct: cs ? cs.girPct : null,
    approachDispersionYds: lateralDispersion(shots, '7i'),
    scramblingPct: cs ? cs.scramblingPct : null,
    puttsPerRound: cs ? cs.puttsPerRound : null,
    scoringAvg: cs ? cs.scoringAvg : null,
  };

  const areas: FocusArea[] = [];

  for (const lever of LEVERS) {
    const your = me[lever.key];
    if (your == null) continue;
    const m = metricMeta(lever.key);
    const bench = target[lever.key];
    const deficit = m.goodDir === 'up' ? bench - your : your - bench;
    if (deficit <= 0) continue; // already at/ahead of goal level
    const severity = (deficit / lever.scale) * lever.weight;

    const gap = fmt(m, Math.abs(your - bench));
    const verb =
      lever.key === 'approachDispersionYds' || lever.key === 'puttsPerRound'
        ? 'tighten'
        : 'add';
    areas.push({
      id: lever.key,
      title: m.label,
      severity,
      accuracy: m.group === 'accuracy',
      headline: `You're ${fmt(m, your)}; a ${goal}-handicap is around ${fmt(m, bench)} — ${gap} to ${verb}.`,
      why: m.note,
      drill: lever.drill,
      yourLabel: `You: ${fmt(m, your)}`,
      targetLabel: `Goal (${goal}): ${fmt(m, bench)}`,
    });
  }

  // Add the single worst strokes-gained club as a club-specific focus.
  const sg = clubStrokesGained(shots);
  const worst = [...sg].sort((a, b) => a.value - b.value)[0];
  if (worst && worst.value < -0.4) {
    const def = CLUBS[worst.club];
    areas.push({
      id: `club-${worst.club}`,
      title: `Sharpen your ${def.label}`,
      severity: Math.abs(worst.value) * 1.6,
      accuracy: true,
      headline: `Your ${def.label} is leaking about ${Math.abs(worst.value).toFixed(1)} strokes a round vs your level.`,
      why: 'A single club this far behind drags your whole bag down.',
      drill: `Block a basket of 25–30 balls to your ${def.label} alone, all at one target. Quality repeated reps beat raking through randomly.`,
      yourLabel: `${worst.value.toFixed(1)} strokes`,
      targetLabel: 'Goal: 0.0',
    });
  }

  return areas
    .filter((a) => a.severity > 0.15)
    .sort((a, b) => b.severity - a.severity);
}
