'use client';

import { useState } from 'react';
import clsx from 'clsx';
import Icon from './Icon';
import { CLUBS } from '@/lib/clubs';
import type { ImprovementInsight } from '@/lib/stats';

/** Saw / Needs improvement toggle panel — splits the per-club
 *  per-metric diagnostic into two tabs the golfer can flip between.
 *  Where Today's takeaways tells the headline story, this lays out
 *  every concrete delta vs the user's baseline. */
export default function SessionInsightsPanel({
  insights,
}: {
  insights: ImprovementInsight[];
}) {
  const improved  = insights.filter((i) => i.trend === 'improved');
  const needsWork = insights.filter((i) => i.trend === 'needs-work');

  // Default to whichever side has more to say. Ties → improved.
  const [tab, setTab] = useState<'improved' | 'needs-work'>(
    needsWork.length > improved.length ? 'needs-work' : 'improved',
  );

  const list = tab === 'improved' ? improved : needsWork;

  return (
    <section className="bg-white rounded-2xl border border-border-subtle shadow-sm p-6 mb-10">
      <div className="flex items-baseline justify-between mb-4">
        <h2 className="type-h2 text-text-primary">Insights</h2>
        <span className="text-xs text-text-tertiary">
          Vs your usual on each club
        </span>
      </div>

      {/* Segmented toggle */}
      <div className="inline-flex rounded-pill bg-neutral-100 p-1 mb-5">
        <ToggleButton
          active={tab === 'improved'}
          onClick={() => setTab('improved')}
          tone="positive"
          icon="trending-up"
          count={improved.length}
        >
          Saw improvement
        </ToggleButton>
        <ToggleButton
          active={tab === 'needs-work'}
          onClick={() => setTab('needs-work')}
          tone="warn"
          icon="trending-down"
          count={needsWork.length}
        >
          Needs improvement
        </ToggleButton>
      </div>

      {list.length === 0 ? (
        <EmptyState tab={tab} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {list.map((insight) => (
            <InsightRow key={insight.id} insight={insight} />
          ))}
        </div>
      )}
    </section>
  );
}

function ToggleButton({
  active,
  onClick,
  tone,
  icon,
  count,
  children,
}: {
  active: boolean;
  onClick: () => void;
  tone: 'positive' | 'warn';
  icon: 'trending-up' | 'trending-down';
  count: number;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        'inline-flex items-center gap-2 px-4 py-2 rounded-pill text-sm font-semibold transition-colors',
        active
          ? tone === 'positive'
            ? 'bg-white text-sport-golf-700 shadow-sm'
            : 'bg-white text-warning shadow-sm'
          : 'text-text-secondary hover:text-text-primary',
      )}
    >
      <Icon name={icon} size={14} />
      {children}
      <span className={clsx(
        'inline-block min-w-[20px] text-center px-1.5 py-0.5 rounded-pill text-[10px] font-bold leading-none',
        active
          ? tone === 'positive' ? 'bg-sport-golf/15 text-sport-golf-700' : 'bg-warning-bg text-warning'
          : 'bg-neutral-200 text-text-tertiary',
      )}>
        {count}
      </span>
    </button>
  );
}

function InsightRow({ insight }: { insight: ImprovementInsight }) {
  const def = CLUBS[insight.club];
  const isPositive = insight.trend === 'improved';

  return (
    <div className={clsx(
      'rounded-lg border p-4 flex items-start gap-3',
      isPositive ? 'border-sport-golf/30 bg-sport-golf/5' : 'border-warning/30 bg-warning-bg/40',
    )}>
      <span
        className="w-9 h-9 rounded-pill flex items-center justify-center text-[11px] font-bold text-white shrink-0"
        style={{ backgroundColor: def.color }}
      >
        {insight.club}
      </span>
      <div className="flex-1 min-w-0">
        <div className={clsx(
          'text-[10px] font-bold uppercase tracking-caps mb-1',
          isPositive ? 'text-sport-golf-700' : 'text-warning',
        )}>
          {insight.metricLabel} · {insight.shotCount} swings
        </div>
        <div className="text-sm font-semibold text-text-primary leading-tight mb-1">
          {insight.headline}
        </div>
        <div className="text-xs text-text-secondary">{insight.detail}</div>
      </div>
    </div>
  );
}

function EmptyState({ tab }: { tab: 'improved' | 'needs-work' }) {
  return (
    <div className="rounded-lg border border-dashed border-border-default p-8 text-center">
      <div className="w-10 h-10 rounded-pill bg-neutral-100 flex items-center justify-center mx-auto mb-3 text-text-tertiary">
        <Icon name={tab === 'improved' ? 'trending-up' : 'check-circle'} size={18} />
      </div>
      <p className="text-sm text-text-secondary max-w-md mx-auto">
        {tab === 'improved'
          ? 'No meaningful gains on any club today vs your usual. The full club breakdown below has the raw numbers.'
          : 'Nothing dragging things down on any club today. Solid all round.'}
      </p>
    </div>
  );
}
