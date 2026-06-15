import clsx from 'clsx';
import { SESSIONS } from '@/lib/mockData';
import {
  combineResult, previousSessionOfMode, sessionInsights,
} from '@/lib/stats';
import type { CombineResult, CombineStation } from '@/lib/stats';
import { CLUBS } from '@/lib/clubs';
import type { Session } from '@/lib/types';
import Icon from './Icon';
import ShotList from './ShotList';

const BAND_RING: Record<CombineResult['band'], string> = {
  elite: '#1CB864',
  sharp: '#1CB864',
  solid: '#A3A3A3',
  building: '#F59E0B',
};

/** Drilldown for a Combine — a standardised skills test. The aim was to
 *  post a score across fixed stations, so the drilldown is a scorecard:
 *  overall score, station-by-station results, and the gap to close. */
export default function CombineDrilldown({ session }: { session: Session }) {
  const result = combineResult(session);
  const insights = sessionInsights(session);
  if (!result || !insights) return null;

  const prev = previousSessionOfMode(session.id, SESSIONS);
  const prevResult = prev ? combineResult(prev) : null;
  const delta = prevResult ? result.score - prevResult.score : null;

  return (
    <>
      <CombineHero result={result} delta={delta} />

      <section className="bg-white rounded-2xl border border-border-subtle shadow-sm p-6 mb-10">
        <div className="flex items-baseline justify-between mb-1">
          <h2 className="type-h2 text-text-primary">Stations</h2>
          <span className="text-xs text-text-tertiary">
            Scored on how close each shot finished to the target
          </span>
        </div>
        <p className="type-body-sm text-text-secondary mb-5">
          {stationTakeaway(result)}
        </p>
        <div className="flex flex-col gap-2.5">
          {result.stations.map((st) => (
            <StationRow
              key={st.target}
              station={st}
              isBest={st.target === result.bestStation.target}
              isWorst={st.target === result.worstStation.target && result.stations.length > 1}
            />
          ))}
        </div>
      </section>

      <ShotList byClub={insights.byClub} shots={session.shots} />
    </>
  );
}

/* ─────────────────────────── Hero ─────────────────────────── */

function CombineHero({ result, delta }: { result: CombineResult; delta: number | null }) {
  const ring = BAND_RING[result.band];
  const R = 56;
  const circ = 2 * Math.PI * R;
  const offset = circ * (1 - result.score / 100);

  return (
    <section className="bg-white rounded-2xl border border-border-subtle shadow-sm p-6 mb-3">
      <div className="flex items-center gap-6 flex-wrap">
        <div className="relative w-[140px] h-[140px] shrink-0">
          <svg width="140" height="140" viewBox="0 0 140 140" className="-rotate-90">
            <circle cx="70" cy="70" r={R} fill="none" stroke="#F5F5F5" strokeWidth="12" />
            <circle
              cx="70" cy="70" r={R} fill="none" stroke={ring} strokeWidth="12"
              strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="type-display-lg text-text-primary leading-none tabular-nums">
              {result.score}
            </span>
            <span className="text-[10px] font-bold uppercase tracking-caps text-text-tertiary mt-1">
              / 100
            </span>
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="type-eyebrow mb-1">Combine score</div>
          <h2 className="type-display-sm text-text-primary mb-2">{result.label}</h2>
          <p className="type-body text-text-secondary max-w-md">
            Your test score across {result.stations.length} stations and{' '}
            {result.shotCount} shots — the average of how close each shot
            finished to its target distance.
          </p>
        </div>

        {delta !== null && (
          <div className="shrink-0 text-right">
            <div className="type-label-sm text-text-tertiary mb-1">vs last combine</div>
            <div
              className={clsx(
                'inline-flex items-center gap-1.5 type-display-xs tabular-nums',
                delta > 0 ? 'text-sport-golf-700' : delta < 0 ? 'text-danger' : 'text-text-secondary',
              )}
            >
              {delta !== 0 && <Icon name={delta > 0 ? 'arrow-up' : 'arrow-down'} size={20} />}
              {delta > 0 ? '+' : ''}{delta}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function stationTakeaway(result: CombineResult): string {
  if (result.stations.length < 2) return 'Your results for the test, station by station.';
  const best = result.bestStation;
  const worst = result.worstStation;
  return `Sharpest at the ${best.target}-yd station (${best.score}); the ${worst.target}-yd station (${worst.score}) is where the points are leaking.`;
}

/* ─────────────────────────── Station row ─────────────────────────── */

function StationRow({
  station, isBest, isWorst,
}: {
  station: CombineStation;
  isBest: boolean;
  isWorst: boolean;
}) {
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
          <div className="text-sm font-semibold text-text-primary tabular-nums">
            {station.target} yds
          </div>
          <div className="text-xs text-text-tertiary">{station.shots} shots</div>
        </div>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs text-text-tertiary">
            Avg {station.avgProximity.toFixed(1)} yds from target
          </span>
          {isBest && <Badge tone="positive">Strongest</Badge>}
          {isWorst && <Badge tone="warn">Work-on</Badge>}
        </div>
        <div className="h-2 bg-neutral-100 rounded-pill overflow-hidden">
          <div
            className={clsx(
              'h-full rounded-pill',
              station.score >= 65 ? 'bg-sport-golf' : station.score >= 50 ? 'bg-neutral-400' : 'bg-warning',
            )}
            style={{ width: `${station.score}%` }}
          />
        </div>
      </div>

      <div className="text-right w-[52px] shrink-0">
        <span className="type-h3 text-text-primary tabular-nums">{station.score}</span>
      </div>
    </div>
  );
}

function Badge({ children, tone }: { children: React.ReactNode; tone: 'positive' | 'warn' }) {
  return (
    <span
      className={clsx(
        'text-[10px] font-bold uppercase tracking-caps px-2 py-0.5 rounded-pill',
        tone === 'positive' ? 'bg-sport-golf/15 text-sport-golf-700' : 'bg-warning-bg text-warning',
      )}
    >
      {children}
    </span>
  );
}
