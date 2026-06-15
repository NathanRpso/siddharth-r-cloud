'use client';

import { Suspense, useMemo, useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import clsx from 'clsx';
import PageHeader from '@/components/PageHeader';
import BagGappingChart from '@/components/BagGappingChart';
import ClubChipSelector from '@/components/ClubChipSelector';
import DispersionPlot from '@/components/DispersionPlot';
import TrendChart from '@/components/TrendChart';
import StrokesGainedChart from '@/components/StrokesGainedChart';
import AccuracyHeatStrip from '@/components/AccuracyHeatStrip';
import ClubMetricsChart from '@/components/ClubMetricsChart';
import Icon from '@/components/Icon';
import { ALL_SHOTS } from '@/lib/mockData';
import { CLUBS } from '@/lib/clubs';
import type { ClubId } from '@/lib/types';
import {
  accuracySummary,
  aggregateByClub,
  bagSummary,
  clubAccuracy,
  clubStrokesGained,
  mean,
  performanceSynthesis,
  rateDistanceConsistency,
  strokesGainedSummary,
} from '@/lib/stats';
import type { Rating } from '@/lib/stats';

type TabKey = 'bag' | 'strokes-gained' | 'accuracy' | 'metrics';

const DEFAULT_SELECTED: ClubId[] = ['Dr', '7i'];

export default function PerformancePage() {
  return (
    <Suspense fallback={<div className="p-10 text-text-secondary">Loading…</div>}>
      <PerformanceContent />
    </Suspense>
  );
}

function PerformanceContent() {
  const router = useRouter();
  const params = useSearchParams();
  const paramTab = params.get('tab');
  const initialTab: TabKey =
    paramTab === 'strokes-gained' ? 'strokes-gained'
    : paramTab === 'accuracy'     ? 'accuracy'
    : paramTab === 'metrics'      ? 'metrics'
    : 'bag';
  const [tab, setTab] = useState<TabKey>(initialTab);

  // Keep URL in sync when user clicks tabs (shallow update; no scroll).
  useEffect(() => {
    const current = params.get('tab');
    const target = tab === 'bag' ? null : tab;
    if (current !== target) {
      router.replace(target ? `/performance?tab=${target}` : '/performance', { scroll: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const synthesis = useMemo(() => performanceSynthesis(ALL_SHOTS), []);

  return (
    <>
      <PageHeader title="Performance" eyebrow="Your golf, analysed" />
      <div className="px-6 sm:px-8 lg:px-10 pb-10">
        <div className="max-w-[1400px]">
          {/* Page-level synthesis — composed from strokes gained data */}
          {synthesis && (
            <p className="type-body-lg text-text-primary font-semibold mb-6 leading-snug max-w-[78ch]">
              {synthesis}
            </p>
          )}

          {/* Tab nav */}
          <div className="border-b border-border-subtle mb-8">
            <div className="flex gap-8">
              <TabButton active={tab === 'bag'}            onClick={() => setTab('bag')}            label="Bag" />
              <TabButton active={tab === 'strokes-gained'} onClick={() => setTab('strokes-gained')} label="Strokes Gained" />
              <TabButton active={tab === 'accuracy'}       onClick={() => setTab('accuracy')}       label="Accuracy" />
              <TabButton active={tab === 'metrics'}        onClick={() => setTab('metrics')}        label="Metrics" />
            </div>
          </div>

          {tab === 'bag' && <BagTab />}
          {tab === 'strokes-gained' && <StrokesGainedTab />}
          {tab === 'accuracy' && <AccuracyTab />}
          {tab === 'metrics' && <MetricsTab />}
        </div>
      </div>
    </>
  );
}

function TabButton({
  active, onClick, label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        'pb-3 -mb-px text-sm font-semibold tracking-snug transition-colors border-b-2',
        active
          ? 'border-rap-red text-text-primary'
          : 'border-transparent text-text-secondary hover:text-text-primary',
      )}
    >
      {label}
    </button>
  );
}

/* ────────────────────────── BAG TAB ────────────────────────── */

function BagTab() {
  const [selected, setSelected] = useState<ClubId[]>(DEFAULT_SELECTED);
  const bag = useMemo(() => bagSummary(ALL_SHOTS), []);
  const allByClub = useMemo(() => aggregateByClub(ALL_SHOTS), []);
  const available = useMemo(() => allByClub.map((c) => c.club), [allByClub]);

  const selectedSet = new Set(selected);
  const selectedShots = ALL_SHOTS.filter((s) => selectedSet.has(s.club));
  const selectedByClub = allByClub.filter((c) => selectedSet.has(c.club));

  return (
    <>
      {/* Distance ladder */}
      <section className="bg-white rounded-2xl border border-border-subtle shadow-sm p-6 mb-8">
        <div className="flex items-baseline justify-between mb-5">
          <h2 className="type-h2 text-text-primary">Distance ladder</h2>
          <span className="text-xs text-text-tertiary">
            Avg carry by club
          </span>
        </div>
        <BagGappingChart bag={bag} cta={false} />
      </section>

      {/* Compare clubs */}
      <section className="bg-white rounded-2xl border border-border-subtle shadow-sm p-6 mb-8">
        <div className="flex items-baseline justify-between mb-1">
          <h2 className="type-h2 text-text-primary">Compare clubs</h2>
          <span className="text-xs text-text-tertiary">
            Pick any number — not just two
          </span>
        </div>
        <p className="type-body-sm text-text-secondary mb-4">
          Select clubs from your bag to see them side-by-side.
        </p>

        <ClubChipSelector
          available={available}
          selected={selected}
          onChange={setSelected}
        />

        {selected.length === 0 ? (
          <div className="mt-8 py-12 text-center text-text-secondary">
            <Icon name="briefcase" size={32} className="text-text-tertiary mb-2 mx-auto" />
            <p className="type-body">Tap a club above to start comparing.</p>
          </div>
        ) : (
          <div className="mt-6 overflow-x-auto">
            <table className="w-full min-w-[820px]">
              <thead>
                <tr className="text-left border-b border-border-subtle">
                  <Th>Club</Th>
                  <Th align="right">Shots</Th>
                  <Th align="right">Avg Carry</Th>
                  <Th align="right">Range</Th>
                  <Th align="right">Avg Ball Spd</Th>
                  <Th align="right">Smash</Th>
                  <Th align="left">Consistency</Th>
                </tr>
              </thead>
              <tbody>
                {selectedByClub.map((c) => {
                  const def = CLUBS[c.club];
                  const rating = rateDistanceConsistency(c.carrySd, c.avgCarry);
                  return (
                    <tr key={c.club} className="border-b border-border-subtle">
                      <Td>
                        <span className="inline-flex items-center gap-2.5">
                          <span
                            className="w-7 h-7 rounded-pill flex items-center justify-center text-[11px] font-bold text-white"
                            style={{ backgroundColor: def.color }}
                          >
                            {c.club}
                          </span>
                          <span className="font-semibold text-text-primary">{def.label}</span>
                        </span>
                      </Td>
                      <Td align="right" mono>{c.count}</Td>
                      <Td align="right" mono>{c.avgCarry.toFixed(0)} <Unit>yds</Unit></Td>
                      <Td align="right" mono>
                        <span className="text-text-secondary">±{c.carrySd.toFixed(0)} <Unit>yds</Unit></span>
                      </Td>
                      <Td align="right" mono>{c.avgBallSpeed.toFixed(1)} <Unit>mph</Unit></Td>
                      <Td align="right" mono>{c.avgSmash.toFixed(2)}</Td>
                      <Td>
                        <RatingPill rating={rating} />
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {selected.length > 0 && (
        <section className="bg-white rounded-2xl border border-border-subtle shadow-sm p-6 mb-8">
          <div className="flex items-baseline justify-between mb-1">
            <h2 className="type-h2 text-text-primary">
              {selected.length === 1
                ? `${selectedByClub[0]?.club} dispersion`
                : 'Dispersion across selected clubs'}
            </h2>
            <span className="text-xs text-text-tertiary">
              Looking down the fairway
            </span>
          </div>
          <p className="type-body-sm text-text-secondary mb-4">
            Each dot is a shot, ringed dots are per-club averages.
          </p>
          <DispersionPlot shots={selectedShots} byClub={selectedByClub} />
        </section>
      )}

      {selected.length > 0 && selectedShots.length >= 10 && (
        <section className="bg-white rounded-2xl border border-border-subtle shadow-sm p-6 mb-10">
          <h2 className="type-h2 text-text-primary mb-1">
            {selected.length === 1 ? `${selected[0]} trend` : 'Trend for selected'}
          </h2>
          <p className="type-body-sm text-text-secondary mb-4">
            {selected.length === 1
              ? 'Your week-to-week movement on this club.'
              : 'Averaged across the clubs you have selected.'}
          </p>
          <TrendChart shots={selectedShots} initial="carry" />
        </section>
      )}
    </>
  );
}


/* ──────────────────── STROKES GAINED TAB ──────────────────── */

function StrokesGainedTab() {
  const data = useMemo(() => clubStrokesGained(ALL_SHOTS), []);
  const summary = useMemo(() => strokesGainedSummary(data), [data]);
  const total = useMemo(() => data.reduce((s, d) => s + d.value, 0), [data]);

  const totalSign = total >= 0 ? '+' : '';
  const totalColor =
    total > 0.05 ? 'text-sport-golf-700'
    : total < -0.05 ? 'text-danger'
    : 'text-text-primary';

  return (
    <section className="bg-white rounded-2xl border border-border-subtle shadow-sm p-6 mb-10">
      <div className="flex items-start justify-between gap-6 mb-5">
        <div>
          <h2 className="type-h2 text-text-primary mb-1">Strokes gained</h2>
          <span className="text-xs text-text-tertiary">
            Vs typical 20-handicap
          </span>
        </div>
        {data.length > 0 && (
          <div className="text-right shrink-0">
            <div className={`type-display-md italic font-extrabold leading-none ${totalColor}`}>
              {totalSign}{total.toFixed(1)}
            </div>
            <div className="text-[11px] uppercase tracking-caps font-bold text-text-tertiary mt-1.5">
              Strokes / round
            </div>
          </div>
        )}
      </div>

      {summary && (
        <p className="type-body text-text-primary font-semibold mb-2 leading-snug">
          {summary}
        </p>
      )}

      <p className="type-body-sm text-text-secondary mb-6 max-w-prose">
        Estimates how many strokes per round each club gains or loses vs the
        typical 20-handicap golfer, combining distance and dispersion. Positive
        bars = strokes you're gaining. Negative bars = strokes you're leaking.
      </p>

      {data.length ? (
        <StrokesGainedChart data={data} />
      ) : (
        <p className="text-sm text-text-secondary">
          Not enough club data yet to estimate strokes gained.
        </p>
      )}
    </section>
  );
}

/* ───────────────────────── ACCURACY TAB ───────────────────────── */

function AccuracyTab() {
  const data = useMemo(() => clubAccuracy(ALL_SHOTS), []);
  const summary = useMemo(() => accuracySummary(data), [data]);
  // Headline number: overall % of shots on target across the bag.
  const overallOnTarget = useMemo(
    () => (data.length ? mean(data.map((d) => d.centerPct)) : 0),
    [data],
  );

  const onTargetColor =
    overallOnTarget >= 0.6 ? 'text-sport-golf-700'
    : overallOnTarget >= 0.4 ? 'text-text-primary'
    : 'text-warning';

  return (
    <section className="bg-white rounded-2xl border border-border-subtle shadow-sm p-6 mb-10">
      <div className="flex items-start justify-between gap-6 mb-5">
        <div>
          <h2 className="type-h2 text-text-primary mb-1">Accuracy</h2>
          <span className="text-xs text-text-tertiary">
            Where your shots tend to land
          </span>
        </div>
        {data.length > 0 && (
          <div className="text-right shrink-0">
            <div className={`type-display-md italic font-extrabold leading-none ${onTargetColor}`}>
              {(overallOnTarget * 100).toFixed(0)}%
            </div>
            <div className="text-[11px] uppercase tracking-caps font-bold text-text-tertiary mt-1.5">
              On target
            </div>
          </div>
        )}
      </div>

      {summary && (
        <p className="type-body text-text-primary font-semibold mb-2 leading-snug">
          {summary}
        </p>
      )}

      <p className="type-body-sm text-text-secondary mb-6 max-w-prose">
        For each club, the share of shots that landed left of, on, or right
        of your target line. Centre cell = straight enough; red cells = miss
        tendency in that direction.
      </p>

      {data.length ? (
        <AccuracyHeatStrip data={data} />
      ) : (
        <p className="text-sm text-text-secondary">
          Hit a few more shots per club to see your accuracy pattern.
        </p>
      )}
    </section>
  );
}

/* ────────────────────────── METRICS TAB ────────────────────────── */

function MetricsTab() {
  return (
    <section className="bg-white rounded-2xl border border-border-subtle shadow-sm p-6 mb-10">
      <div className="flex items-baseline justify-between mb-1">
        <h2 className="type-h2 text-text-primary">Metrics by club</h2>
        <span className="text-xs text-text-tertiary">Lifetime averages</span>
      </div>
      <p className="type-body-sm text-text-secondary mb-5 max-w-prose">
        Pick a metric to see how it varies across your bag. Bars are coloured
        against typical 20-handicap baselines for each club.
      </p>
      <ClubMetricsChart shots={ALL_SHOTS} />
    </section>
  );
}

/* ─────────────────────── Local helpers ─────────────────────── */

function Th({
  children,
  align = 'left',
}: {
  children?: React.ReactNode;
  align?: 'left' | 'right' | 'center';
}) {
  return (
    <th
      className={clsx(
        'type-label-sm text-text-secondary px-4 py-3 font-semibold',
        align === 'right' && 'text-right',
        align === 'center' && 'text-center',
      )}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  align = 'left',
  mono = false,
}: {
  children: React.ReactNode;
  align?: 'left' | 'right' | 'center';
  mono?: boolean;
}) {
  return (
    <td
      className={clsx(
        'px-4 py-3 text-sm text-text-primary',
        align === 'right' && 'text-right',
        align === 'center' && 'text-center',
        mono && 'font-mono',
      )}
    >
      {children}
    </td>
  );
}

function Unit({ children }: { children: React.ReactNode }) {
  return <span className="text-text-tertiary text-xs ml-0.5">{children}</span>;
}

function RatingPill({ rating }: { rating: Rating }) {
  const tone = rating.tone;
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-pill text-xs font-semibold',
        tone === 'positive' && 'bg-sport-golf/15 text-sport-golf-700',
        tone === 'neutral'  && 'bg-neutral-100 text-text-secondary',
        tone === 'warn'     && 'bg-warning-bg text-warning',
        tone === 'caution'  && 'bg-danger-bg text-danger',
      )}
    >
      <span
        className={clsx(
          'w-1.5 h-1.5 rounded-pill',
          tone === 'positive' && 'bg-sport-golf',
          tone === 'neutral'  && 'bg-neutral-400',
          tone === 'warn'     && 'bg-warning',
          tone === 'caution'  && 'bg-danger',
        )}
      />
      {rating.label}
    </span>
  );
}
