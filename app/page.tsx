import Link from 'next/link';
import PageHeader from '@/components/PageHeader';
import HeroCard from '@/components/HeroCard';
import HomeHeroBanner from '@/components/HomeHeroBanner';
import TrendChart from '@/components/TrendChart';
import BagGappingChart from '@/components/BagGappingChart';
import PercentileBand from '@/components/PercentileBand';
import RecentSessionsCarousel from '@/components/RecentSessionsCarousel';
import PersonalBestsStrip from '@/components/PersonalBestsStrip';
import QuickStatsStrip from '@/components/QuickStatsStrip';
import Icon from '@/components/Icon';
import { GOLFER, ALL_SHOTS, SESSIONS } from '@/lib/mockData';
import {
  lifetimeInsights,
  pickHeroInsight,
  bagSummary,
  pickBagInsight,
  handicapPercentiles,
  synthesisePercentiles,
  BAG_TONE_HEX,
} from '@/lib/stats';

export default function HomePage() {
  const lifetime = lifetimeInsights(ALL_SHOTS, SESSIONS);
  if (!lifetime) {
    return (
      <>
        <PageHeader title="Insights" />
        <div className="px-6 sm:px-8 lg:px-10 pb-10">
          <p className="type-body text-text-secondary">No shots logged yet.</p>
        </div>
      </>
    );
  }

  const hero = pickHeroInsight(ALL_SHOTS);

  // Bag at a glance — derived from last 30 days so it stays in sync with the
  // rest of Home's rolling-window theme. Lifetime view lives on /bag.
  const cut30Ms = Date.now() - 30 * 86_400_000;
  const last30AllShots = ALL_SHOTS.filter(
    (s) => new Date(s.timestamp).getTime() >= cut30Ms,
  );
  const bag = bagSummary(last30AllShots);
  const bagInsight = pickBagInsight(bag);

  const percentiles = handicapPercentiles(ALL_SHOTS);
  const percentileSynthesis = synthesisePercentiles(percentiles);
  const recent = SESSIONS.slice(0, 5);

  return (
    <>
      <div className="px-6 sm:px-8 lg:px-10 pt-6 pb-10">
       <div className="max-w-[1400px]">

      {/* Branded welcome banner — replaces the plain page header on home so the
          first thing visitors see is colour + motion, not white space. */}
      <HomeHeroBanner
        firstName={GOLFER.firstName}
        totalShots={ALL_SHOTS.length}
        totalSessions={SESSIONS.length}
      />

      {/* Hero insight */}
      {hero && (
        <section className="mb-10 rcl-fade-up rcl-delay-1">
          <HeroCard insight={hero} shots={ALL_SHOTS} />
        </section>
      )}

      {/* 30-day quick stats — client component, 4th tile is customisable */}
      <div className="rcl-fade-up rcl-delay-2">
        <QuickStatsStrip shots={ALL_SHOTS} sessions={SESSIONS} />
      </div>

      {/* Trend chart */}
      <section className="rcl-card rcl-fade-up rcl-delay-3 bg-white rounded-2xl border border-border-subtle shadow-sm p-6 mb-10">
        <h2 className="type-h2 text-text-primary mb-4">Trend</h2>
        <TrendChart shots={ALL_SHOTS} initial="carry" />
      </section>

      {/* Two-column row: Bag preview + Percentiles */}
      <div className="rcl-fade-up rcl-delay-4 grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10">
        <section className="rcl-card bg-white rounded-2xl border border-border-subtle shadow-sm p-6">
          <div className="flex items-baseline justify-between mb-4">
            <h2 className="type-h2 text-text-primary">Bag at a glance</h2>
            <span className="text-xs text-text-tertiary">Last 30 days</span>
          </div>
          {bagInsight && (
            <div
              className="flex items-start gap-3 pl-3 pr-2 py-2.5 mb-5 rounded-md bg-neutral-50"
              style={{ borderLeft: `3px solid ${BAG_TONE_HEX[bagInsight.tone]}` }}
            >
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-text-primary leading-tight">
                  {bagInsight.headline}
                </div>
                <div className="text-xs text-text-secondary mt-0.5">
                  {bagInsight.detail}
                </div>
              </div>
            </div>
          )}
          <BagGappingChart
            bag={bag}
            cta
            highlight={
              bagInsight ? { club: bagInsight.club, tone: bagInsight.tone } : undefined
            }
          />
        </section>

        <section className="rcl-card bg-white rounded-2xl border border-border-subtle shadow-sm p-6">
          <div className="flex items-baseline justify-between mb-4">
            <h2 className="type-h2 text-text-primary">Where you stand</h2>
            <span className="text-xs text-text-tertiary">
              Vs other 20-handicaps
            </span>
          </div>
          {percentileSynthesis && (
            <p className="type-body text-text-primary font-semibold mb-6 leading-snug">
              {percentileSynthesis}
            </p>
          )}
          <div className="space-y-6">
            {percentiles.length ? (
              percentiles.map((p) => <PercentileBand key={p.metric} snapshot={p} />)
            ) : (
              <p className="text-sm text-text-secondary">
                Hit a few more shots with driver and 7-iron to unlock skill benchmarks.
              </p>
            )}
          </div>
          {percentiles.length > 0 && (
            <Link
              href="/performance?tab=strokes-gained"
              className="inline-flex items-center gap-1.5 mt-6 text-sm font-semibold text-rap-red hover:text-rap-red-hover transition-colors"
            >
              See your strokes-gained breakdown
              <Icon name="arrow-right" size={14} />
            </Link>
          )}
        </section>
      </div>

      {/* Recent sessions — compact tile carousel */}
      <RecentSessionsCarousel sessions={recent} />

      {/* Personal bests */}
      <PersonalBestsStrip lifetime={lifetime} shots={ALL_SHOTS} />
       </div>
      </div>
    </>
  );
}

