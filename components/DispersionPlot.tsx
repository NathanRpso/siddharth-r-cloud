'use client';

import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import type { ClubId, Shot } from '@/lib/types';
import { CLUBS } from '@/lib/clubs';
import type { ClubAggregate } from '@/lib/stats';
import { useState } from 'react';
import clsx from 'clsx';

interface Props {
  shots: Shot[];
  byClub: ClubAggregate[];
}

interface Point {
  x: number;
  y: number;
  shot: Shot;
}

export default function DispersionPlot({ shots, byClub }: Props) {
  const [filter, setFilter] = useState<ClubId | 'all'>('all');

  const visibleClubs =
    filter === 'all' ? byClub.map((c) => c.club) : [filter];

  // X = sideCarry (− left, + right). Y = carry (downrange).
  // Compute symmetric x extent so target line stays centered.
  const sideCarries = shots.map((s) => s.sideCarry);
  const maxSide = Math.max(20, ...sideCarries.map(Math.abs)) + 5;
  const maxCarry = Math.max(...shots.map((s) => s.carry)) + 15;
  const minCarry = Math.max(0, Math.min(...shots.map((s) => s.carry)) - 15);

  const seriesByClub: Record<ClubId, Point[]> = {} as Record<ClubId, Point[]>;
  for (const s of shots) {
    if (!visibleClubs.includes(s.club)) continue;
    const arr = seriesByClub[s.club] ?? [];
    arr.push({ x: s.sideCarry, y: s.carry, shot: s });
    seriesByClub[s.club] = arr;
  }

  // Mean-point overlay series: one big dot per visible club at its avg.
  const meanPoints = byClub
    .filter((c) => visibleClubs.includes(c.club))
    .map((c) => ({
      x: c.avgSideCarry,
      y: c.avgCarry,
      club: c.club,
    }));

  return (
    <div>
      {/* Filter chips */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <button
          onClick={() => setFilter('all')}
          className={clsx(
            'px-3 py-1.5 rounded-pill text-xs font-semibold uppercase tracking-caps transition-colors',
            filter === 'all'
              ? 'bg-rap-black text-white'
              : 'bg-white border border-border-default text-text-secondary hover:text-text-primary',
          )}
        >
          All Clubs
        </button>
        {byClub.map((c) => {
          const def = CLUBS[c.club];
          const active = filter === c.club;
          return (
            <button
              key={c.club}
              onClick={() => setFilter(active ? 'all' : c.club)}
              className={clsx(
                'px-3 py-1.5 rounded-pill text-xs font-semibold uppercase tracking-caps transition-colors inline-flex items-center gap-2',
                active
                  ? 'text-white'
                  : 'bg-white border border-border-default text-text-secondary hover:text-text-primary',
              )}
              style={active ? { backgroundColor: def.color } : undefined}
            >
              <span
                className="w-2 h-2 rounded-pill"
                style={{ backgroundColor: active ? 'white' : def.color }}
              />
              {c.club}
              <span className="opacity-60 font-normal">{c.count}</span>
            </button>
          );
        })}
      </div>

      {/* Plot */}
      <div className="w-full h-[460px]">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 16, right: 24, bottom: 32, left: 24 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#EDEDED" />
            <XAxis
              type="number"
              dataKey="x"
              domain={[-maxSide, maxSide]}
              tick={{ fontSize: 12, fill: '#5C616B' }}
              tickFormatter={(v) =>
                v === 0 ? '0' : v > 0 ? `+${v}` : `${v}`
              }
              label={{
                value: 'Side Carry (yds)',
                position: 'bottom',
                offset: 16,
                fill: '#5C616B',
                fontSize: 12,
              }}
            />
            <YAxis
              type="number"
              dataKey="y"
              domain={[minCarry, maxCarry]}
              tick={{ fontSize: 12, fill: '#5C616B' }}
              label={{
                value: 'Carry (yds)',
                angle: -90,
                position: 'insideLeft',
                offset: 8,
                fill: '#5C616B',
                fontSize: 12,
              }}
            />
            <ZAxis range={[40, 40]} />
            <Tooltip
              content={<ShotTooltip />}
              cursor={{ strokeDasharray: '3 3' }}
            />

            <ReferenceLine
              x={0}
              stroke="#CD1B32"
              strokeOpacity={0.35}
              strokeDasharray="6 6"
              label={{
                value: 'Target',
                position: 'top',
                fill: '#CD1B32',
                fontSize: 11,
              }}
            />

            {/* Individual shots, one Scatter series per club */}
            {Object.entries(seriesByClub).map(([clubId, points]) => {
              const def = CLUBS[clubId as ClubId];
              return (
                <Scatter
                  key={clubId}
                  name={def.label}
                  data={points}
                  fill={def.color}
                  fillOpacity={0.7}
                  stroke={def.color}
                  strokeOpacity={0.9}
                  shape={(props: any) => (
                    <ShotDot {...props} clubColor={def.color} />
                  )}
                />
              );
            })}

            {/* Mean-point overlay */}
            <Scatter
              data={meanPoints}
              shape={(props: any) => <MeanDot {...props} />}
              isAnimationActive={false}
            >
              {meanPoints.map((p, i) => (
                <Cell key={i} fill={CLUBS[p.club].color} />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      {/* Legend caption */}
      <div className="flex items-center gap-4 mt-3 text-xs text-text-secondary flex-wrap">
        <span className="inline-flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-pill bg-text-secondary opacity-60" />
          Each shot
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="w-3.5 h-3.5 rounded-pill border-2 border-text-primary" />
          Per-club average
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-pill bg-white border-2 border-danger" />
          Outlier (&gt; 2σ from carry mean)
        </span>
        <span className="ml-auto inline-flex items-center gap-2">
          <span className="block w-6 border-t-2 border-dashed border-rap-red opacity-50" />
          Target line
        </span>
      </div>
    </div>
  );
}

function ShotDot({
  cx,
  cy,
  payload,
  clubColor,
}: {
  cx?: number;
  cy?: number;
  payload?: Point;
  clubColor: string;
}) {
  if (cx === undefined || cy === undefined || !payload) return null;
  const isOutlier = payload.shot.isOutlier;
  if (isOutlier) {
    return (
      <g>
        <circle cx={cx} cy={cy} r={7} fill="none" stroke="#DD393A" strokeWidth={1.5} />
        <circle cx={cx} cy={cy} r={3.5} fill={clubColor} />
      </g>
    );
  }
  return (
    <circle cx={cx} cy={cy} r={4} fill={clubColor} fillOpacity={0.7} stroke={clubColor} strokeWidth={1} />
  );
}

function MeanDot({ cx, cy, fill }: { cx?: number; cy?: number; fill?: string }) {
  if (cx === undefined || cy === undefined) return null;
  return (
    <g>
      <circle cx={cx} cy={cy} r={9} fill="white" stroke={fill ?? '#0A0A0A'} strokeWidth={2.5} />
      <circle cx={cx} cy={cy} r={3} fill={fill ?? '#0A0A0A'} />
    </g>
  );
}

function ShotTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const data = payload[0]?.payload;
  if (!data) return null;
  // Mean-point payload has `club`; shot payload has `shot`.
  if (data.shot) {
    const s: Shot = data.shot;
    return (
      <div className="bg-white rounded-md border border-border-default shadow-md p-3 text-xs space-y-1">
        <div className="flex items-center gap-2 mb-1">
          <span
            className="w-2 h-2 rounded-pill"
            style={{ backgroundColor: CLUBS[s.club].color }}
          />
          <span className="font-semibold text-text-primary">{CLUBS[s.club].label}</span>
          {s.isOutlier && (
            <span className="text-[10px] font-semibold uppercase tracking-caps text-danger px-1.5 py-0.5 rounded-sm bg-danger-bg">
              Outlier
            </span>
          )}
        </div>
        <Row label="Carry" value={`${s.carry.toFixed(1)} yds`} />
        <Row label="Total" value={`${s.total.toFixed(1)} yds`} />
        <Row label="Side" value={`${s.sideCarry > 0 ? '+' : ''}${s.sideCarry.toFixed(1)} yds`} />
        <Row label="Ball Speed" value={`${s.ballSpeed.toFixed(1)} mph`} />
        <Row label="Smash" value={s.smash.toFixed(2)} />
        <Row label="Spin" value={`${s.spinRate} rpm`} />
      </div>
    );
  }
  return (
    <div className="bg-white rounded-md border border-border-default shadow-md p-2 text-xs">
      <span className="font-semibold">
        {CLUBS[data.club as ClubId].label} — average
      </span>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-text-tertiary">{label}</span>
      <span className="font-mono text-text-primary">{value}</span>
    </div>
  );
}
