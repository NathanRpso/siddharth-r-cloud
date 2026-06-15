import Link from 'next/link';
import clsx from 'clsx';
import Icon, { type StrokeIconName } from './Icon';
import Sparkline from './Sparkline';
import { CLUBS } from '@/lib/clubs';
import type { HeroInsight } from '@/lib/stats';
import { weeklyTrend } from '@/lib/stats';
import type { Shot } from '@/lib/types';

const KIND_ICON: Record<HeroInsight['kind'], StrokeIconName> = {
  'smash-up':   'trending-up',
  'smash-down': 'trending-down',
  'carry-up':   'trending-up',
  'carry-down': 'trending-down',
  'best-club':  'badge-check',
};

const TONE_TEXT = {
  positive: 'text-sport-golf-700',
  warn:     'text-warning',
  neutral:  'text-text-secondary',
} as const;

const TONE_BORDER = {
  positive: 'border-sport-golf/40',
  warn:     'border-warning/40',
  neutral:  'border-border-subtle',
} as const;

const TONE_SPARK = {
  positive: '#1CB864',
  warn:     '#F59E0B',
  neutral:  '#5C616B',
} as const;

const TONE_SPARK_FILL = {
  positive: 'rgba(28,184,100,0.12)',
  warn:     'rgba(245,158,11,0.12)',
  neutral:  'rgba(92,97,107,0.10)',
} as const;

export default function HeroCard({
  insight,
  shots,
}: {
  insight: HeroInsight;
  shots: Shot[];
}) {
  // Filter shots to the relevant club if this insight is club-specific.
  const series = insight.club ? shots.filter((s) => s.club === insight.club) : shots;
  const trend = weeklyTrend(series, insight.metric, 8);
  const values = trend.map((b) => b.avg).filter((v): v is number => v !== null);

  return (
    <div className={clsx(
      'rounded-2xl border bg-white shadow-sm p-7 md:p-8 flex items-stretch gap-8',
      TONE_BORDER[insight.tone],
    )}>
      {/* Left visual — club chip or kind icon */}
      <div className="shrink-0">
        {insight.club ? (
          <span
            className="w-14 h-14 rounded-pill flex items-center justify-center text-sm font-bold text-white"
            style={{ backgroundColor: CLUBS[insight.club].color }}
          >
            {insight.club}
          </span>
        ) : (
          <span className={clsx(
            'w-14 h-14 rounded-pill flex items-center justify-center',
            insight.tone === 'positive' && 'bg-sport-golf/15 text-sport-golf-700',
            insight.tone === 'warn'     && 'bg-warning-bg text-warning',
            insight.tone === 'neutral'  && 'bg-neutral-100 text-text-secondary',
          )}>
            <Icon name={KIND_ICON[insight.kind]} size={28} />
          </span>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 flex flex-col">
        <div className={clsx(
          'text-[11px] font-bold uppercase tracking-caps mb-2',
          TONE_TEXT[insight.tone],
        )}>
          {insight.eyebrow}
        </div>
        <h2 className="type-h1 text-text-primary mb-2 leading-tight">
          {insight.headline}
        </h2>
        <p className="type-body text-text-secondary max-w-prose">
          {insight.detail}
        </p>
        <Link
          href="/sessions"
          className="inline-flex items-center gap-1.5 mt-4 text-sm font-semibold text-rap-red hover:text-rap-red-hover transition-colors w-fit"
        >
          See it in context
          <Icon name="arrow-right" size={14} />
        </Link>
      </div>

      {/* Trend sparkline — hidden on small screens */}
      {values.length >= 2 && (
        <div className="hidden md:flex flex-col items-end justify-center shrink-0 w-[220px]">
          <span className="type-label-sm text-text-tertiary mb-2">8-week trend</span>
          <Sparkline
            values={values}
            width={220}
            height={84}
            stroke={TONE_SPARK[insight.tone]}
            fill={TONE_SPARK_FILL[insight.tone]}
          />
        </div>
      )}
    </div>
  );
}
