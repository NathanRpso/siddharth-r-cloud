import clsx from 'clsx';
import { courseScorecard, sessionInsights, sessionHighlights } from '@/lib/stats';
import type { CourseScorecard, NineSummary } from '@/lib/stats';
import type { HoleResult, Session } from '@/lib/types';
import Icon from './Icon';
import SessionHighlights from './SessionHighlights';
import ShotList from './ShotList';

/** Drilldown for a (virtual) course round. The aim was to score, so the
 *  story is the scorecard — score vs par, greens & fairways, putting, and
 *  the shape of the round — not a range-style dispersion view. */
export default function CourseDrilldown({ session }: { session: Session }) {
  const card = courseScorecard(session);
  const insights = sessionInsights(session);
  if (!card || !insights) return null;

  const highlights = sessionHighlights(session);

  return (
    <>
      <CourseHero card={card} courseName={session.course?.name ?? 'Round'} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        <StatCard
          label="Score to par"
          value={toParStr(card.toPar)}
          sub={`${card.strokes} strokes · par ${card.par}`}
          tone={card.toPar <= 0 ? 'positive' : card.toPar <= card.holesPlayed ? 'neutral' : 'warn'}
        />
        <StatCard
          label="Greens in regulation"
          value={`${Math.round(card.girPct * 100)}%`}
          sub={`${card.girCount} of ${card.holesPlayed} greens`}
          tone={card.girPct >= 0.4 ? 'positive' : card.girPct >= 0.25 ? 'neutral' : 'warn'}
        />
        <StatCard
          label="Fairways hit"
          value={`${Math.round(card.fairwayPct * 100)}%`}
          sub={`${card.fairwayHits} of ${card.fairwayEligible} fairways`}
          tone={card.fairwayPct >= 0.5 ? 'positive' : card.fairwayPct >= 0.35 ? 'neutral' : 'warn'}
        />
        <StatCard
          label="Putts"
          value={card.putts}
          sub={`${card.puttsPerHole.toFixed(1)} per hole`}
          tone={card.puttsPerHole <= 1.9 ? 'positive' : card.puttsPerHole <= 2.1 ? 'neutral' : 'warn'}
        />
      </div>

      <ScoringShape card={card} />

      <section className="bg-white rounded-2xl border border-border-subtle shadow-sm p-6 mb-10">
        <div className="flex items-baseline justify-between mb-4">
          <h2 className="type-h2 text-text-primary">Scorecard</h2>
          <ScoreLegend />
        </div>
        <div className="flex flex-col gap-6">
          <NineTable label="Out" holes={card.holes.slice(0, 9)} summary={card.front} />
          {card.back && (
            <NineTable label="In" holes={card.holes.slice(9)} summary={card.back} startHole={10} />
          )}
        </div>
      </section>

      {highlights.length > 0 && (
        <div className="mb-6">
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="type-label-sm text-text-tertiary tracking-caps">
              Round highlights
            </h2>
            <span className="text-xs text-text-tertiary">
              Tap a card to play the video
            </span>
          </div>
          <SessionHighlights highlights={highlights} sessionId={session.id} />
        </div>
      )}

      <div className="mb-3">
        <p className="text-xs text-text-tertiary">
          Captured full swings from the round — putts aren't tracked, so this is
          fewer than total strokes.
        </p>
      </div>
      <ShotList byClub={insights.byClub} shots={session.shots} />
    </>
  );
}

/* ─────────────────────────── Hero ─────────────────────────── */

function CourseHero({ card, courseName }: { card: CourseScorecard; courseName: string }) {
  return (
    <section className="bg-white rounded-2xl border border-border-subtle shadow-sm p-6 mb-3">
      <div className="flex items-center gap-6 flex-wrap">
        <div className="shrink-0">
          <div className="type-eyebrow mb-1">Final score</div>
          <div className="flex items-baseline gap-3">
            <span className="type-display-lg text-text-primary leading-none tabular-nums">
              {card.strokes}
            </span>
            <span
              className={clsx(
                'type-display-xs tabular-nums',
                card.toPar < 0 ? 'text-sport-golf-700'
                  : card.toPar === 0 ? 'text-text-secondary' : 'text-text-primary',
              )}
            >
              {toParStr(card.toPar)}
            </span>
          </div>
          <div className="mt-2 text-sm text-text-secondary">
            {card.holesPlayed} holes at {courseName} · par {card.par}
          </div>
        </div>

        <div className="flex-1 min-w-[220px] flex flex-wrap gap-x-8 gap-y-3 justify-end">
          <NineChip label="Out" nine={card.front} />
          {card.back && <NineChip label="In" nine={card.back} />}
        </div>
      </div>
    </section>
  );
}

function NineChip({ label, nine }: { label: string; nine: NineSummary }) {
  const toPar = nine.strokes - nine.par;
  return (
    <div className="text-right">
      <div className="type-label-sm text-text-tertiary tracking-caps mb-1">{label}</div>
      <div className="flex items-baseline gap-2 justify-end">
        <span className="type-display-xs text-text-primary tabular-nums">{nine.strokes}</span>
        <span className="text-sm text-text-tertiary tabular-nums">{toParStr(toPar)}</span>
      </div>
    </div>
  );
}

/* ─────────────────────── Scoring shape bar ─────────────────────── */

function ScoringShape({ card }: { card: CourseScorecard }) {
  const s = card.scoring;
  const segs = [
    { key: 'eagles', label: 'Eagles+', count: s.eagles, color: '#0E9F6E' },
    { key: 'birdies', label: 'Birdies', count: s.birdies, color: '#1BE377' },
    { key: 'pars', label: 'Pars', count: s.pars, color: '#A3A3A3' },
    { key: 'bogeys', label: 'Bogeys', count: s.bogeys, color: '#F59E0B' },
    { key: 'doubles', label: 'Doubles', count: s.doubles, color: '#EF4444' },
    { key: 'others', label: 'Triple+', count: s.others, color: '#991B1B' },
  ].filter((x) => x.count > 0);
  const total = card.holesPlayed;

  return (
    <section className="bg-white rounded-2xl border border-border-subtle shadow-sm p-6 mb-10">
      <h2 className="type-h2 text-text-primary mb-1">How the round broke down</h2>
      <p className="type-body-sm text-text-secondary mb-4">
        {scoringTakeaway(card)}
      </p>
      <div className="flex h-3 rounded-pill overflow-hidden mb-4">
        {segs.map((seg) => (
          <div
            key={seg.key}
            style={{ width: `${(seg.count / total) * 100}%`, backgroundColor: seg.color }}
            title={`${seg.label}: ${seg.count}`}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-6 gap-y-2">
        {segs.map((seg) => (
          <div key={seg.key} className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-pill shrink-0" style={{ backgroundColor: seg.color }} />
            <span className="text-sm text-text-secondary">
              {seg.label} <span className="font-semibold text-text-primary tabular-nums">{seg.count}</span>
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

function scoringTakeaway(card: CourseScorecard): string {
  const s = card.scoring;
  const goodHoles = s.eagles + s.birdies + s.pars;
  const blowups = s.doubles + s.others;
  if (blowups >= goodHoles && blowups >= 4) {
    return `${blowups} holes ran to double bogey or worse — tightening those up is where the strokes are.`;
  }
  if (goodHoles >= card.holesPlayed * 0.55) {
    return `Par or better on ${goodHoles} holes — a steady round with few blow-ups.`;
  }
  return `Mostly bogey golf with ${blowups} bigger numbers — limiting those is the fastest route to a lower score.`;
}

/* ─────────────────────────── Scorecard table ─────────────────────────── */

function NineTable({
  label,
  holes,
  summary,
  startHole = 1,
}: {
  label: string;
  holes: HoleResult[];
  summary: NineSummary;
  startHole?: number;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] border-collapse">
        <tbody>
          <Row
            head={label}
            cells={holes.map((h) => String(h.hole))}
            total={`${label === 'Out' ? 'Out' : 'In'}`}
            muted
          />
          <Row
            head="Yards"
            cells={holes.map((h) => String(h.yards))}
            total={String(holes.reduce((a, h) => a + h.yards, 0))}
            muted
          />
          <Row
            head="Par"
            cells={holes.map((h) => String(h.par))}
            total={String(summary.par)}
          />
          <tr>
            <Th>Score</Th>
            {holes.map((h) => (
              <td key={h.hole} className="text-center px-1.5 py-2">
                <ScoreCell strokes={h.strokes} par={h.par} />
              </td>
            ))}
            <td className="text-center px-2 py-2 border-l border-border-subtle">
              <span className="type-h4 text-text-primary tabular-nums">{summary.strokes}</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function Row({
  head, cells, total, muted = false,
}: {
  head: string; cells: string[]; total: string; muted?: boolean;
}) {
  return (
    <tr className={clsx(muted && 'text-text-tertiary')}>
      <Th>{head}</Th>
      {cells.map((c, i) => (
        <td
          key={i}
          className={clsx(
            'text-center px-1.5 py-1.5 text-sm tabular-nums',
            muted ? 'text-text-tertiary' : 'text-text-primary font-medium',
          )}
        >
          {c}
        </td>
      ))}
      <td className="text-center px-2 py-1.5 text-sm font-semibold tabular-nums border-l border-border-subtle">
        {total}
      </td>
    </tr>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="text-left type-label-sm text-text-secondary font-semibold pr-3 py-1.5 whitespace-nowrap">
      {children}
    </th>
  );
}

function ScoreCell({ strokes, par }: { strokes: number; par: number }) {
  const d = strokes - par;
  const cls =
    d <= -2 ? 'bg-sport-golf text-white border-transparent rounded-full'
    : d === -1 ? 'border-sport-golf text-sport-golf-700 rounded-full'
    : d === 0 ? 'border-transparent text-text-primary'
    : d === 1 ? 'border-warning text-warning rounded-[5px]'
    : d === 2 ? 'border-danger text-danger rounded-[5px]'
    : 'bg-danger text-white border-transparent rounded-[5px]';
  return (
    <span
      className={clsx(
        'inline-flex items-center justify-center w-7 h-7 border-2 text-sm font-semibold tabular-nums',
        cls,
      )}
    >
      {strokes}
    </span>
  );
}

function ScoreLegend() {
  const items = [
    { label: 'Birdie', cls: 'border-sport-golf rounded-full' },
    { label: 'Par', cls: 'border-border-default rounded-full' },
    { label: 'Bogey', cls: 'border-warning rounded-[4px]' },
    { label: 'Double+', cls: 'border-danger rounded-[4px]' },
  ];
  return (
    <div className="hidden sm:flex items-center gap-3">
      {items.map((it) => (
        <span key={it.label} className="flex items-center gap-1.5 text-xs text-text-tertiary">
          <span className={clsx('w-4 h-4 border-2', it.cls)} />
          {it.label}
        </span>
      ))}
    </div>
  );
}

/* ─────────────────────────── Stat card ─────────────────────────── */

const TONE_TEXT = {
  positive: 'text-sport-golf-700',
  neutral: 'text-text-primary',
  warn: 'text-warning',
} as const;

function StatCard({
  label, value, sub, tone,
}: {
  label: string;
  value: string | number;
  sub: string;
  tone: 'positive' | 'neutral' | 'warn';
}) {
  return (
    <div className="rounded-2xl bg-white border border-border-subtle shadow-sm p-5">
      <div className="type-label-sm text-text-tertiary mb-2">{label}</div>
      <div className={clsx('type-display-md leading-none', TONE_TEXT[tone])}>{value}</div>
      <div className="text-xs text-text-tertiary mt-2">{sub}</div>
    </div>
  );
}

function toParStr(toPar: number): string {
  if (toPar === 0) return 'E';
  return toPar > 0 ? `+${toPar}` : `${toPar}`;
}
