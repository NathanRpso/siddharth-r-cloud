'use client';

import Link from 'next/link';
import clsx from 'clsx';
import Icon from './Icon';
import {
  sessionInsights, sessionScore,
  type CardHeadline, type SessionScore, type ScoreBand,
} from '@/lib/stats';
import { CLUBS } from '@/lib/clubs';
import { deriveSessionTitle, modeLabel } from '@/lib/sessionTitle';
import { useSessionRename } from '@/lib/sessionRename';
import type { ClubId, CourseInfo, Session } from '@/lib/types';

/** One session, rendered as a card.
 *
 *  Three-column layout: type tile · contextual body · score container.
 *
 *  - Title is the LOCATION/CONTEXT (venue name, course name, or a
 *    mode-friendly default) so the user reads "where" first.
 *  - Mode pill states the literal game mode (Range / Practice / etc.).
 *  - Headline is a single-line text-with-icon — distinct from the mode
 *    pill so the eye doesn't have to disambiguate two pills.
 *  - Right column is a labelled score container so the metric reads as
 *    a clear, anchored summary rather than a floating number. */
export default function SessionCard({
  session,
  headline,
}: {
  session: Session;
  headline?: CardHeadline | null;
}) {
  const insights = sessionInsights(session);
  if (!insights) return null;

  const isCourse = session.mode === 'Course' && !!session.course;
  const score = sessionScore(insights);

  const date = new Date(session.date);
  const dateStr = date.toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  });

  // Duration estimate — ~2 min per shot, rounded to nearest 5.
  const durationMin = Math.round((insights.shotCount * 2) / 5) * 5;
  const durationLabel =
    durationMin >= 60
      ? `${Math.floor(durationMin / 60)}h ${durationMin % 60}m`
      : `${durationMin} min`;

  const derived = deriveSessionTitle(session);
  const { rename } = useSessionRename(session.id);
  const title = rename ?? derived.title;
  const subtitle = derived.subtitle;
  const inlineCity = derived.inlineCity;
  const topClubs = practiceTopClubs(session);

  return (
    <Link
      href={`/sessions/${session.id}`}
      className="group block bg-white rounded-2xl border border-border-subtle shadow-sm hover:shadow-md hover:border-border-default transition-all overflow-hidden"
    >
      <div className="flex items-start gap-4 p-5">
        {/* Type tile — green for practice, blue for course. */}
        <div
          className={clsx(
            'w-14 h-14 rounded-xl flex items-center justify-center shrink-0 text-white',
            isCourse ? 'bg-info' : 'bg-sport-golf-700',
          )}
        >
          <Icon name={isCourse ? 'flag' : 'chart-bar'} size={26} />
        </div>

        {/* Middle column — context, mode, headline, clubs */}
        <div className="flex-1 min-w-0">
          <div className="type-h3 text-text-primary truncate">
            {title}
            {inlineCity && (
              <span className="ml-2 text-sm font-normal text-text-tertiary">
                {inlineCity}
              </span>
            )}
          </div>
          {subtitle && (
            <div className="text-sm text-text-tertiary truncate mt-0.5">
              {subtitle}
            </div>
          )}

          <div className="mt-2.5">
            <span
              className={clsx(
                'inline-flex items-center px-2.5 py-1 rounded-pill text-[11px] font-bold uppercase tracking-caps',
                isCourse
                  ? 'bg-info-bg text-info'
                  : 'bg-neutral-100 text-text-secondary',
              )}
            >
              {modeLabel(session.mode)}
            </span>
          </div>

          {/* Clubs row — practice only. */}
          {!isCourse && topClubs && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {topClubs.clubs.map((c) => (
                <span
                  key={c}
                  className="px-2 py-0.5 rounded-pill text-[10px] font-bold uppercase tracking-caps text-white"
                  style={{ backgroundColor: CLUBS[c].color }}
                >
                  {c}
                </span>
              ))}
              {topClubs.overflow > 0 && (
                <span className="px-2 py-0.5 rounded-pill bg-neutral-100 text-text-secondary text-[10px] font-bold uppercase tracking-caps">
                  +{topClubs.overflow}
                </span>
              )}
            </div>
          )}

          {/* Insight — sits as the last element in the middle column. On
              course cards (which have no clubs row) we add extra top
              margin so the insight aligns vertically with practice cards
              when scanning a mixed list. */}
          {headline && (
            <div className={isCourse ? 'mt-10' : 'mt-3'}>
              <HeadlineCallout headline={headline} />
            </div>
          )}
        </div>

        {/* Right column — date + score container */}
        <div className="flex flex-col items-end shrink-0 text-right">
          <div className="text-sm text-text-tertiary mb-2">{dateStr}</div>
          {isCourse && session.course ? (
            <CourseScorePanel course={session.course} />
          ) : (
            <PracticeScorePanel score={score} />
          )}
        </div>
      </div>

      {/* Footer — duration + shot count, divider above for visual rhythm */}
      <div className="flex items-center gap-5 px-5 py-3 border-t border-border-subtle text-sm text-text-tertiary">
        <span className="inline-flex items-center gap-1.5">
          <Icon name="clock" size={14} />
          {durationLabel}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Icon name="chart-square" size={14} />
          {insights.shotCount} shots
        </span>
      </div>
    </Link>
  );
}

/* ────────────────────── Top-5 clubs ────────────────────── */

function practiceTopClubs(session: Session): {
  clubs: ClubId[];
  overflow: number;
} | null {
  const counts = new Map<ClubId, number>();
  for (const s of session.shots) {
    counts.set(s.club, (counts.get(s.club) ?? 0) + 1);
  }
  if (counts.size === 0) return null;
  const sorted = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  const top = sorted.slice(0, 5).map(([c]) => c);
  return { clubs: top, overflow: Math.max(0, sorted.length - 5) };
}

/* ────────────────────── Headline ────────────────────── */

/** Plain text + leading icon — no background, deliberately unlike the
 *  mode pill so the two don't read as the same type of element. Tone
 *  drives the colour (sport-golf for positive, warning for warn). The
 *  parent owns the top margin so the same component works in either
 *  card-type slot. */
function HeadlineCallout({ headline }: { headline: CardHeadline }) {
  const positive = headline.tone === 'positive';
  return (
    <div
      className={clsx(
        'flex items-center gap-1.5 text-sm font-semibold',
        positive ? 'text-sport-golf-700' : 'text-warning',
      )}
    >
      <Icon
        name={positive ? 'sparkles' : 'exclamation-circle'}
        size={14}
      />
      <span className="truncate">{headline.text}</span>
    </div>
  );
}

/* ────────────────────── Score panels ────────────────────── */

/** Sub-card container on the right column. Holds the score block as
 *  the visual anchor of the card. Optional label sits as a small cap
 *  above the number — used on practice (where the "/100" needs context)
 *  but skipped on course (where strokes/holes are self-explanatory). */
function ScoreShell({
  label,
  children,
}: {
  label?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-neutral-50 border border-border-subtle rounded-lg px-4 py-3 min-w-[140px]">
      {label && (
        <div className="type-label-sm text-text-tertiary tracking-caps mb-1.5">
          {label}
        </div>
      )}
      {children}
    </div>
  );
}

/** Colour the grade number by band, so a high (good) grade reads green and a
 *  poor one reads amber — reinforcing "higher is better" at a glance. */
const GRADE_COLOR: Record<ScoreBand, string> = {
  great:  'text-sport-golf-700',
  solid:  'text-sport-golf-700',
  decent: 'text-text-primary',
  off:    'text-warning',
};

/** Practice sessions are graded out of 100 (higher = better). Labelled
 *  "Session grade" — never just "Score" — so it can't be mistaken for a
 *  strokes total sitting next to a course round in the same list. */
function PracticeScorePanel({ score }: { score: SessionScore }) {
  return (
    <ScoreShell label="Session grade">
      <div className="flex items-baseline justify-end gap-1.5">
        <span className={clsx(
          'font-display italic font-extrabold uppercase tracking-tight leading-none tabular-nums text-5xl',
          GRADE_COLOR[score.band],
        )}>
          {score.value}
        </span>
        <span className="font-display italic font-extrabold uppercase tracking-tight leading-none tabular-nums text-text-tertiary text-2xl">
          / 100
        </span>
      </div>
      <div className={clsx(
        'text-[11px] font-bold uppercase tracking-caps mt-2 text-right',
        GRADE_COLOR[score.band],
      )}>
        {score.label}
      </div>
    </ScoreShell>
  );
}

/** Course rounds show real strokes (lower = better) with the to-par figure,
 *  labelled "Score" — a different shape entirely from the graded panel. */
function CourseScorePanel({ course }: { course: CourseInfo }) {
  const overPar = course.strokes - course.par;
  const sign = overPar > 0 ? '+' : '';
  const toPar = overPar === 0 ? 'Even par' : `${sign}${overPar} to par`;
  return (
    <ScoreShell label="Score · strokes">
      <div className="flex items-baseline justify-end gap-1.5">
        <span className="font-display italic font-extrabold uppercase tracking-tight leading-none tabular-nums text-text-primary text-5xl">
          {course.strokes}
        </span>
        {overPar !== 0 && (
          <span className="font-display italic font-extrabold uppercase tracking-tight leading-none tabular-nums text-text-tertiary text-2xl">
            {sign}
            {overPar}
          </span>
        )}
      </div>
      <div className="text-[11px] text-text-tertiary font-semibold uppercase tracking-caps mt-2 text-right">
        {toPar} · {course.holesPlayed} holes
      </div>
    </ScoreShell>
  );
}
