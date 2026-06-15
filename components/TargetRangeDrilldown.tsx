import clsx from 'clsx';
import { targetRangeResult, sessionInsights } from '@/lib/stats';
import type { TargetRangeResult, TargetStation } from '@/lib/stats';
import { CLUBS } from '@/lib/clubs';
import type { Session } from '@/lib/types';
import ShotList from './ShotList';

/** Drilldown for a Target Range session. The aim was to hit a chosen
 *  number on line, so the story is distance control: how close shots
 *  finished to target, and whether misses bias short/long or left/right. */
export default function TargetRangeDrilldown({ session }: { session: Session }) {
  const result = targetRangeResult(session);
  const insights = sessionInsights(session);
  if (!result || !insights) return null;

  return (
    <>
      <TargetHero result={result} />

      <section className="bg-white rounded-2xl border border-border-subtle shadow-sm p-6 mb-10">
        <div className="flex items-baseline justify-between mb-1">
          <h2 className="type-h2 text-text-primary">By target</h2>
          <span className="text-xs text-text-tertiary">
            On target = finishing within 8% of the number
          </span>
        </div>
        <p className="type-body-sm text-text-secondary mb-5">
          {targetTakeaway(result)}
        </p>
        <div className="flex flex-col gap-2.5">
          {result.stations.map((st) => (
            <TargetRow key={st.target} station={st} />
          ))}
        </div>
      </section>

      <ShotList byClub={insights.byClub} shots={session.shots} />
    </>
  );
}

/* ─────────────────────────── Hero ─────────────────────────── */

function TargetHero({ result }: { result: TargetRangeResult }) {
  return (
    <section className="bg-white rounded-2xl border border-border-subtle shadow-sm p-6 mb-3">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <HeroStat
          label="Avg proximity"
          value={result.avgProximity.toFixed(1)}
          unit="yds"
          sub="Typical distance from the target you were aiming at"
        />
        <HeroStat
          label="On target"
          value={`${Math.round(result.hitRate * 100)}%`}
          sub={`${Math.round(result.hitRate * result.shotCount)} of ${result.shotCount} shots inside the band`}
          tone={result.hitRate >= 0.5 ? 'positive' : result.hitRate >= 0.3 ? 'neutral' : 'warn'}
        />
        <div>
          <div className="type-label-sm text-text-tertiary mb-2">Miss tendency</div>
          <div className="flex flex-col gap-2">
            <BiasLine
              label="Distance"
              text={biasDistance(result.carryBias)}
              tone={Math.abs(result.carryBias) < 3 ? 'positive' : 'neutral'}
            />
            <BiasLine
              label="Direction"
              text={biasDirection(result.lateralBias)}
              tone={Math.abs(result.lateralBias) < 4 ? 'positive' : 'neutral'}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

const TONE_TEXT = {
  positive: 'text-sport-golf-700',
  neutral: 'text-text-primary',
  warn: 'text-warning',
} as const;

function HeroStat({
  label, value, unit, sub, tone = 'neutral',
}: {
  label: string;
  value: string;
  unit?: string;
  sub: string;
  tone?: 'positive' | 'neutral' | 'warn';
}) {
  return (
    <div>
      <div className="type-label-sm text-text-tertiary mb-2">{label}</div>
      <div className="flex items-baseline gap-1.5">
        <span className={clsx('type-display-md leading-none', TONE_TEXT[tone])}>{value}</span>
        {unit && (
          <span className="text-xs text-text-tertiary font-semibold uppercase tracking-caps">{unit}</span>
        )}
      </div>
      <div className="text-xs text-text-tertiary mt-2 max-w-[220px]">{sub}</div>
    </div>
  );
}

function BiasLine({
  label, text, tone,
}: {
  label: string;
  text: string;
  tone: 'positive' | 'neutral';
}) {
  return (
    <div className="flex items-center gap-2">
      <span className={clsx('w-1.5 h-1.5 rounded-pill shrink-0', tone === 'positive' ? 'bg-sport-golf' : 'bg-neutral-400')} />
      <span className="text-sm text-text-secondary">
        <span className="text-text-tertiary">{label}: </span>
        <span className="font-semibold text-text-primary">{text}</span>
      </span>
    </div>
  );
}

function biasDistance(carryBias: number): string {
  if (Math.abs(carryBias) < 3) return 'Right on number';
  return carryBias > 0 ? `Tends ${carryBias.toFixed(0)} yds long` : `Tends ${Math.abs(carryBias).toFixed(0)} yds short`;
}

function biasDirection(lateralBias: number): string {
  if (Math.abs(lateralBias) < 4) return 'Holding the line';
  return lateralBias > 0 ? `Leaks ${lateralBias.toFixed(0)} yds right` : `Pulls ${Math.abs(lateralBias).toFixed(0)} yds left`;
}

function targetTakeaway(result: TargetRangeResult): string {
  const sharp = [...result.stations].sort((a, b) => b.hitRate - a.hitRate)[0];
  const loose = [...result.stations].sort((a, b) => a.hitRate - b.hitRate)[0];
  if (result.stations.length < 2 || !sharp || !loose) {
    return 'How tightly each target distance landed on the number.';
  }
  return `Most dialled at ${sharp.target} yds (${Math.round(sharp.hitRate * 100)}% on target); the ${loose.target}-yd target is the loosest.`;
}

/* ─────────────────────────── Target row ─────────────────────────── */

function TargetRow({ station }: { station: TargetStation }) {
  const def = CLUBS[station.club];
  return (
    <div className="flex items-center gap-4 rounded-xl border border-border-subtle p-3">
      <div className="flex items-center gap-3 w-[150px] shrink-0">
        <span
          className="w-8 h-8 rounded-pill flex items-center justify-center text-[10px] font-bold text-white shrink-0"
          style={{ backgroundColor: def.color }}
        >
          {station.club}
        </span>
        <div className="min-w-0">
          <div className="text-sm font-semibold text-text-primary tabular-nums">{station.target} yds</div>
          <div className="text-xs text-text-tertiary">{station.shots} shots</div>
        </div>
      </div>

      <div className="flex-1 min-w-0 grid grid-cols-2 gap-x-4 gap-y-1">
        <Cell label="Carry" value={`${station.avgCarry.toFixed(0)} yds`} note={signed(station.carryDelta, 'yds')} />
        <Cell label="Direction" value={direction(station.lateralBias)} />
      </div>

      <div className="text-right w-[78px] shrink-0">
        <div className="type-h3 text-text-primary tabular-nums">{Math.round(station.hitRate * 100)}%</div>
        <div className="text-[11px] text-text-tertiary">on target</div>
      </div>
    </div>
  );
}

function Cell({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="min-w-0">
      <div className="text-[11px] text-text-tertiary">{label}</div>
      <div className="text-sm text-text-primary">
        {value}
        {note && <span className="text-text-tertiary"> · {note}</span>}
      </div>
    </div>
  );
}

function signed(n: number, unit: string): string {
  if (Math.abs(n) < 0.5) return 'on number';
  return `${n > 0 ? '+' : ''}${n.toFixed(0)} ${unit}`;
}

function direction(lateralBias: number): string {
  if (Math.abs(lateralBias) < 3) return 'Centre';
  return lateralBias > 0 ? `${lateralBias.toFixed(0)} yds right` : `${Math.abs(lateralBias).toFixed(0)} yds left`;
}
