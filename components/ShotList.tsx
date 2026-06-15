'use client';

import { useMemo, useState } from 'react';
import clsx from 'clsx';
import Icon from './Icon';
import ClubBreakdownTable from './ClubBreakdownTable';
import { CLUBS } from '@/lib/clubs';
import type { ClubAggregate } from '@/lib/stats';
import type { Shot } from '@/lib/types';

type View = 'club' | 'sequence';

/** Shot list with a view toggle: by-club aggregates (the existing
 *  drill-down table) or chronological shot-by-shot stream. The wrapper
 *  keeps the section header + segmented control common to both.
 */
export default function ShotList({
  shots,
  byClub,
}: {
  shots: Shot[];
  byClub: ClubAggregate[];
}) {
  const [view, setView] = useState<View>('club');

  return (
    <section className="bg-white rounded-2xl border border-border-subtle shadow-sm p-6">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div>
          <h2 className="type-h2 text-text-primary">Shot List</h2>
          <p className="text-xs text-text-tertiary mt-1">
            {view === 'club'
              ? 'Tap a row to expand shot-level detail'
              : `Every shot in the order you hit them — ${shots.length} total`}
          </p>
        </div>
        <ViewToggle view={view} onChange={setView} />
      </div>

      {view === 'club' ? (
        <ClubBreakdownTable byClub={byClub} shots={shots} />
      ) : (
        <SequenceTable shots={shots} />
      )}
    </section>
  );
}

/* ────────────────────────── Toggle ────────────────────────── */

function ViewToggle({
  view,
  onChange,
}: {
  view: View;
  onChange: (v: View) => void;
}) {
  return (
    <div className="inline-flex rounded-pill bg-neutral-100 p-1">
      <ToggleButton active={view === 'club'} onClick={() => onChange('club')} icon="view-grid">
        By club
      </ToggleButton>
      <ToggleButton active={view === 'sequence'} onClick={() => onChange('sequence')} icon="view-list">
        Shot by shot
      </ToggleButton>
    </div>
  );
}

function ToggleButton({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: Parameters<typeof Icon>[0]['name'];
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        'inline-flex items-center gap-2 px-3 py-1.5 rounded-pill text-sm font-semibold transition-colors',
        active
          ? 'bg-white text-text-primary shadow-sm'
          : 'text-text-secondary hover:text-text-primary',
      )}
    >
      <Icon name={icon} size={14} />
      {children}
    </button>
  );
}

/* ──────────────────── Shot-by-shot sequence table ──────────────────── */

function SequenceTable({ shots }: { shots: Shot[] }) {
  const sorted = useMemo(
    () =>
      shots
        .slice()
        .sort((a, b) => +new Date(a.timestamp) - +new Date(b.timestamp)),
    [shots],
  );

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[780px]">
        <thead>
          <tr className="text-left border-b border-border-subtle">
            <Th>#</Th>
            <Th>Club</Th>
            <Th align="right">Carry</Th>
            <Th align="right">Total</Th>
            <Th align="right">Side</Th>
            <Th align="right">Ball Spd</Th>
            <Th align="right">Smash</Th>
            <Th align="center">Video</Th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((s, idx) => {
            const def = CLUBS[s.club];
            return (
              <tr
                key={s.id}
                className={clsx(
                  'border-b border-border-subtle transition-colors hover:bg-neutral-50',
                  s.isOutlier && 'bg-danger-bg/40 hover:bg-danger-bg/50',
                )}
              >
                <Td>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="text-text-tertiary tabular-nums">{idx + 1}</span>
                    {s.isOutlier && (
                      <span className="text-danger" title="Surprise shot">
                        <Icon name="exclamation-circle" size={14} />
                      </span>
                    )}
                  </span>
                </Td>
                <Td>
                  <span className="inline-flex items-center gap-2">
                    <span
                      className="w-7 h-7 rounded-pill flex items-center justify-center text-[10px] font-bold text-white"
                      style={{ backgroundColor: def.color }}
                    >
                      {s.club}
                    </span>
                    <span className="text-sm text-text-primary">{def.label}</span>
                  </span>
                </Td>
                <Td align="right" mono>
                  {s.carry.toFixed(1)} <Unit>yds</Unit>
                </Td>
                <Td align="right" mono>
                  {s.total.toFixed(1)} <Unit>yds</Unit>
                </Td>
                <Td align="right" mono>
                  <span className={s.sideCarry > 0 ? 'text-text-primary' : 'text-text-secondary'}>
                    {s.sideCarry > 0 ? '+' : ''}
                    {s.sideCarry.toFixed(1)}
                  </span>{' '}
                  <Unit>yds</Unit>
                </Td>
                <Td align="right" mono>
                  {s.ballSpeed.toFixed(1)} <Unit>mph</Unit>
                </Td>
                <Td align="right" mono>
                  {s.smash.toFixed(2)}
                </Td>
                <Td align="center">
                  {s.hasVideo ? (
                    <span className="inline-flex items-center justify-center w-7 h-7 rounded-pill bg-neutral-100 text-text-primary">
                      <Icon name="video-camera" size={14} />
                    </span>
                  ) : (
                    <span className="text-text-tertiary">—</span>
                  )}
                </Td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ──────────────────── Local table primitives ──────────────────── */

function Th({
  children,
  align = 'left',
}: {
  children?: React.ReactNode;
  align?: 'left' | 'right' | 'center';
}) {
  return (
    <th
      className={clsx(
        'type-label-sm text-text-secondary px-4 py-3 font-semibold',
        align === 'right' && 'text-right',
        align === 'center' && 'text-center',
      )}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  align = 'left',
  mono = false,
}: {
  children: React.ReactNode;
  align?: 'left' | 'right' | 'center';
  mono?: boolean;
}) {
  return (
    <td
      className={clsx(
        'px-4 py-3 text-sm text-text-primary',
        align === 'right' && 'text-right',
        align === 'center' && 'text-center',
        mono && 'font-mono',
      )}
    >
      {children}
    </td>
  );
}

function Unit({ children }: { children: React.ReactNode }) {
  return <span className="text-text-tertiary text-xs ml-0.5">{children}</span>;
}
