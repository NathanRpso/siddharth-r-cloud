import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  sessionInsights,
  compareToBaseline,
  generateNarratives,
  rateStrike,
  rateSpread,
  rateDistanceConsistency,
} from '@/lib/stats';
import { ALL_SHOTS, SESSIONS, getSession, GOLFER } from '@/lib/mockData';
import { modeLabel } from '@/lib/sessionTitle';

// Pre-render every shareable session for static export.
export function generateStaticParams() {
  return SESSIONS.map((s) => ({ id: s.id }));
}
import MetricTile from '@/components/MetricTile';
import MetricPill from '@/components/MetricPill';
import NarrativeCard from '@/components/NarrativeCard';
import DispersionPlot from '@/components/DispersionPlot';
import ClubBreakdownTable from '@/components/ClubBreakdownTable';
import Icon, { MetricIcon } from '@/components/Icon';

export default function CoachSharePage({ params }: { params: { id: string } }) {
  const session = getSession(params.id);
  if (!session) notFound();

  const insights = sessionInsights(session);
  if (!insights) notFound();

  const priorShots = ALL_SHOTS.filter(
    (s) => new Date(s.timestamp) < new Date(session.date),
  );
  const deltas = compareToBaseline(session, priorShots);
  // Filter out narratives whose CTAs go to internal app pages — coach can't act on them.
  const narratives = generateNarratives(insights, deltas, session.id).map((n) => ({
    ...n,
    cta: undefined,
  }));

  const date = new Date(session.date);
  const dateStr = date.toLocaleDateString('en-GB', {
    weekday: 'short', day: '2-digit', month: 'short', year: 'numeric',
  });
  const timeStr = date.toLocaleTimeString('en-GB', {
    hour: '2-digit', minute: '2-digit',
  });

  const strike = rateStrike(insights.smashSd);
  const spread = rateSpread(insights.sideCarrySd);
  const allCarries = session.shots.map((s) => s.carry);
  const carrySd =
    Math.sqrt(allCarries.reduce((a, b) => a + (b - insights.avgCarry) ** 2, 0) / allCarries.length);
  const distanceRating = rateDistanceConsistency(carrySd, insights.avgCarry);

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Top brand bar */}
      <div className="bg-rap-black text-white">
        <div className="max-w-[1200px] mx-auto px-8 py-4 flex items-center justify-between">
          <img
            src="/design-system/assets/logos/rapsodo-golf-full-black-bg.png"
            alt="Rapsodo Golf"
            className="h-9 w-auto"
            draggable={false}
          />
          <div className="text-xs text-neutral-400">
            Shared by{' '}
            <span className="text-white font-semibold">
              {GOLFER.firstName} {GOLFER.lastName}
            </span>
          </div>
        </div>
      </div>

      {/* Read-only banner */}
      <div className="bg-info-bg border-b border-info/20">
        <div className="max-w-[1200px] mx-auto px-8 py-2.5 flex items-center gap-2 text-info">
          <Icon name="eye" size={14} />
          <span className="text-xs font-semibold uppercase tracking-caps">
            Read-only view
          </span>
        </div>
      </div>

      {/* Main */}
      <div className="max-w-[1200px] mx-auto px-8 py-10">
        {/* Title */}
        <div className="mb-6">
          <div className="type-eyebrow mb-2">{modeLabel(session.mode)}</div>
          <h1 className="type-display-md text-text-primary mb-3">
            {dateStr} <span className="text-text-tertiary">· {timeStr}</span>
          </h1>
          <div className="flex flex-wrap gap-2">
            <MetricPill icon={<Icon name="location-marker" size={14} />} label="Env" value={session.environment} />
            <MetricPill icon={<Icon name="tag" size={14} />} label="Ball" value={session.ballType} />
            {session.elevation > 0 && (
              <MetricPill icon={<Icon name="trending-up" size={14} />} label="Elev" value={`${session.elevation} ft`} />
            )}
          </div>
        </div>

        {/* Insight tiles */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          <MetricTile
            label="Avg Carry"
            value={insights.avgCarry.toFixed(0)}
            unit="yds"
            rating={distanceRating}
            sub={`Across ${insights.shotCount} shots`}
            icon={<MetricIcon name="carry" size={26} />}
          />
          <MetricTile
            label="Strike Quality"
            value={insights.avgSmash.toFixed(2)}
            rating={strike}
            sub="Smash factor — how cleanly the ball was struck"
            icon={<MetricIcon name="smash-factor" size={26} />}
          />
          <MetricTile
            label="Spread"
            value={insights.sideCarrySd.toFixed(0)}
            unit="yds"
            rating={spread}
            sub="Typical left/right miss"
            icon={<MetricIcon name="side-carry" size={26} />}
          />
          <MetricTile
            label="Surprise Shots"
            value={insights.outlierCount}
            rating={
              insights.outlierCount === 0
                ? { label: 'All on target', tone: 'positive' }
                : { label: 'Worth a look', tone: 'warn' }
            }
            sub={
              insights.outlierCount === 0
                ? 'No shots landed way off the usual'
                : 'Shots well off the usual for that club'
            }
            icon={<Icon name="exclamation-circle" size={20} />}
          />
        </div>

        {/* Narratives */}
        {narratives.length > 0 && (
          <div className="mb-10">
            <h2 className="type-label-sm text-text-tertiary tracking-caps mb-3">
              Today's takeaways
            </h2>
            <div className="flex flex-col gap-3">
              {narratives.map((n, i) => (
                <NarrativeCard key={i} narrative={n} />
              ))}
            </div>
          </div>
        )}

        {/* Dispersion */}
        <section className="bg-white rounded-2xl border border-border-subtle shadow-sm p-6 mb-8">
          <div className="flex items-baseline justify-between mb-1">
            <h2 className="type-h2 text-text-primary">Shot Dispersion</h2>
            <span className="text-xs text-text-tertiary">
              Target is the dashed centreline
            </span>
          </div>
          <p className="type-body-sm text-text-secondary mb-4">
            Each dot is a shot; ringed dots are per-club averages.
          </p>
          <DispersionPlot shots={session.shots} byClub={insights.byClub} />
        </section>

        {/* Breakdown */}
        <section className="bg-white rounded-2xl border border-border-subtle shadow-sm p-6 mb-10">
          <div className="flex items-baseline justify-between mb-4">
            <h2 className="type-h2 text-text-primary">Per-Club Breakdown</h2>
            <span className="text-xs text-text-tertiary">
              Tap a row to expand shot-level detail
            </span>
          </div>
          <ClubBreakdownTable byClub={insights.byClub} shots={session.shots} />
        </section>

        {/* Footer CTA */}
        <div className="bg-white rounded-2xl border border-border-subtle shadow-sm p-6 flex items-center justify-between gap-4">
          <div>
            <div className="type-h4 text-text-primary mb-0.5">
              Track your own game with Rapsodo Golf
            </div>
            <div className="type-body-sm text-text-secondary">
              MLM2PRO and MLM — your shots, your trends, on R-Cloud.
            </div>
          </div>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-md bg-rap-red text-white text-sm font-semibold uppercase tracking-cta hover:bg-rap-red-hover transition-colors"
          >
            Learn more
            <Icon name="arrow-right" size={14} />
          </Link>
        </div>
      </div>
    </div>
  );
}
