'use client';

import { useMemo, useRef, useState } from 'react';
import clsx from 'clsx';
import Icon from './Icon';
import type { Session } from '@/lib/types';

/* ────────────────────────────────────────────────────────────────────
   Calendar-year activity heatmap.

   GitHub-style — 7 rows × ~53 columns, each cell a day. Tile intensity
   reflects the number of sessions logged that day. Defaults to the
   current year and steps backward/forward via chevrons; the range is
   bounded by the earliest year that has data and the current year.

   Filter-aware: receives the same `sessions` array the list renders.

   Brand-red ramp — intentional DS deviation. Brand red is normally
   reserved for CTAs, but this is a marquee consumer-surface element
   where the Rapsodo identity is the point.
   ──────────────────────────────────────────────────────────────────── */

interface Cell {
  date: Date;
  /** True only for dates inside the selected calendar year. Out-of-year
   *  cells (week padding before Jan 1 / after Dec 31) are rendered
   *  transparent so the grid sits as a clean rectangle. */
  inWindow: boolean;
  /** Number of sessions logged this day. */
  sessionCount: number;
  /** Total shots across those sessions — drives intensity, since "activity"
   *  is closer to volume than session-count (a 90-shot range day reads as
   *  far more activity than an 8-shot quick check). */
  shotCount: number;
}

type Week = Cell[];

interface HoverState {
  cell: Cell;
  /** Viewport-relative rect of the hovered cell — drives tooltip position. */
  rect: DOMRect;
}

export default function CalendarHeatmap({ sessions }: { sessions: Session[] }) {
  // ───── Year bounds derived from the data ─────────────────────────
  const { earliestYear, latestYear } = useMemo(() => {
    const now = new Date();
    if (!sessions.length) {
      const y = now.getFullYear();
      return { earliestYear: y, latestYear: y };
    }
    let min = Infinity, max = -Infinity;
    for (const s of sessions) {
      const y = new Date(s.date).getFullYear();
      if (y < min) min = y;
      if (y > max) max = y;
    }
    // Always allow scrolling forward to the current year, even if it
    // has no sessions yet — the empty current-year grid is the default.
    return {
      earliestYear: Math.min(min, now.getFullYear()),
      latestYear: Math.max(max, now.getFullYear()),
    };
  }, [sessions]);

  const [selectedYear, setSelectedYear] = useState<number>(() => new Date().getFullYear());

  const { weeks, monthSpans, yearSessionCount, yearShotCount } = useMemo(
    () => buildGrid(sessions, selectedYear),
    [sessions, selectedYear],
  );

  const [hover, setHover] = useState<HoverState | null>(null);

  const canPrev = selectedYear > earliestYear;
  const canNext = selectedYear < latestYear;

  return (
    <section className="mb-4 bg-white rounded-2xl border border-border-subtle shadow-sm p-5">
      <div className="flex items-center gap-3 mb-3 flex-wrap">
        <span className="font-display italic font-extrabold uppercase tracking-tight text-2xl leading-none text-text-primary tabular-nums">
          {selectedYear}
        </span>
        <div className="flex items-center gap-1">
          <YearNavButton
            direction="prev"
            disabled={!canPrev}
            onClick={() => setSelectedYear((y) => y - 1)}
            ariaLabel={`View ${selectedYear - 1}`}
          />
          <YearNavButton
            direction="next"
            disabled={!canNext}
            onClick={() => setSelectedYear((y) => y + 1)}
            ariaLabel={`View ${selectedYear + 1}`}
          />
        </div>
        <span className="ml-auto text-xs text-text-tertiary">
          {yearSessionCount} session{yearSessionCount === 1 ? '' : 's'}
          {' | '}
          {yearShotCount.toLocaleString('en-GB')}{' '}
          {yearShotCount === 1 ? 'shot' : 'shots'}
        </span>
      </div>

      <div className="flex overflow-x-auto pb-1">
        {/* Day-of-week labels on the left (UK Mon-first). Only label every
            other row so they don't crowd the small cells. */}
        <div className="flex flex-col gap-[2px] mr-2 mt-[18px] text-[10px] text-text-tertiary leading-[12px]">
          {['Mon', '', 'Wed', '', 'Fri', '', 'Sun'].map((label, i) => (
            <div key={i} className="h-3 flex items-center">
              {label}
            </div>
          ))}
        </div>

        <div className="flex flex-col">
          {/* Month labels — one per month, anchored to the first week the
              month appears in. Overflowing text spans into following empty
              week-columns, which is what we want. */}
          <div className="flex gap-[2px] mb-1 h-4">
            {weeks.map((_, weekIdx) => {
              const span = monthSpans.find((s) => s.weekIndex === weekIdx);
              return (
                <div
                  key={weekIdx}
                  className="text-[10px] text-text-tertiary whitespace-nowrap"
                  style={{ width: 12, minWidth: 12 }}
                >
                  {span?.label ?? ''}
                </div>
              );
            })}
          </div>

          {/* The grid itself — columns of weeks, 7 rows of days. */}
          <div className="flex gap-[2px]">
            {weeks.map((week, weekIdx) => (
              <div key={weekIdx} className="flex flex-col gap-[2px]">
                {week.map((cell, dayIdx) => (
                  <DayCell
                    key={dayIdx}
                    cell={cell}
                    onEnter={(rect) => setHover({ cell, rect })}
                    onLeave={() => setHover(null)}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      {hover && <HeatmapTooltip hover={hover} />}
    </section>
  );
}

/* ─────────────────────── Year nav button ─────────────────────── */

function YearNavButton({
  direction,
  disabled,
  onClick,
  ariaLabel,
}: {
  direction: 'prev' | 'next';
  disabled: boolean;
  onClick: () => void;
  ariaLabel: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className={clsx(
        'w-7 h-7 rounded-md border flex items-center justify-center transition-colors',
        disabled
          ? 'border-border-subtle text-text-disabled cursor-not-allowed'
          : 'border-border-default text-text-secondary hover:border-neutral-400 hover:text-text-primary',
      )}
    >
      <Icon name={direction === 'prev' ? 'chevron-left' : 'chevron-right'} size={14} />
    </button>
  );
}

/* ────────────────────────── Cell ────────────────────────── */

function DayCell({
  cell,
  onEnter,
  onLeave,
}: {
  cell: Cell;
  onEnter: (rect: DOMRect) => void;
  onLeave: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  if (!cell.inWindow) {
    return <div className="w-3 h-3" aria-hidden />;
  }
  return (
    <div
      ref={ref}
      className={clsx(
        'w-3 h-3 rounded-sm transition-colors',
        intensityClass(cell.shotCount),
      )}
      onMouseEnter={() => ref.current && onEnter(ref.current.getBoundingClientRect())}
      onMouseLeave={onLeave}
      onFocus={(e) => onEnter(e.currentTarget.getBoundingClientRect())}
      onBlur={onLeave}
      tabIndex={cell.sessionCount > 0 ? 0 : -1}
      role="img"
      aria-label={formatTooltipPlain(cell)}
    />
  );
}

/** Five intensity tiers driven by daily shot volume — the closest proxy
 *  to "activity" since one big range day reads very differently from one
 *  short check-in. Thresholds are spread so:
 *  - Short check-ins (<25 shots) sit faint
 *  - Typical practices (25–55 shots) land in the lower-mid tier
 *  - Heavy single sessions (55–95) reach the mid tier
 *  - Big range days or near-doubles (95+) saturate the upper tier
 *  - Only multi-session days (140+ total shots) hit full brand red
 *  This keeps the year feeling textured rather than uniformly hot. */
function intensityClass(shots: number): string {
  if (shots === 0)   return 'bg-neutral-100';
  if (shots < 25)    return 'bg-rap-red/20';
  if (shots < 55)    return 'bg-rap-red/40';
  if (shots < 95)    return 'bg-rap-red/65';
  if (shots < 140)   return 'bg-rap-red/85';
  return 'bg-rap-red';
}

/* ────────────────────────── Tooltip ────────────────────────── */

function HeatmapTooltip({ hover }: { hover: HoverState }) {
  const { cell, rect } = hover;
  const top = rect.top - 10;
  const left = rect.left + rect.width / 2;

  return (
    <div
      role="tooltip"
      className="fixed z-50 pointer-events-none -translate-x-1/2 -translate-y-full"
      style={{ top, left }}
    >
      <div className="bg-neutral-950 text-white text-xs rounded-md shadow-md px-3 py-2 whitespace-nowrap">
        <div className="font-semibold mb-0.5">
          {cell.date.toLocaleDateString('en-GB', {
            weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
          })}
        </div>
        <div className="text-neutral-300">
          {cell.sessionCount === 0
            ? 'No sessions'
            : `${cell.sessionCount} ${cell.sessionCount === 1 ? 'session' : 'sessions'} | ${cell.shotCount} ${cell.shotCount === 1 ? 'shot' : 'shots'}`}
        </div>
      </div>
      <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-neutral-950" />
    </div>
  );
}

function formatTooltipPlain(cell: Cell): string {
  const dateLabel = cell.date.toLocaleDateString('en-GB', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  });
  if (cell.sessionCount === 0) return `${dateLabel} — no sessions`;
  const sessionWord = cell.sessionCount === 1 ? 'session' : 'sessions';
  const shotWord = cell.shotCount === 1 ? 'shot' : 'shots';
  return `${dateLabel} — ${cell.sessionCount} ${sessionWord}, ${cell.shotCount} ${shotWord}`;
}

/* ────────────────────────── Grid builder ────────────────────────── */

function buildGrid(
  sessions: Session[],
  year: number,
): {
  weeks: Week[];
  monthSpans: { weekIndex: number; label: string }[];
  yearSessionCount: number;
  yearShotCount: number;
} {
  // 1. Bucket sessions by YYYY-MM-DD for the target year only.
  const byDay = new Map<string, { sessionCount: number; shotCount: number }>();
  let yearSessionCount = 0;
  let yearShotCount = 0;
  for (const s of sessions) {
    const d = new Date(s.date);
    if (d.getFullYear() !== year) continue;
    const key = dateKey(d);
    const prev = byDay.get(key);
    if (prev) {
      prev.sessionCount++;
      prev.shotCount += s.shots.length;
    } else {
      byDay.set(key, { sessionCount: 1, shotCount: s.shots.length });
    }
    yearSessionCount++;
    yearShotCount += s.shots.length;
  }

  // 2. Determine the grid range — Jan 1 → Dec 31 of the selected year,
  //    extended to whole weeks (Mon–Sun) so columns are flush.
  const windowStart = new Date(year, 0, 1);
  const windowEnd = new Date(year, 11, 31);
  const gridStart = rollBackToMonday(windowStart);
  const gridEnd = rollForwardToSunday(windowEnd);

  // 3. Walk day by day, filling weeks.
  const weeks: Week[] = [];
  const monthSpans: { weekIndex: number; label: string }[] = [];
  const cursor = new Date(gridStart);
  let lastMonth = -1;
  while (cursor <= gridEnd) {
    const week: Week = [];
    for (let i = 0; i < 7; i++) {
      const inWindow = cursor >= windowStart && cursor <= windowEnd;
      const data = byDay.get(dateKey(cursor));
      week.push({
        date: new Date(cursor),
        inWindow,
        sessionCount: data?.sessionCount ?? 0,
        shotCount: data?.shotCount ?? 0,
      });

      // Capture the month label only when a new month starts inside the
      // window — anchored to the week-column where it appears.
      if (inWindow && cursor.getMonth() !== lastMonth) {
        monthSpans.push({
          weekIndex: weeks.length,
          label: cursor.toLocaleDateString('en-GB', { month: 'short' }),
        });
        lastMonth = cursor.getMonth();
      }
      cursor.setDate(cursor.getDate() + 1);
    }
    weeks.push(week);
  }
  return { weeks, monthSpans, yearSessionCount, yearShotCount };
}

function startOfDay(d: Date): Date {
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  return out;
}

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Roll back to the Monday on or before the given date. */
function rollBackToMonday(d: Date): Date {
  const out = startOfDay(d);
  const dow = (out.getDay() + 6) % 7;
  out.setDate(out.getDate() - dow);
  return out;
}

/** Roll forward to the Sunday on or after the given date. */
function rollForwardToSunday(d: Date): Date {
  const out = startOfDay(d);
  const dow = (out.getDay() + 6) % 7;
  out.setDate(out.getDate() + (6 - dow));
  return out;
}
