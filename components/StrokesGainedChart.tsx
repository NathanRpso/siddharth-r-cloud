'use client';

import clsx from 'clsx';
import { CLUBS } from '@/lib/clubs';
import type { ClubId } from '@/lib/types';

interface Props {
  data: Array<{ club: ClubId; value: number }>;
}

/** Strokes gained per club — horizontal bars centred on a zero axis.
 *  Bar extends right (sport-golf) for strokes gained, left (danger) for lost. */
export default function StrokesGainedChart({ data }: Props) {
  if (!data.length) return null;
  // Symmetric x-range so the zero line stays in the middle of every row.
  const maxAbs = Math.max(...data.map((d) => Math.abs(d.value)), 1) * 1.1;

  return (
    <div className="flex flex-col gap-2.5">
      {/* Column header — Lost / 0 / Gained */}
      <div className="flex items-center gap-3 mb-1 text-[10px] uppercase tracking-caps font-bold text-text-tertiary">
        <span className="w-8" />
        <div className="flex-1 flex justify-between">
          <span>Strokes lost</span>
          <span>0</span>
          <span>Strokes gained</span>
        </div>
        <span className="w-12" />
      </div>

      {data.map((d) => {
        const def = CLUBS[d.club];
        const isPositive = d.value >= 0;
        // Bar width as % of the half-track (centre to edge)
        const widthPct = (Math.abs(d.value) / maxAbs) * 50;
        const sign = isPositive ? '+' : '';

        return (
          <div key={d.club} className="flex items-center gap-3">
            <span className="w-8 text-[11px] font-bold text-text-secondary text-right uppercase tracking-caps">
              {d.club}
            </span>

            <div className="flex-1 h-7 bg-neutral-100 rounded-pill relative overflow-hidden">
              {/* Centre zero line */}
              <div
                className="absolute top-0 bottom-0 left-1/2 w-px -translate-x-1/2 bg-neutral-400"
                aria-hidden
              />
              {/* Strokes-gained / lost bar */}
              <div
                className="absolute top-1 bottom-1 rounded-sm"
                style={{
                  left: isPositive ? '50%' : `${50 - widthPct}%`,
                  width: `${widthPct}%`,
                  backgroundColor: isPositive ? '#1CB864' : '#DD393A',
                  opacity: 0.9,
                }}
                aria-hidden
              />
              {/* Faint club-coloured tint along the row for visual identity */}
              <div
                className="absolute inset-0 pointer-events-none"
                style={{ backgroundColor: def.color, opacity: 0.04 }}
                aria-hidden
              />
            </div>

            <span
              className={clsx(
                'w-12 text-sm font-mono text-right tabular-nums font-semibold',
                isPositive ? 'text-sport-golf-700' : 'text-danger',
              )}
            >
              {sign}
              {d.value.toFixed(1)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
