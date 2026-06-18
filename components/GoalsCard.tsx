'use client';

import { useMemo } from 'react';
import clsx from 'clsx';
import Icon, { type StrokeIconName } from './Icon';
import { ALL_SHOTS, SESSIONS } from '@/lib/mockData';
import { aggregateByClub, courseStats, lateralDispersion } from '@/lib/stats';
import {
  BENCH_METRICS,
  handicapProfile,
  type BenchMetric,
  type HandicapProfile,
} from '@/lib/handicapBenchmarks';
import type { GolferProfile } from '@/lib/golferProfile';

/** "My Game" — measures the golfer's real numbers against a typical player at
 *  their handicap (accuracy first, because that's where handicaps are made),
 *  then shows the gap to the handicap they're chasing. Everything responds to
 *  the handicaps set at the top. */
export default function GoalsCard({
  profile,
  onChange,
}: {
  profile: GolferProfile;
  onChange: (p: GolferProfile) => void;
}) {
  // The golfer's real game, from their actual shots + scorecards.
  const me = useMemo<Partial<Record<keyof HandicapProfile, number | null>>>(() => {
    const cs = courseStats(SESSIONS);
    const dr = aggregateByClub(ALL_SHOTS).find((c) => c.club === 'Dr');
    return {
      driverCarry: dr ? dr.avgCarry : null,
      fairwaysPct: cs ? cs.fairwaysPct : null,
      girPct: cs ? cs.girPct : null,
      approachDispersionYds: lateralDispersion(ALL_SHOTS, '7i'),
      scramblingPct: cs ? cs.scramblingPct : null,
      puttsPerRound: cs ? cs.puttsPerRound : null,
      scoringAvg: cs ? cs.scoringAvg : null,
    };
  }, []);

  const cmp = profile.comparisonHandicap;
  const target = profile.goals.targetHandicap;
  const cmpProfile = useMemo(() => handicapProfile(cmp), [cmp]);
  const targetProfile = useMemo(() => handicapProfile(target), [target]);

  // How many areas am I ahead of my comparison level on?
  const { ahead, scored } = useMemo(() => {
    let a = 0, n = 0;
    for (const m of BENCH_METRICS) {
      const v = me[m.key];
      if (v == null) continue;
      n++;
      const r = m.goodDir === 'up' ? v / cmpProfile[m.key] : cmpProfile[m.key] / v;
      if (r >= 1) a++;
    }
    return { ahead: a, scored: n };
  }, [me, cmpProfile]);

  const accuracy = BENCH_METRICS.filter((m) => m.group === 'accuracy');
  const rest = BENCH_METRICS.filter((m) => m.group !== 'accuracy');

  return (
    <>
      {/* Controls */}
      <section className="bg-white rounded-2xl border border-border-subtle shadow-sm p-6 mb-8">
        <h2 className="type-h2 text-text-primary mb-1">Set your bar</h2>
        <p className="type-body-sm text-text-secondary mb-5">
          Tell us your handicap, who to measure you against, and the level you're
          chasing. Everything below — and your comparisons across the app — follows this.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <NumberField
            label="My handicap"
            value={profile.handicap}
            step={0.1}
            onChange={(v) => onChange({ ...profile, handicap: v })}
            hint="Your current handicap index."
          />
          <NumberField
            label="Compare me against"
            value={cmp}
            step={1}
            onChange={(v) => onChange({ ...profile, comparisonHandicap: v })}
            hint="A typical player off this handicap."
          />
          <NumberField
            label="Goal handicap"
            value={target}
            step={0.1}
            onChange={(v) => onChange({ ...profile, goals: { ...profile.goals, targetHandicap: v } })}
            hint="The level you're working toward."
          />
        </div>
      </section>

      {/* You vs your level */}
      <section className="bg-white rounded-2xl border border-border-subtle shadow-sm p-6 mb-8">
        <div className="flex items-start justify-between gap-4 mb-1">
          <h2 className="type-h2 text-text-primary">
            You vs a typical {cmp}-handicap
          </h2>
          {scored > 0 && (
            <span className={clsx(
              'shrink-0 text-xs font-bold px-2.5 py-1 rounded-pill',
              ahead >= scored - ahead ? 'bg-sport-golf/15 text-sport-golf-700' : 'bg-warning-bg text-warning',
            )}>
              Ahead in {ahead} of {scored}
            </span>
          )}
        </div>
        <p className="type-body-sm text-text-secondary mb-5 max-w-prose">
          Your real numbers against the average for that handicap. Accuracy comes
          first — it&apos;s what separates handicaps far more than distance.
        </p>

        <GroupHeading icon="badge-check" title="Accuracy" caption="Where handicaps are really made" />
        <div className="mb-6">
          {accuracy.map((m) => (
            <CompareRow key={m.key} m={m} your={me[m.key] ?? null} benchmark={cmpProfile[m.key]} refHcp={cmp} />
          ))}
        </div>

        <GroupHeading icon="chart-bar" title="Distance & scoring" />
        <div>
          {rest.map((m) => (
            <CompareRow key={m.key} m={m} your={me[m.key] ?? null} benchmark={cmpProfile[m.key]} refHcp={cmp} />
          ))}
        </div>
      </section>

      {/* Path to goal */}
      <section className="bg-white rounded-2xl border border-border-subtle shadow-sm p-6 mb-8">
        <h2 className="type-h2 text-text-primary mb-1">Your path to a {target}-handicap</h2>
        <p className="type-body-sm text-text-secondary mb-5 max-w-prose">
          What a typical {target}-handicap does — and exactly where you need to
          close the gap to get there. Anything green you&apos;re already at goal level.
        </p>
        <div>
          {BENCH_METRICS.map((m) => (
            <CompareRow key={m.key} m={m} your={me[m.key] ?? null} benchmark={targetProfile[m.key]} refHcp={target} pathMode />
          ))}
        </div>
      </section>
    </>
  );
}

function GroupHeading({ icon, title, caption }: { icon: StrokeIconName; title: string; caption?: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <Icon name={icon} size={15} className="text-rap-red" />
      <span className="type-label-sm text-text-primary tracking-caps font-bold">{title}</span>
      {caption && <span className="text-xs text-text-tertiary">· {caption}</span>}
    </div>
  );
}

function fmt(m: BenchMetric, v: number | null): string {
  if (v == null) return '—';
  const n = v.toFixed(m.decimals);
  return m.unit === '%' ? `${n}%` : m.unit ? `${n} ${m.unit}` : n;
}

function CompareRow({
  m, your, benchmark, refHcp, pathMode = false,
}: {
  m: BenchMetric;
  your: number | null;
  benchmark: number;
  refHcp: number;
  pathMode?: boolean;
}) {
  const has = your != null;
  // ratio >= 1 means at/above the reference (good), normalised for direction.
  const ratio = has ? (m.goodDir === 'up' ? your! / benchmark : benchmark / your!) : 0;
  const ahead = ratio >= 1.005;
  const level = ratio >= 0.995 && ratio < 1.005;
  const tone = !has ? 'none' : ahead || level ? 'good' : 'bad';

  const TICK = (1 / 1.3) * 100; // typical sits here; past it = better
  const fill = has ? Math.max(4, (Math.min(1.3, ratio) / 1.3) * 100) : 0;
  const delta = has ? Math.abs(your! - benchmark) : 0;

  const pill = !has
    ? { text: 'No round data yet', cls: 'bg-neutral-100 text-text-tertiary' }
    : level
    ? { text: 'On level', cls: 'bg-neutral-100 text-text-secondary' }
    : pathMode
    ? ahead
      ? { text: 'At goal', cls: 'bg-sport-golf/15 text-sport-golf-700' }
      : { text: `${fmt(m, delta)} to go`, cls: 'bg-warning-bg text-warning' }
    : ahead
    ? { text: `Ahead by ${fmt(m, delta)}`, cls: 'bg-sport-golf/15 text-sport-golf-700' }
    : { text: `Behind by ${fmt(m, delta)}`, cls: 'bg-warning-bg text-warning' };

  return (
    <div className="py-2.5 border-b border-border-subtle last:border-0">
      <div className="flex items-center justify-between gap-3 mb-1.5">
        <span className="text-sm font-semibold text-text-primary">{m.label}</span>
        <span className={clsx('shrink-0 text-[11px] font-bold px-2 py-0.5 rounded-pill', pill.cls)}>
          {pill.text}
        </span>
      </div>
      <div className="h-2 bg-neutral-100 rounded-pill relative overflow-hidden">
        {has && (
          <div
            className={clsx('absolute top-0 bottom-0 left-0 rounded-pill', tone === 'good' ? 'bg-sport-golf' : 'bg-rap-red')}
            style={{ width: `${fill}%`, opacity: 0.9 }}
          />
        )}
        <div className="absolute top-0 bottom-0 w-px bg-neutral-500" style={{ left: `${TICK}%` }} />
      </div>
      <div className="flex items-center justify-between gap-2 mt-1 text-xs text-text-tertiary">
        <span>You: <strong className="text-text-secondary">{fmt(m, your)}</strong></span>
        <span className="text-text-tertiary/80">{m.note}</span>
        <span>Typical {refHcp}: <strong className="text-text-secondary">{fmt(m, benchmark)}</strong></span>
      </div>
    </div>
  );
}

function NumberField({
  label, value, onChange, step = 1, unit, hint,
}: {
  label: string; value: number; onChange: (v: number) => void;
  step?: number; unit?: string; hint?: string;
}) {
  return (
    <label className="block">
      <span className="type-label-sm text-text-tertiary tracking-caps">{label}</span>
      <div className="mt-1.5 flex items-center rounded-lg border border-border-default focus-within:border-text-primary transition-colors overflow-hidden">
        <input
          type="number"
          step={step}
          value={value}
          onChange={(e) => {
            const v = parseFloat(e.target.value);
            if (!Number.isNaN(v)) onChange(v);
          }}
          className="flex-1 min-w-0 px-3 py-2 text-sm font-semibold text-text-primary bg-transparent outline-none tabular-nums"
        />
        {unit && <span className="px-3 text-xs text-text-tertiary font-semibold uppercase">{unit}</span>}
      </div>
      {hint && <span className="block mt-1 text-xs text-text-tertiary">{hint}</span>}
    </label>
  );
}
