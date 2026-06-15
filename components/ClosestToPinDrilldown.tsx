import clsx from 'clsx';
import { closestToPinResult, sessionInsights } from '@/lib/stats';
import type { ClosestToPinResult, PinShot } from '@/lib/stats';
import { CLUBS } from '@/lib/clubs';
import type { Session } from '@/lib/types';
import Icon from './Icon';
import ShotList from './ShotList';

/** Drilldown for a Closest-to-Pin game. The aim was proximity — one great
 *  shot and how close you got on average — so the story is a leaderboard,
 *  not a dispersion plot. */
export default function ClosestToPinDrilldown({ session }: { session: Session }) {
  const result = closestToPinResult(session);
  const insights = sessionInsights(session);
  if (!result || !insights) return null;

  return (
    <>
      <PinHero result={result} />

      <section className="bg-white rounded-2xl border border-border-subtle shadow-sm p-6 mb-10">
        <div className="flex items-baseline justify-between mb-4">
          <h2 className="type-h2 text-text-primary">Leaderboard</h2>
          <span className="text-xs text-text-tertiary">Every shot, closest first</span>
        </div>
        <div className="flex flex-col gap-2">
          {result.ranked.map((p, i) => (
            <PinRow key={p.shot.id} pin={p} rank={i + 1} />
          ))}
        </div>
      </section>

      <ShotList byClub={insights.byClub} shots={session.shots} />
    </>
  );
}

/* ─────────────────────────── Hero ─────────────────────────── */

function PinHero({ result }: { result: ClosestToPinResult }) {
  const closestShot = result.closest.shot;
  const def = CLUBS[closestShot.club];
  return (
    <section className="bg-white rounded-2xl border border-border-subtle shadow-sm p-6 mb-3">
      <div className="flex items-center gap-6 flex-wrap">
        {/* Closest shot — the trophy */}
        <div className="shrink-0">
          <div className="type-eyebrow mb-1 flex items-center gap-1.5">
            <Icon name="flag" size={13} /> Closest to pin
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="type-display-lg text-sport-golf-700 leading-none tabular-nums">
              {result.closest.proximityFt.toFixed(1)}
            </span>
            <span className="text-sm text-text-tertiary font-semibold uppercase tracking-caps">ft</span>
          </div>
          <div className="mt-2 flex items-center gap-2 text-sm text-text-secondary">
            <span
              className="w-6 h-6 rounded-pill flex items-center justify-center text-[10px] font-bold text-white"
              style={{ backgroundColor: def.color }}
            >
              {closestShot.club}
            </span>
            {closestShot.targetCarry} yd target
            {closestShot.hasVideo && (
              <span className="inline-flex items-center gap-1 text-text-tertiary">
                <Icon name="video-camera" size={13} /> Video
              </span>
            )}
          </div>
        </div>

        <div className="flex-1 min-w-[260px] flex flex-wrap gap-x-8 gap-y-3 justify-end">
          <HeroStat label="Avg proximity" value={`${result.avgProximityFt.toFixed(0)} ft`} />
          <Circle label="Inside 3 ft" count={result.inside3} total={result.shotCount} />
          <Circle label="Inside 10 ft" count={result.inside10} total={result.shotCount} />
          <Circle label="Inside 20 ft" count={result.inside20} total={result.shotCount} />
        </div>
      </div>
    </section>
  );
}

function HeroStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-right">
      <div className="type-label-sm text-text-tertiary tracking-caps mb-1">{label}</div>
      <div className="type-display-xs text-text-primary tabular-nums">{value}</div>
    </div>
  );
}

function Circle({ label, count, total }: { label: string; count: number; total: number }) {
  return (
    <div className="text-right">
      <div className="type-label-sm text-text-tertiary tracking-caps mb-1">{label}</div>
      <div className="type-display-xs text-text-primary tabular-nums">
        {count}
        <span className="text-sm text-text-tertiary"> / {total}</span>
      </div>
    </div>
  );
}

/* ─────────────────────────── Leaderboard row ─────────────────────────── */

function PinRow({ pin, rank }: { pin: PinShot; rank: number }) {
  const def = CLUBS[pin.shot.club];
  const isPodium = rank <= 3;
  return (
    <div
      className={clsx(
        'flex items-center gap-4 rounded-xl border p-3',
        isPodium ? 'border-sport-golf/40 bg-sport-golf/5' : 'border-border-subtle',
      )}
    >
      <span
        className={clsx(
          'w-7 h-7 rounded-pill flex items-center justify-center text-sm font-bold tabular-nums shrink-0',
          rank === 1 ? 'bg-sport-golf text-white' : isPodium ? 'bg-sport-golf/20 text-sport-golf-700' : 'bg-neutral-100 text-text-secondary',
        )}
      >
        {rank}
      </span>

      <div className="flex items-center gap-2.5 flex-1 min-w-0">
        <span
          className="w-8 h-8 rounded-pill flex items-center justify-center text-[10px] font-bold text-white shrink-0"
          style={{ backgroundColor: def.color }}
        >
          {pin.shot.club}
        </span>
        <div className="min-w-0">
          <div className="text-sm text-text-primary">{def.label}</div>
          <div className="text-xs text-text-tertiary tabular-nums">
            {pin.shot.targetCarry} yd target · {pin.shot.carry.toFixed(0)} yds carry
          </div>
        </div>
      </div>

      {pin.shot.hasVideo && (
        <span className="inline-flex items-center justify-center w-7 h-7 rounded-pill bg-neutral-100 text-text-primary shrink-0">
          <Icon name="video-camera" size={14} />
        </span>
      )}

      <div className="text-right w-[72px] shrink-0">
        <span className="type-h3 text-text-primary tabular-nums">{pin.proximityFt.toFixed(1)}</span>
        <span className="text-xs text-text-tertiary"> ft</span>
      </div>
    </div>
  );
}
