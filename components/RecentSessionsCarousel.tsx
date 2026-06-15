'use client';

import Link from 'next/link';
import clsx from 'clsx';
import Icon from './Icon';
import { sessionInsights, sessionScore } from '@/lib/stats';
import { deriveSessionTitle, modeLabel } from '@/lib/sessionTitle';
import { useSessionRename } from '@/lib/sessionRename';
import type { Session } from '@/lib/types';

/** Recent sessions as a grid of compact session tiles that fills the row —
 *  a condensed take on the full SessionCard, leading with the highest-impact
 *  info (score, context, mode, volume). A "View more" CTA sits in the header. */
export default function RecentSessionsCarousel({
  sessions,
}: {
  sessions: Session[];
}) {
  return (
    <section className="mb-10">
      <div className="flex items-baseline justify-between gap-4 mb-3">
        <div>
          <h2 className="type-h2 text-text-primary">Recent sessions</h2>
          <span className="text-xs text-text-tertiary">Last {sessions.length}</span>
        </div>
        <Link
          href="/sessions"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-rap-red hover:text-rap-red-hover"
        >
          View more
          <Icon name="arrow-right" size={14} />
        </Link>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {sessions.map((s) => (
          <CompactSessionTile key={s.id} session={s} />
        ))}
      </div>
    </section>
  );
}

function CompactSessionTile({ session }: { session: Session }) {
  const insights = sessionInsights(session);
  const { rename } = useSessionRename(session.id);
  if (!insights) return null;

  const isCourse = session.mode === 'Course' && !!session.course;
  const score = sessionScore(insights);

  const date = new Date(session.date);
  const dateStr = date.toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short',
  });

  const durationMin = Math.round((insights.shotCount * 2) / 5) * 5;
  const durationLabel =
    durationMin >= 60
      ? `${Math.floor(durationMin / 60)}h ${durationMin % 60}m`
      : `${durationMin} min`;

  const derived = deriveSessionTitle(session);
  const title = rename ?? derived.title;

  const overPar = isCourse && session.course ? session.course.strokes - session.course.par : 0;

  return (
    <Link
      href={`/sessions/${session.id}`}
      className="group relative bg-white rounded-2xl border border-border-subtle shadow-sm hover:shadow-md hover:border-border-default transition-all overflow-hidden flex flex-col"
    >
      {/* Type accent bar */}
      <div className={clsx('h-1', isCourse ? 'bg-info' : 'bg-sport-golf-700')} />

      <div className="p-4 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div
            className={clsx(
              'w-11 h-11 rounded-xl flex items-center justify-center shrink-0 text-white',
              isCourse ? 'bg-info' : 'bg-sport-golf-700',
            )}
          >
            <Icon name={isCourse ? 'flag' : 'chart-bar'} size={22} />
          </div>
          <div className="text-xs text-text-tertiary font-semibold pt-1">{dateStr}</div>
        </div>

        <div className="type-h4 text-text-primary truncate mt-3">{title}</div>
        <div className="mt-2">
          <span
            className={clsx(
              'inline-flex items-center px-2.5 py-1 rounded-pill text-[10px] font-bold uppercase tracking-caps',
              isCourse ? 'bg-info-bg text-info' : 'bg-neutral-100 text-text-secondary',
            )}
          >
            {modeLabel(session.mode)}
          </span>
        </div>

        {/* Score — the visual anchor */}
        <div className="mt-4">
          <div className="type-label-sm text-text-tertiary tracking-caps mb-0.5">
            {isCourse ? 'Strokes' : 'Score'}
          </div>
          {isCourse && session.course ? (
            <div className="flex items-baseline gap-1.5">
              <span className="font-display italic font-extrabold uppercase tracking-tight leading-none tabular-nums text-text-primary text-4xl">
                {session.course.strokes}
              </span>
              {overPar !== 0 && (
                <span className="font-display italic font-extrabold uppercase tracking-tight leading-none tabular-nums text-text-tertiary text-xl">
                  {overPar > 0 ? '+' : ''}{overPar}
                </span>
              )}
            </div>
          ) : (
            <div className="flex items-baseline gap-1">
              <span className="font-display italic font-extrabold uppercase tracking-tight leading-none tabular-nums text-text-primary text-4xl">
                {score.value}
              </span>
              <span className="font-display italic font-extrabold uppercase tracking-tight leading-none tabular-nums text-text-tertiary text-lg">
                / 100
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Footer — volume + open affordance */}
      <div className="flex items-center gap-4 px-4 py-2.5 border-t border-border-subtle text-xs text-text-tertiary">
        <span className="inline-flex items-center gap-1.5">
          <Icon name="clock" size={13} />
          {durationLabel}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Icon name="chart-square" size={13} />
          {insights.shotCount} shots
        </span>
        <span className="ml-auto text-text-tertiary group-hover:text-rap-red transition-colors">
          <Icon name="chevron-right" size={16} />
        </span>
      </div>
    </Link>
  );
}
