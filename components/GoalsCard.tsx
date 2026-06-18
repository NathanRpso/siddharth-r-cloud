'use client';

import { useMemo, useState } from 'react';
import clsx from 'clsx';
import Icon from './Icon';
import { ALL_SHOTS } from '@/lib/mockData';
import { aggregateByClub } from '@/lib/stats';
import { SHORT_GAME_HEADLINES } from '@/lib/shortGame';
import type { GolferProfile } from '@/lib/golferProfile';

/** "Your game" — the golfer's handicap, who they're measured against, and
 *  progress toward the goals they set. Doubles as the editor for all of it
 *  (the Profile page is a separate embedded prototype), so this is the one
 *  place a golfer sets handicap + goals and watches them move. */
export default function GoalsCard({
  profile,
  onChange,
}: {
  profile: GolferProfile;
  onChange: (p: GolferProfile) => void;
}) {
  const [editing, setEditing] = useState(false);

  // Current values pulled from real data so goals track against actual play.
  const currentDriver = useMemo(() => {
    const dr = aggregateByClub(ALL_SHOTS).find((c) => c.club === 'Dr');
    return dr ? Math.round(dr.avgCarry) : 0;
  }, []);
  const currentPutts = useMemo(
    () => SHORT_GAME_HEADLINES.find((h) => h.key === 'putts')?.value ?? 0,
    [],
  );

  const goals = [
    {
      key: 'handicap',
      label: 'Handicap',
      current: profile.handicap,
      target: profile.goals.targetHandicap,
      unit: '',
      lowerIsBetter: true,
      decimals: 1,
    },
    {
      key: 'driver',
      label: 'Driver carry',
      current: currentDriver,
      target: profile.goals.driverCarry,
      unit: 'yds',
      lowerIsBetter: false,
      decimals: 0,
    },
    {
      key: 'putts',
      label: 'Putts / round',
      current: currentPutts,
      target: profile.goals.puttsPerRound,
      unit: '',
      lowerIsBetter: true,
      decimals: 1,
    },
  ];

  return (
    <section className="bg-white rounded-2xl border border-border-subtle shadow-sm p-6 mb-8">
      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <h2 className="type-h2 text-text-primary">Your game</h2>
          <p className="type-body-sm text-text-secondary mt-0.5">
            Playing off <strong className="text-text-primary">{profile.handicap}</strong>
            {' · '}compared against a typical{' '}
            <strong className="text-text-primary">{profile.comparisonHandicap}</strong>-handicap
          </p>
        </div>
        <button
          onClick={() => setEditing((v) => !v)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-pill text-xs font-semibold text-text-secondary border border-border-default hover:text-text-primary hover:border-text-primary transition-colors shrink-0"
        >
          <Icon name={editing ? 'check' : 'pencil'} size={14} />
          {editing ? 'Done' : 'Edit'}
        </button>
      </div>

      {editing ? (
        <Editor profile={profile} onChange={onChange} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {goals.map((g) => (
            <GoalProgress
              key={g.key}
              label={g.label}
              current={g.current}
              target={g.target}
              unit={g.unit}
              lowerIsBetter={g.lowerIsBetter}
              decimals={g.decimals}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function GoalProgress({
  label, current, target, unit, lowerIsBetter, decimals,
}: {
  label: string; current: number; target: number; unit: string;
  lowerIsBetter: boolean; decimals: number;
}) {
  const reached = lowerIsBetter ? current <= target : current >= target;
  // Fill = how close current is to target (capped at 100%).
  const fill = reached
    ? 1
    : lowerIsBetter
    ? Math.max(0, Math.min(1, target / current))
    : Math.max(0, Math.min(1, current / target));
  const gap = Math.abs(current - target);
  const gapLabel = reached
    ? 'Goal reached'
    : `${gap.toFixed(decimals)}${unit ? ' ' + unit : ''} to go`;

  return (
    <div>
      <div className="flex items-baseline justify-between mb-1.5">
        <span className="type-label-sm text-text-tertiary tracking-caps">{label}</span>
        <span className="text-xs text-text-tertiary">
          Goal {target}{unit ? ` ${unit}` : ''}
        </span>
      </div>
      <div className="flex items-baseline gap-1.5 mb-2">
        <span className="type-display-sm text-text-primary leading-none tabular-nums">
          {current.toFixed(decimals)}
        </span>
        {unit && (
          <span className="text-xs text-text-tertiary font-semibold uppercase tracking-caps">{unit}</span>
        )}
      </div>
      <div className="h-2 bg-neutral-100 rounded-pill overflow-hidden">
        <div
          className={clsx('h-full rounded-pill', reached ? 'bg-sport-golf' : 'bg-rap-red')}
          style={{ width: `${Math.round(fill * 100)}%` }}
        />
      </div>
      <div className={clsx('mt-1.5 text-xs font-semibold', reached ? 'text-sport-golf-700' : 'text-text-secondary')}>
        {reached && <Icon name="check" size={12} className="inline mr-1" />}
        {gapLabel}
      </div>
    </div>
  );
}

function Editor({
  profile, onChange,
}: {
  profile: GolferProfile;
  onChange: (p: GolferProfile) => void;
}) {
  const set = (patch: Partial<GolferProfile>) => onChange({ ...profile, ...patch });
  const setGoal = (patch: Partial<GolferProfile['goals']>) =>
    onChange({ ...profile, goals: { ...profile.goals, ...patch } });

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <NumberField
        label="My handicap"
        value={profile.handicap}
        step={0.1}
        onChange={(v) => set({ handicap: v })}
        hint="Stops the app assuming a 20."
      />
      <NumberField
        label="Compare me against"
        value={profile.comparisonHandicap}
        step={1}
        onChange={(v) => set({ comparisonHandicap: v })}
        hint="A typical player off this handicap."
      />
      <NumberField
        label="Target handicap"
        value={profile.goals.targetHandicap}
        step={0.1}
        onChange={(v) => setGoal({ targetHandicap: v })}
        hint="What you're playing toward."
      />
      <NumberField
        label="Driver carry goal"
        value={profile.goals.driverCarry}
        step={1}
        unit="yds"
        onChange={(v) => setGoal({ driverCarry: v })}
      />
      <NumberField
        label="Putts / round goal"
        value={profile.goals.puttsPerRound}
        step={0.5}
        onChange={(v) => setGoal({ puttsPerRound: v })}
      />
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
