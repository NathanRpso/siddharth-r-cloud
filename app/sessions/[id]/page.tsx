import Link from 'next/link';
import { notFound } from 'next/navigation';
import { SESSIONS, getSession } from '@/lib/mockData';

// Pre-render every session at build time — required for static export
// (output: 'export'). Data is deterministic mock so this is safe.
export function generateStaticParams() {
  return SESSIONS.map((s) => ({ id: s.id }));
}
import { sessionInsights } from '@/lib/stats';
import { deriveSessionTitle, modeLabel } from '@/lib/sessionTitle';
import EditableSessionTitle from '@/components/EditableSessionTitle';
import TopBar from '@/components/TopBar';
import MetricPill from '@/components/MetricPill';
import ConditionsBadge from '@/components/ConditionsBadge';
import Icon from '@/components/Icon';
import DiagnosticDrilldown from '@/components/DiagnosticDrilldown';
import CourseDrilldown from '@/components/CourseDrilldown';
import CombineDrilldown from '@/components/CombineDrilldown';
import TargetRangeDrilldown from '@/components/TargetRangeDrilldown';
import ClosestToPinDrilldown from '@/components/ClosestToPinDrilldown';

export default function SessionDetailPage({ params }: { params: { id: string } }) {
  const session = getSession(params.id);
  if (!session) notFound();

  // Guard — a session with no shots shouldn't exist; the drilldowns each
  // recompute the slice of insights they actually need.
  if (!sessionInsights(session)) notFound();

  const date = new Date(session.date);
  const dateStr = date.toLocaleDateString('en-GB', {
    weekday: 'short', day: '2-digit', month: 'short', year: 'numeric',
  });
  const timeStr = date.toLocaleTimeString('en-GB', {
    hour: '2-digit', minute: '2-digit',
  });

  // Contextual title (venue / course / mode-default) — same derivation
  // the list cards use, so identity matches across surfaces.
  const derivedTitle = deriveSessionTitle(session);
  const isCourse = session.mode === 'Course';

  const devicesUsed = Array.from(new Set(session.shots.map((s) => s.device)));
  const devicesLabel = devicesUsed.join(' + ');

  // Route to the drilldown that fits what the golfer was actually doing.
  // Each mode collapses into one of three templates: diagnostic (open
  // practice), target/scored (intent-vs-result), or on-course (scorecard).
  const drilldown =
    session.mode === 'Course'         ? <CourseDrilldown session={session} />
    : session.mode === 'Combine'        ? <CombineDrilldown session={session} />
    : session.mode === 'Target Range'   ? <TargetRangeDrilldown session={session} />
    : session.mode === 'Closest to Pin' ? <ClosestToPinDrilldown session={session} />
    : <DiagnosticDrilldown session={session} />;

  return (
    <>
      {/* Full-width header strip — contextual title (renameable) + meta
          on the left, sync pill + actions on the right. Shared across all
          session types. */}
      <header className="px-6 sm:px-8 lg:px-10 pt-8 pb-8">
        <Link
          href="/sessions"
          className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary mb-4 transition-colors"
        >
          <Icon name="arrow-left" size={16} />
          All sessions
        </Link>
        <div className="flex items-start justify-between gap-6">
          <div className="min-w-0 flex-1">
            <div className="type-eyebrow mb-2">{modeLabel(session.mode)}</div>
            <EditableSessionTitle
              sessionId={session.id}
              defaultTitle={derivedTitle.title}
              inlineCity={derivedTitle.inlineCity}
            />
            <div className="mt-2 text-sm text-text-secondary">
              {dateStr} · {timeStr}
              {derivedTitle.subtitle && <> · {derivedTitle.subtitle}</>}
            </div>
            <div className="flex flex-wrap gap-2 mt-4 items-center">
              <MetricPill icon={<Icon name="tag" size={14} />} label="Ball" value={session.ballType} />
              {session.elevation > 0 && (
                <MetricPill icon={<Icon name="trending-up" size={14} />} label="Elev" value={`${session.elevation} ft`} />
              )}
              <MetricPill icon={<Icon name="desktop-computer" size={14} />} label="Device" value={devicesLabel} />
              {session.conditions && <ConditionsBadge conditions={session.conditions} size="md" />}
            </div>
          </div>
          <div className="flex flex-col items-end gap-3 shrink-0">
            <TopBar />
            <div className="flex items-center gap-2">
              {/* Primary action: jump straight into Shot Review for this
                  session. For Course rounds this lands on the 18-hole
                  layout; for everything else, the standard shot rail. */}
              <Link
                href={`/shot-review?session=${session.id}`}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md bg-rap-red text-white text-sm font-semibold uppercase tracking-cta hover:bg-rap-red-hover transition-colors shadow-sm"
              >
                <Icon name={isCourse ? 'flag' : 'video-camera'} size={16} />
                {isCourse ? 'Review round' : 'Review shots'}
              </Link>
              <Link
                href={`/share/${session.id}`}
                target="_blank"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md bg-transparent border border-border-default text-text-primary text-sm font-semibold uppercase tracking-cta hover:bg-neutral-50 transition-colors"
              >
                <Icon name="share" size={16} />
                Share
              </Link>
              <button className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md bg-transparent border border-border-default text-text-primary text-sm font-semibold uppercase tracking-cta hover:bg-neutral-50 transition-colors">
                <Icon name="download" size={16} />
                Export
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="px-6 sm:px-8 lg:px-10 pb-10">
        <div className="max-w-[1400px]">
          {drilldown}
        </div>
      </div>
    </>
  );
}
