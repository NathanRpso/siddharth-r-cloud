'use client';

import clsx from 'clsx';
import Icon from './Icon';
import type { ClubAccuracy } from '@/lib/stats';

interface Props {
  data: ClubAccuracy[];
}

/** Per-club L/C/R tendency heat-strip — three cells per row.
 *  Each cell has a coloured fill at the bottom whose height = % of shots
 *  in that direction. Centre = sport-golf (good); left/right = danger
 *  (miss). Arrow icon centred in each cell for direction. */
export default function AccuracyHeatStrip({ data }: Props) {
  if (!data.length) return null;

  return (
    <div className="flex flex-col gap-2">
      {/* Column header — direction labels */}
      <div className="flex items-center gap-3 mb-1">
        <span className="w-8" />
        <div className="flex-1 grid grid-cols-3 gap-1.5 text-[10px] uppercase tracking-caps font-bold text-text-tertiary text-center">
          <span>Left miss</span>
          <span>Straight</span>
          <span>Right miss</span>
        </div>
        <span className="w-16 text-[10px] uppercase tracking-caps font-bold text-text-tertiary text-right">
          On target
        </span>
      </div>

      {data.map((row) => (
        <div key={row.club} className="flex items-center gap-3">
          <span className="w-8 text-[11px] font-bold text-text-secondary text-right uppercase tracking-caps">
            {row.club}
          </span>
          <div className="flex-1 grid grid-cols-3 gap-1.5">
            <DirectionCell direction="left"   pct={row.leftPct} />
            <DirectionCell direction="center" pct={row.centerPct} />
            <DirectionCell direction="right"  pct={row.rightPct} />
          </div>
          <span
            className={clsx(
              'w-16 text-sm font-mono text-right tabular-nums font-semibold',
              row.centerPct >= 0.6
                ? 'text-sport-golf-700'
                : row.centerPct >= 0.4
                ? 'text-text-primary'
                : 'text-warning',
            )}
          >
            {(row.centerPct * 100).toFixed(0)}%
          </span>
        </div>
      ))}
    </div>
  );
}

function DirectionCell({
  direction, pct,
}: {
  direction: 'left' | 'center' | 'right';
  pct: number;
}) {
  const isCenter = direction === 'center';
  const fillColor = isCenter ? '#1CB864' : '#DD393A';
  // Minimum 6% so something is always visible even when % is tiny.
  const fillHeightPct = Math.max(6, pct * 100);

  return (
    <div className="relative h-11 bg-neutral-100 rounded-sm overflow-hidden">
      {/* Bottom-anchored fill — height = % of shots in this direction */}
      <div
        className="absolute bottom-0 left-0 right-0"
        style={{ height: `${fillHeightPct}%`, backgroundColor: fillColor, opacity: 0.85 }}
        aria-hidden
      />
      {/* Direction arrow + magnitude label, always centred */}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5 text-text-primary">
        <span className={clsx(
          'block',
          pct >= 0.35 ? 'text-white' : 'text-text-primary',
        )}>
          <Icon
            name={
              direction === 'left'   ? 'arrow-left'  :
              direction === 'center' ? 'arrow-up'    :
                                       'arrow-right'
            }
            size={14}
          />
        </span>
        <span className={clsx(
          'text-[10px] font-bold tabular-nums leading-none',
          pct >= 0.35 ? 'text-white' : 'text-text-secondary',
        )}>
          {(pct * 100).toFixed(0)}%
        </span>
      </div>
    </div>
  );
}
