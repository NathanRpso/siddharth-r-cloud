'use client';

import { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import Icon from './Icon';
import { CLUBS, CLUB_ORDER } from '@/lib/clubs';
import { mean, stdDev } from '@/lib/stats';
import type { ClubId, Session, Shot } from '@/lib/types';

/* ────────────────────────────────────────────────────────────────────
   Last-30-days quick stats strip.

   Three fixed volume tiles (Shots / Sessions / Hours), one customisable
   quality tile. The 4th tile metric is user-selectable via a small picker;
   when "Club carry" is picked, a sub-row of club chips appears so the
   user can choose which club.
   ──────────────────────────────────────────────────────────────────── */

type MetricKey =
  | 'avg-carry' | 'club-carry'
  | 'smash' | 'ball-speed' | 'club-speed'
  | 'spread';

interface MetricDef {
  key: MetricKey;
  label: string;
  unit: string;
  format: (n: number) => string;
  /** Direction that signals improvement. */
  tone: 'up-good' | 'down-good';
}

const METRICS: MetricDef[] = [
  { key: 'avg-carry',  label: 'Carry',      unit: 'yds', format: (n) => n.toFixed(0), tone: 'up-good' },
  { key: 'club-carry', label: 'Club carry', unit: 'yds', format: (n) => n.toFixed(0), tone: 'up-good' },
  { key: 'smash',      label: 'Smash factor', unit: '',  format: (n) => n.toFixed(2), tone: 'up-good' },
  { key: 'ball-speed', label: 'Ball speed', unit: 'mph', format: (n) => n.toFixed(0), tone: 'up-good' },
  { key: 'club-speed', label: 'Club speed', unit: 'mph', format: (n) => n.toFixed(0), tone: 'up-good' },
  { key: 'spread',     label: 'Spread',     unit: 'yds', format: (n) => n.toFixed(0), tone: 'down-good' },
];

function computeWindow(shots: Shot[], metric: MetricKey, club: ClubId) {
  const now = Date.now();
  const cut30 = now - 30 * 86_400_000;
  const cut60 = now - 60 * 86_400_000;

  const scoped = metric === 'club-carry' ? shots.filter((s) => s.club === club) : shots;
  const currentShots = scoped.filter((s) => new Date(s.timestamp).getTime() >= cut30);
  const priorShots = scoped.filter((s) => {
    const t = new Date(s.timestamp).getTime();
    return t >= cut60 && t < cut30;
  });

  function value(arr: Shot[]): number | null {
    if (!arr.length) return null;
    switch (metric) {
      case 'avg-carry':
      case 'club-carry':
        return mean(arr.map((s) => s.carry));
      case 'smash':
        return mean(arr.map((s) => s.smash));
      case 'ball-speed':
        return mean(arr.map((s) => s.ballSpeed));
      case 'club-speed':
        return mean(arr.map((s) => s.clubSpeed));
      case 'spread':
        return arr.length >= 2 ? stdDev(arr.map((s) => s.sideCarry)) : null;
    }
  }

  const current = value(currentShots);
  const prior = value(priorShots);
  return {
    current,
    prior,
    delta: current !== null && prior !== null ? current - prior : null,
  };
}

export default function QuickStatsStrip({
  shots, sessions,
}: { shots: Shot[]; sessions: Session[] }) {
  const [metric, setMetric] = useState<MetricKey>('avg-carry');
  const [club, setClub] = useState<ClubId>('Dr');

  // Static volume tiles ------------------------------------------------
  const now = Date.now();
  const cut30 = now - 30 * 86_400_000;
  const cut60 = now - 60 * 86_400_000;

  const last30Shots = shots.filter((s) => new Date(s.timestamp).getTime() >= cut30);
  const prior30Shots = shots.filter((s) => {
    const t = new Date(s.timestamp).getTime();
    return t >= cut60 && t < cut30;
  });
  const last30Sessions = sessions.filter((s) => new Date(s.date).getTime() >= cut30);
  const prior30Sessions = sessions.filter((s) => {
    const t = new Date(s.date).getTime();
    return t >= cut60 && t < cut30;
  });
  const hoursLast30 = last30Sessions.reduce((t, s) => t + s.shots.length / 30, 0);
  const hoursPrior30 = prior30Sessions.reduce((t, s) => t + s.shots.length / 30, 0);

  // Customisable tile --------------------------------------------------
  const metricDef = METRICS.find((m) => m.key === metric)!;
  const win = computeWindow(shots, metric, club);
  const availableClubs = CLUB_ORDER.filter((c) => shots.some((s) => s.club === c));
  const tileLabel = metric === 'club-carry' ? `${club} carry` : metricDef.label;

  return (
    <section className="mb-10">
      <h2 className="type-label-sm text-text-tertiary tracking-caps mb-3">
        Last 30 days
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <QuickStat
          label="Shots"
          value={String(last30Shots.length)}
          delta={last30Shots.length - prior30Shots.length}
          format={(n) => String(Math.round(n))}
        />
        <QuickStat
          label="Sessions"
          value={String(last30Sessions.length)}
          delta={last30Sessions.length - prior30Sessions.length}
          format={(n) => String(Math.round(n))}
        />
        <QuickStat
          label="Hours practiced"
          value={hoursLast30.toFixed(1)}
          delta={hoursLast30 - hoursPrior30}
          format={(n) => n.toFixed(1)}
        />
        <QuickStat
          label={tileLabel}
          value={win.current !== null ? metricDef.format(win.current) : '—'}
          unit={metricDef.unit}
          delta={win.delta}
          format={metricDef.format}
          qualitativeTone={metricDef.tone}
          picker={
            <MetricPicker
              metric={metric}
              club={club}
              availableClubs={availableClubs}
              onChange={(m, c) => {
                setMetric(m);
                if (c) setClub(c);
              }}
            />
          }
        />
      </div>
    </section>
  );
}

/* ──────────────────────────── Tile ────────────────────────────── */

/** Singular form of plural-by-default unit strings, used only when the
 *  formatted magnitude reads as exactly 1. "1 yd" vs "4 yds". */
function pluraliseUnit(unit: string, formattedMagnitude: string): string {
  const isOne = /^1(\.0+)?$/.test(formattedMagnitude);
  if (!isOne) return unit;
  if (unit === 'yds') return 'yd';
  if (unit === 'hrs') return 'hr';
  return unit;  // mph stays mph; smash has no unit
}

function QuickStat({
  label, value, delta, format, unit, qualitativeTone, picker,
}: {
  label: string;
  value: string;
  delta: number | null;
  format: (n: number) => string;
  unit?: string;
  qualitativeTone?: 'up-good' | 'down-good';
  picker?: React.ReactNode;
}) {
  // Use the formatter itself to decide direction — if |delta| rounds to "0"
  // at the display precision, render "no change" rather than "↓ 0" / "↑ 0".
  const formattedAbs = delta !== null ? format(Math.abs(delta)) : '';
  const roundsToZero = /^-?0(\.0+)?$/.test(formattedAbs);
  const direction =
    delta === null ? 'none'
    : roundsToZero ? 'flat'
    : delta > 0 ? 'up'
    : 'down';

  let deltaColor = 'text-text-tertiary';
  if (qualitativeTone === 'up-good') {
    if (direction === 'up')   deltaColor = 'text-sport-golf-700';
    if (direction === 'down') deltaColor = 'text-danger';
  } else if (qualitativeTone === 'down-good') {
    if (direction === 'down') deltaColor = 'text-sport-golf-700';
    if (direction === 'up')   deltaColor = 'text-danger';
  }

  return (
    <div className="relative bg-white rounded-2xl border border-border-subtle shadow-sm px-5 py-4">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="type-label-sm text-text-tertiary tracking-caps">{label}</div>
        {picker}
      </div>
      {/* Primary number — sized as large as reasonable, responsive across breakpoints */}
      <div className="flex items-baseline gap-1.5 flex-wrap">
        <span className="font-display italic font-extrabold uppercase tracking-tight leading-none text-text-primary text-[32px] sm:text-[36px] lg:text-[44px] xl:text-[52px]">
          {value}
        </span>
        {unit && (
          <span className="text-xs sm:text-sm text-text-tertiary font-semibold uppercase tracking-caps">
            {unit}
          </span>
        )}
      </div>
      {/* Delta on its own line beneath. When prior data is missing we still
          render a quiet placeholder so users aren't left wondering why the
          delta is invisible for some clubs. */}
      <div className={clsx('flex items-center gap-1 mt-2 text-sm sm:text-base', deltaColor)}>
        {direction === 'none' ? (
          <span className="text-text-tertiary">No prior data</span>
        ) : direction === 'flat' ? (
          <span className="text-text-tertiary">no change</span>
        ) : (
          <>
            {direction === 'up'   && <Icon name="arrow-up"   size={14} />}
            {direction === 'down' && <Icon name="arrow-down" size={14} />}
            {delta !== null && (
              <>
                <span className="font-semibold">{format(Math.abs(delta))}</span>
                {unit && (
                  <span className="font-normal text-text-tertiary">
                    {pluraliseUnit(unit, format(Math.abs(delta)))}
                  </span>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────── Metric picker ─────────────────────────── */

function MetricPicker({
  metric, club, availableClubs, onChange,
}: {
  metric: MetricKey;
  club: ClubId;
  availableClubs: ClubId[];
  onChange: (m: MetricKey, c?: ClubId) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Change metric"
        className={clsx(
          'w-6 h-6 rounded-pill flex items-center justify-center transition-colors',
          open
            ? 'text-text-primary bg-neutral-100'
            : 'text-text-tertiary hover:text-text-primary hover:bg-neutral-100',
        )}
      >
        <Icon name="chevron-down" size={14} />
      </button>
      {open && (
        <div className="absolute right-0 top-7 z-20 w-64 bg-white rounded-lg border border-border-default shadow-lg p-2">
          <div className="type-label-sm text-text-tertiary tracking-caps px-2 pt-1 pb-2">
            Show as
          </div>
          {/* Stays open while the user toggles between options — close via
              the Confirm button below, click-outside, Esc, or the chevron. */}
          {METRICS.map((m) => {
            const active = m.key === metric;
            if (m.key === 'club-carry') {
              return (
                <ClubCarryRow
                  key={m.key}
                  active={active}
                  club={club}
                  availableClubs={availableClubs}
                  onSelect={(c) => onChange('club-carry', c)}
                />
              );
            }
            return (
              <button
                key={m.key}
                onClick={() => onChange(m.key, club)}
                className={clsx(
                  'w-full flex items-center gap-2.5 px-2 py-1.5 rounded-md text-left text-sm transition-colors',
                  active
                    ? 'bg-neutral-100 text-text-primary font-semibold'
                    : 'text-text-secondary hover:bg-neutral-50 hover:text-text-primary',
                )}
              >
                <span
                  className={clsx(
                    'w-3.5 h-3.5 rounded-pill border-2 flex-shrink-0',
                    active ? 'border-rap-red bg-rap-red' : 'border-border-default',
                  )}
                />
                {m.label}
              </button>
            );
          })}

          {/* Confirm — explicit "I'm done" affordance. Functionally identical
              to clicking outside, but more discoverable. */}
          <div className="mt-2 pt-2 border-t border-border-subtle">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="w-full px-4 py-2 rounded-md bg-rap-red text-white text-xs font-semibold uppercase tracking-cta hover:bg-rap-red-hover transition-colors"
            >
              Confirm
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/** The "X carry" row — radio for the metric + an inline club dropdown.
 *  Outer row click sets metric=club-carry with the current club.
 *  The inline `[Dr ▼]` button opens a small list of clubs; picking one
 *  selects the metric AND updates the club. The parent dropdown stays
 *  open throughout so the user can keep toggling. */
function ClubCarryRow({
  active, club, availableClubs, onSelect,
}: {
  active: boolean;
  club: ClubId;
  availableClubs: ClubId[];
  onSelect: (club: ClubId) => void;
}) {
  const [clubOpen, setClubOpen] = useState(false);
  const inlineRef = useRef<HTMLSpanElement>(null);
  const def = CLUBS[club];

  // Click anywhere outside the inline dropdown closes it — without
  // stopping propagation, so the outside click also fires its normal
  // handler (e.g. picking another metric in the parent dropdown).
  useEffect(() => {
    if (!clubOpen) return;
    function onDown(e: MouseEvent) {
      if (inlineRef.current && !inlineRef.current.contains(e.target as Node)) {
        setClubOpen(false);
      }
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [clubOpen]);

  return (
    <div
      onClick={() => onSelect(club)}
      className={clsx(
        'w-full flex items-center gap-2.5 px-2 py-1.5 rounded-md text-left text-sm transition-colors cursor-pointer',
        active
          ? 'bg-neutral-100 text-text-primary font-semibold'
          : 'text-text-secondary hover:bg-neutral-50 hover:text-text-primary',
      )}
    >
      <span
        className={clsx(
          'w-3.5 h-3.5 rounded-pill border-2 flex-shrink-0',
          active ? 'border-rap-red bg-rap-red' : 'border-border-default',
        )}
      />
      <span className="inline-flex items-center gap-1.5">
        <span ref={inlineRef} className="relative inline-flex">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setClubOpen((o) => !o);
            }}
            className="inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded-sm bg-neutral-200 text-text-primary hover:bg-neutral-300 transition-colors font-semibold"
          >
            <span
              className="w-2 h-2 rounded-pill flex-shrink-0"
              style={{ backgroundColor: def.color }}
              aria-hidden
            />
            {club}
            <Icon name="chevron-down" size={12} />
          </button>
          {clubOpen && (
            <div className="absolute left-0 top-full mt-1 z-30 w-32 bg-white rounded-md border border-border-default shadow-lg p-1 max-h-56 overflow-y-auto">
              {availableClubs.map((c) => {
                const isActive = c === club;
                const cDef = CLUBS[c];
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelect(c);
                      setClubOpen(false);
                    }}
                    className={clsx(
                      'w-full flex items-center gap-2 px-2 py-1 rounded-sm text-left text-sm transition-colors',
                      isActive
                        ? 'bg-neutral-100 text-text-primary font-semibold'
                        : 'text-text-secondary hover:bg-neutral-50 hover:text-text-primary',
                    )}
                  >
                    <span
                      className="w-2 h-2 rounded-pill flex-shrink-0"
                      style={{ backgroundColor: cDef.color }}
                    />
                    {c}
                  </button>
                );
              })}
            </div>
          )}
        </span>
        <span>carry</span>
      </span>
    </div>
  );
}
