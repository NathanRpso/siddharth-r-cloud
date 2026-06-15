import { ALL_SHOTS, SESSIONS } from '@/lib/mockData';
import {
  sessionInsights, compareToBaseline, generateNarratives,
  sessionScore, sessionScoreBreakdown, previousSession,
  sessionHighlights, sessionImprovementInsights,
} from '@/lib/stats';
import type { Session } from '@/lib/types';
import SessionScoreHero from './SessionScoreHero';
import TodaysRead from './TodaysRead';
import DispersionPlot from './DispersionPlot';
import SessionHighlights from './SessionHighlights';
import ShotListEntrypoint from './ShotListEntrypoint';
import ShotList from './ShotList';

/** Drilldown for open-practice sessions (Range, Practice).
 *  The aim was to groove the swing, so the story is consistency,
 *  dispersion, and trend-vs-baseline. */
export default function DiagnosticDrilldown({ session }: { session: Session }) {
  const insights = sessionInsights(session);
  if (!insights) return null;

  const priorShots = ALL_SHOTS.filter(
    (s) => new Date(s.timestamp) < new Date(session.date),
  );
  const deltas = compareToBaseline(session, priorShots);
  const narratives = generateNarratives(insights, deltas, session.id);

  const score = sessionScore(insights);
  const breakdown = sessionScoreBreakdown(insights);
  const prev = previousSession(session.id, SESSIONS);
  const prevInsights = prev ? sessionInsights(prev) : null;
  const prevScore = prevInsights ? sessionScore(prevInsights) : null;

  const highlights = sessionHighlights(session);
  const improvementInsights = sessionImprovementInsights(session, priorShots);
  const videoShots = session.shots.filter((s) => s.hasVideo).length;

  return (
    <>
      <SessionScoreHero score={score} prevScore={prevScore} breakdown={breakdown} />

      <TodaysRead narratives={narratives} improvements={improvementInsights} />

      <section className="bg-white rounded-2xl border border-border-subtle shadow-sm p-6 mb-10">
        <div className="flex items-baseline justify-between mb-1">
          <h2 className="type-h2 text-text-primary">Shot Dispersion</h2>
          <span className="text-xs text-text-tertiary">
            Target is the dashed centreline
          </span>
        </div>
        <p className="type-body-sm text-text-secondary mb-4">
          Each dot is a shot. Larger ringed dots are per-club averages.
          Tap a club chip to isolate.
        </p>
        <DispersionPlot shots={session.shots} byClub={insights.byClub} />
      </section>

      {highlights.length > 0 && (
        <div className="mb-6">
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="type-label-sm text-text-tertiary tracking-caps">
              Session highlights
            </h2>
            <span className="text-xs text-text-tertiary">
              Tap a card to play the video
            </span>
          </div>
          <SessionHighlights highlights={highlights} sessionId={session.id} />
        </div>
      )}

      <ShotListEntrypoint
        sessionId={session.id}
        totalShots={insights.shotCount}
        videoShots={videoShots}
      />

      <ShotList byClub={insights.byClub} shots={session.shots} />
    </>
  );
}
