import Link from 'next/link';
import Icon from './Icon';
import Sparkline from './Sparkline';
import type { Session } from '@/lib/types';
import { sessionInsights, rateConsistency } from '@/lib/stats';
import { modeLabel } from '@/lib/sessionTitle';
import clsx from 'clsx';

export default function RecentSessionRow({ session }: { session: Session }) {
  const insights = sessionInsights(session);
  if (!insights) return null;

  const sparkValues = session.shots
    .slice()
    .sort((a, b) => +new Date(a.timestamp) - +new Date(b.timestamp))
    .map((s) => s.carry);

  const date = new Date(session.date);
  const dateStr = date.toLocaleDateString('en-GB', {
    weekday: 'short', day: '2-digit', month: 'short',
  });

  const consistency = rateConsistency(insights.consistencyScore);
  const summary =
    insights.outlierCount > 0
      ? `${insights.outlierCount} surprise shot${insights.outlierCount > 1 ? 's' : ''}`
      : `${consistency.label.toLowerCase()} session`;

  return (
    <Link
      href={`/sessions/${session.id}`}
      className="group flex items-center gap-4 px-5 py-4 rounded-lg hover:bg-neutral-50 transition-colors"
    >
      {/* Date */}
      <div className="w-20 shrink-0">
        <div className="text-[11px] font-bold uppercase tracking-caps text-text-tertiary">
          {dateStr.split(' ')[0]}
        </div>
        <div className="text-sm font-semibold text-text-primary">
          {dateStr.split(' ').slice(1).join(' ')}
        </div>
      </div>

      {/* Mode + meta */}
      <div className="w-28 shrink-0">
        <div className="type-label-sm text-text-tertiary tracking-caps">{modeLabel(session.mode)}</div>
        <div className="text-sm text-text-secondary">
          {insights.shotCount} shots · {insights.clubCount} clubs
        </div>
      </div>

      {/* Summary */}
      <div className="flex-1 min-w-0">
        <div className="text-sm text-text-primary">
          {insights.avgCarry.toFixed(0)} yds avg carry
        </div>
        <div
          className={clsx(
            'text-xs',
            insights.outlierCount > 0 ? 'text-warning' : 'text-text-secondary',
          )}
        >
          {summary}
        </div>
      </div>

      {/* Sparkline */}
      <div className="shrink-0 hidden md:block">
        <Sparkline values={sparkValues} width={120} height={32} />
      </div>

      {/* Chevron */}
      <span className="text-text-tertiary group-hover:text-text-primary transition-colors shrink-0">
        <Icon name="chevron-right" size={18} />
      </span>
    </Link>
  );
}
