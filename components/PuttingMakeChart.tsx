'use client';

import clsx from 'clsx';
import { ratePuttBand, type PuttBand } from '@/lib/shortGame';

const FILL: Record<string, string> = {
  positive: '#1CB864',
  neutral:  '#9AA0A6',
  warn:     '#E8A23D',
  caution:  '#DD393A',
};

/** Make-rate by putt distance — horizontal bars, with a tick marking the
 *  typical-amateur make rate so a golfer sees instantly where they're better
 *  or worse than average from each distance. */
export default function PuttingMakeChart({ data }: { data: PuttBand[] }) {
  if (!data.length) return null;

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center gap-3 mb-1 text-[10px] uppercase tracking-caps font-bold text-text-tertiary">
        <span className="w-16" />
        <span className="flex-1">Make rate (tick = typical amateur)</span>
        <span className="w-20 text-right">Made / tried</span>
      </div>

      {data.map((b) => {
        const tone = ratePuttBand(b);
        const pct = Math.round(b.makePct * 100);
        const made = Math.round(b.makePct * b.attempts);
        return (
          <div key={b.band} className="flex items-center gap-3">
            <span className="w-16 text-[11px] font-bold text-text-secondary text-right uppercase tracking-caps">
              {b.band}
            </span>

            <div className="flex-1 h-7 bg-neutral-100 rounded-pill relative overflow-hidden">
              {/* Make-rate bar */}
              <div
                className="absolute top-1 bottom-1 left-0 rounded-sm"
                style={{ width: `${pct}%`, backgroundColor: FILL[tone], opacity: 0.9 }}
                aria-hidden
              />
              {/* Benchmark tick */}
              <div
                className="absolute top-0 bottom-0 w-px bg-neutral-500"
                style={{ left: `${Math.round(b.benchmark * 100)}%` }}
                aria-hidden
              />
              {/* In-bar percentage */}
              <span className="absolute inset-y-0 left-2 flex items-center text-[11px] font-bold text-white mix-blend-luminosity tabular-nums">
                {pct}%
              </span>
            </div>

            <span className="w-20 text-sm font-mono text-right tabular-nums text-text-secondary">
              {made}/{b.attempts}
            </span>
          </div>
        );
      })}
    </div>
  );
}
