'use client';

import clsx from 'clsx';
import { CLUBS } from '@/lib/clubs';
import {
  WEDGE_IDS,
  WEDGE_TARGETS,
  wedgeMatrix,
  wedgeMatrixHeadline,
  type WedgeCell,
} from '@/lib/wedgeMatrix';
import type { Shot } from '@/lib/types';

interface Props {
  shots: Shot[];
}

/**
 * Wedge yardage matrix. For each wedge × stock distance (50/75/100 yds)
 * we show the average carry, the offset vs target, and a tightness tone.
 * The headline line above the grid surfaces the worst cell so a golfer
 * knows where to spend the next bucket of balls.
 */
export default function WedgeMatrix({ shots }: Props) {
  const matrix = wedgeMatrix(shots);
  const headline = wedgeMatrixHeadline(matrix);
  const anyData = matrix.some((row) => row.some((c) => c.tone !== 'empty'));

  return (
    <section className="rcl-card bg-white rounded-2xl border border-border-subtle shadow-sm p-6 mb-8">
      <div className="flex items-baseline justify-between mb-1">
        <h2 className="type-h2 text-text-primary">Wedge yardage matrix</h2>
        <span className="text-xs text-text-tertiary">±5 yds is the stock window</span>
      </div>
      <p className="type-body-sm text-text-secondary mb-5 max-w-prose">
        How repeatable each wedge is at each scoring-zone distance. Green
        cells are stock — you can call them on the course.
      </p>

      {headline && anyData && (
        <p className="type-body text-text-primary font-semibold mb-5 leading-snug">
          {headline}
        </p>
      )}

      <div className="overflow-x-auto -mx-2 px-2">
        <table className="w-full min-w-[420px] border-separate border-spacing-0">
          <thead>
            <tr>
              <th className="text-left text-[11px] uppercase tracking-caps text-text-tertiary font-bold pb-2 pr-3">
                Club
              </th>
              {WEDGE_TARGETS.map((t) => (
                <th
                  key={t}
                  className="text-center text-[11px] uppercase tracking-caps text-text-tertiary font-bold pb-2 px-2"
                >
                  {t} yds
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {WEDGE_IDS.map((club, i) => (
              <tr key={club} className={i === 0 ? '' : ''}>
                <td className="py-1.5 pr-3">
                  <span className="inline-flex items-center gap-2">
                    <span
                      className="w-7 h-7 rounded-pill flex items-center justify-center text-[11px] font-bold text-white"
                      style={{ backgroundColor: CLUBS[club].color }}
                    >
                      {club}
                    </span>
                    <span className="text-sm font-semibold text-text-primary">
                      {CLUBS[club].label}
                    </span>
                  </span>
                </td>
                {matrix[i].map((cell) => (
                  <td key={cell.target} className="p-1.5">
                    <MatrixCell cell={cell} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!anyData && (
        <p className="text-sm text-text-secondary mt-2">
          No wedge shots logged in the scoring zone yet — hit a few from 50, 75 and 100 yds and this will fill in.
        </p>
      )}
    </section>
  );
}

function MatrixCell({ cell }: { cell: WedgeCell }) {
  if (cell.tone === 'empty') {
    return (
      <div className="h-[68px] rounded-lg border border-dashed border-border-subtle flex items-center justify-center text-[11px] text-text-tertiary">
        —
      </div>
    );
  }
  const biasStr = cell.bias > 0 ? `+${cell.bias.toFixed(0)}` : cell.bias.toFixed(0);
  const pct = Math.round(cell.windowPct * 100);
  return (
    <div
      className={clsx(
        'h-[68px] rounded-lg border px-2 py-1.5 flex flex-col justify-between',
        cell.tone === 'positive' && 'bg-sport-golf/10 border-sport-golf/30',
        cell.tone === 'neutral'  && 'bg-neutral-50    border-border-subtle',
        cell.tone === 'warn'     && 'bg-warning-bg/40 border-warning/30',
      )}
      title={`${cell.count} shots · avg carry ${cell.avgCarry.toFixed(0)} yds · ±${cell.sd.toFixed(0)} yds spread`}
    >
      <div className="flex items-baseline justify-between">
        <span className="text-[10px] uppercase tracking-caps text-text-tertiary font-bold">
          {biasStr} yds
        </span>
        <span className="text-[10px] text-text-tertiary tabular-nums">{cell.count}</span>
      </div>
      <div className="flex items-baseline justify-between">
        <span className="text-base font-bold tabular-nums text-text-primary">
          {pct}<span className="text-[11px] text-text-tertiary font-semibold">%</span>
        </span>
        <span className="text-[10px] text-text-tertiary">stock</span>
      </div>
    </div>
  );
}
