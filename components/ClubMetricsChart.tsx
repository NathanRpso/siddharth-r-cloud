'use client';

import { useMemo, useState } from 'react';
import clsx from 'clsx';
import { aggregateByClub } from '@/lib/stats';
import { CLUBS, CLUB_AVERAGES, CLUB_ORDER } from '@/lib/clubs';
import type { Shot, ClubId } from '@/lib/types';

type MetricKey = 'carry' | 'ballSpeed' | 'clubSpeed' | 'smash' | 'launch' | 'spin';

interface MetricDef {
  key: MetricKey;
  label: string;
  unit: string;
  format: (n: number) => string;
  /** True when more is better (carry, speed, smash). False for bidirectional (launch, spin). */
  higherBetter: boolean;
}

const METRICS: MetricDef[] = [
  { key: 'carry',     label: 'Carry',         unit: 'yds', format: (n) => n.toFixed(0),         higherBetter: true  },
  { key: 'ballSpeed', label: 'Ball speed',    unit: 'mph', format: (n) => n.toFixed(1),         higherBetter: true  },
  { key: 'clubSpeed', label: 'Swing speed',   unit: 'mph', format: (n) => n.toFixed(1),         higherBetter: true  },
  { key: 'smash',     label: 'Smash factor',  unit: '',    format: (n) => n.toFixed(2),         higherBetter: true  },
  { key: 'launch',    label: 'Launch angle',  unit: '°',   format: (n) => n.toFixed(1),         higherBetter: false },
  { key: 'spin',      label: 'Spin rate',     unit: 'rpm', format: (n) => Math.round(n).toString(), higherBetter: false },
];

function valueFor(agg: ReturnType<typeof aggregateByClub>[number], m: MetricKey): number {
  switch (m) {
    case 'carry':     return agg.avgCarry;
    case 'ballSpeed': return agg.avgBallSpeed;
    case 'clubSpeed': return agg.avgClubSpeed;
    case 'smash':     return agg.avgSmash;
    case 'launch':    return agg.avgLaunch;
    case 'spin':      return agg.avgSpin;
  }
}

function expectedFor(club: ClubId, m: MetricKey): number {
  const e = CLUB_AVERAGES[club];
  switch (m) {
    case 'carry':     return e.carry;
    case 'ballSpeed': return e.ballSpeed;
    case 'clubSpeed': return e.clubSpeed;
    case 'smash':     return e.smash;
    case 'launch':    return e.launch;
    case 'spin':      return e.spin;
  }
}

/** Status of a club's value vs expected for that club+metric combo.
 *  - 'good':  on or above expected (higher-better) / within band (bidirectional)
 *  - 'low':   significantly below expected (higher-better)
 *  - 'off':   significantly outside band in either direction (bidirectional) */
type Status = 'good' | 'low' | 'off';

function statusFor(value: number, expected: number, m: MetricDef): Status {
  const deviation = (value - expected) / expected;
  if (m.higherBetter) {
    return deviation < -0.1 ? 'low' : 'good';
  }
  return Math.abs(deviation) > 0.18 ? 'off' : 'good';
}

const STATUS_COLOR: Record<Status, string> = {
  good: '#1CB864',  // sport-golf-600
  low:  '#DD393A',  // danger
  off:  '#F59E0B',  // warning amber — out-of-band but not strictly bad
};

interface Props {
  shots: Shot[];
}

export default function ClubMetricsChart({ shots }: Props) {
  const [metric, setMetric] = useState<MetricKey>('clubSpeed');
  const meta = METRICS.find((m) => m.key === metric)!;

  const rows = useMemo(() => {
    const byClub = aggregateByClub(shots);
    return CLUB_ORDER
      .map((club) => byClub.find((c) => c.club === club))
      .filter((c): c is NonNullable<typeof c> => !!c && c.count >= 5)
      .map((agg) => {
        const value = valueFor(agg, metric);
        const expected = expectedFor(agg.club, metric);
        return {
          club: agg.club,
          value,
          expected,
          status: statusFor(value, expected, meta),
          count: agg.count,
        };
      });
  }, [shots, metric, meta]);

  const maxValue = useMemo(() => Math.max(...rows.map((r) => r.value), 1) * 1.05, [rows]);

  return (
    <div>
      {/* Metric picker — pill toggle matching TrendChart's pattern */}
      <div className="flex items-center gap-2 mb-5 flex-wrap">
        {METRICS.map((m) => {
          const active = m.key === metric;
          return (
            <button
              key={m.key}
              onClick={() => setMetric(m.key)}
              className={clsx(
                'px-3 py-1.5 rounded-pill text-xs font-semibold uppercase tracking-caps transition-colors',
                active
                  ? 'bg-rap-black text-white'
                  : 'bg-white border border-border-default text-text-secondary hover:text-text-primary',
              )}
            >
              {m.label}
            </button>
          );
        })}
      </div>

      <div className="flex flex-col gap-2.5">
        {rows.map((r) => {
          const def = CLUBS[r.club];
          const widthPct = (r.value / maxValue) * 100;
          return (
            <div key={r.club} className="flex items-center gap-3">
              <span className="w-8 text-[11px] font-bold text-text-secondary text-right uppercase tracking-caps">
                {r.club}
              </span>
              <div className="flex-1 h-6 bg-neutral-100 rounded-pill relative overflow-hidden">
                {/* Faint club-coloured tint along the full row (visual identity) */}
                <div
                  className="absolute inset-0"
                  style={{ backgroundColor: def.color, opacity: 0.05 }}
                  aria-hidden
                />
                {/* Status-coloured bar */}
                <div
                  className="absolute top-0 bottom-0 rounded-pill"
                  style={{
                    width: `${widthPct}%`,
                    backgroundColor: STATUS_COLOR[r.status],
                    opacity: 0.9,
                  }}
                  aria-hidden
                />
              </div>
              <span className="w-24 text-xs font-mono text-right tabular-nums">
                {meta.format(r.value)}
                {meta.unit && (
                  <span className="text-text-tertiary ml-0.5">{meta.unit}</span>
                )}
              </span>
            </div>
          );
        })}
      </div>

      {/* Legend explaining the colour code for the active metric */}
      <div className="flex items-center gap-4 mt-5 text-[11px] text-text-tertiary">
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-pill" style={{ backgroundColor: STATUS_COLOR.good }} />
          {meta.higherBetter ? 'On or above typical' : 'Within typical range'}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span
            className="w-2.5 h-2.5 rounded-pill"
            style={{ backgroundColor: meta.higherBetter ? STATUS_COLOR.low : STATUS_COLOR.off }}
          />
          {meta.higherBetter ? 'Below typical' : 'Outside typical range'}
        </span>
        <span className="ml-auto">vs typical 20-handicap baselines</span>
      </div>
    </div>
  );
}
