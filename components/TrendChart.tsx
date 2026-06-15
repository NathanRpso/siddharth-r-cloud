'use client';

import { useMemo, useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from 'recharts';
import clsx from 'clsx';
import { weeklyTrend } from '@/lib/stats';
import type { Shot } from '@/lib/types';

type MetricKey = 'carry' | 'ballSpeed' | 'clubSpeed' | 'smash';
const METRICS: { key: MetricKey; label: string; unit: string; format: (n: number) => string }[] = [
  { key: 'carry',     label: 'Carry',        unit: 'yds', format: (n) => n.toFixed(0) },
  { key: 'smash',     label: 'Smash factor', unit: '',    format: (n) => n.toFixed(2) },
  { key: 'ballSpeed', label: 'Ball Speed',   unit: 'mph', format: (n) => n.toFixed(0) },
  { key: 'clubSpeed', label: 'Club Speed',   unit: 'mph', format: (n) => n.toFixed(0) },
];

type RangeKey = '3m' | '6m' | '1y';
const RANGES: { key: RangeKey; label: string; weeks: number; tickInterval: number }[] = [
  { key: '3m', label: '3 months', weeks: 12, tickInterval: 0 },
  { key: '6m', label: '6 months', weeks: 26, tickInterval: 2 },
  { key: '1y', label: '1 year',   weeks: 52, tickInterval: 4 },
];

interface Props {
  shots: Shot[];
  /** Optional initial metric. */
  initial?: MetricKey;
  /** Initial range key. */
  initialRange?: RangeKey;
  /** Title slot. */
  title?: string;
}

export default function TrendChart({ shots, initial = 'carry', initialRange = '3m', title }: Props) {
  const [metric, setMetric] = useState<MetricKey>(initial);
  const [rangeKey, setRangeKey] = useState<RangeKey>(initialRange);
  const range = RANGES.find((r) => r.key === rangeKey)!;

  const data = useMemo(() => {
    return weeklyTrend(shots, metric, range.weeks).map((b) => ({
      label: b.label,
      avg: b.avg ?? null,
      count: b.count,
    }));
  }, [shots, metric, range.weeks]);

  const meta = METRICS.find((m) => m.key === metric)!;

  const values = data.map((d) => d.avg).filter((v): v is number => v !== null);
  const min = values.length ? Math.min(...values) : 0;
  const max = values.length ? Math.max(...values) : 1;
  const pad = (max - min) * 0.15 || 1;
  const yMin = Math.max(0, min - pad);
  const yMax = max + pad;

  // Average baseline across the window — drawn as a reference line.
  const baseline = values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;

  return (
    <div>
      {/* Metric + range toggles */}
      <div className="flex items-center justify-between gap-4 mb-2 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          {title && (
            <span className="type-label-sm text-text-tertiary mr-3">{title}</span>
          )}
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

        {/* Range toggle — segmented control style */}
        <div className="inline-flex items-center bg-neutral-100 rounded-pill p-1">
          {RANGES.map((r) => {
            const active = r.key === rangeKey;
            return (
              <button
                key={r.key}
                onClick={() => setRangeKey(r.key)}
                className={clsx(
                  'px-3 py-1 rounded-pill text-[11px] font-semibold uppercase tracking-caps transition-colors',
                  active
                    ? 'bg-white text-text-primary shadow-sm'
                    : 'text-text-secondary hover:text-text-primary',
                )}
              >
                {r.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Period average — lives above the chart so the label can't get clipped */}
      {baseline !== null && (
        <div className="text-xs text-text-tertiary mb-3">
          {range.label} average:{' '}
          <span className="font-semibold text-text-primary">
            {meta.format(baseline)}{meta.unit ? ` ${meta.unit}` : ''}
          </span>
        </div>
      )}

      <div className="w-full h-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 12, right: 16, bottom: 8, left: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#EDEDED" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: '#5C616B' }}
              axisLine={{ stroke: '#DFDFDF' }}
              tickLine={false}
              interval={range.tickInterval}
            />
            <YAxis
              domain={[yMin, yMax]}
              tick={{ fontSize: 11, fill: '#5C616B' }}
              axisLine={false}
              tickLine={false}
              width={42}
              tickFormatter={(v) => meta.format(v)}
            />
            {baseline !== null && (
              <ReferenceLine
                y={baseline}
                stroke="#9CA3AF"
                strokeDasharray="4 4"
                strokeWidth={1}
              />
            )}
            <Tooltip content={<TrendTooltip meta={meta} />} />
            <Line
              type="monotone"
              dataKey="avg"
              stroke="#CD1B32"
              strokeWidth={3}
              dot={{ r: 3.5, fill: '#CD1B32', strokeWidth: 0 }}
              activeDot={{ r: 7, fill: '#CD1B32', stroke: 'white', strokeWidth: 2.5 }}
              connectNulls
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function TrendTooltip({ active, payload, meta }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  if (d.avg === null) {
    return (
      <div className="bg-white rounded-md border border-border-default shadow-md p-2 text-xs">
        <div className="font-semibold mb-0.5">Week of {d.label}</div>
        <div className="text-text-tertiary">No shots that week</div>
      </div>
    );
  }
  return (
    <div className="bg-white rounded-md border border-border-default shadow-md p-2 text-xs">
      <div className="font-semibold mb-1">Week of {d.label}</div>
      <div className="flex justify-between gap-3">
        <span className="text-text-tertiary">{meta.label}</span>
        <span className="font-mono text-text-primary">
          {meta.format(d.avg)} {meta.unit}
        </span>
      </div>
      <div className="flex justify-between gap-3">
        <span className="text-text-tertiary">Shots</span>
        <span className="font-mono text-text-primary">{d.count}</span>
      </div>
    </div>
  );
}
