import Link from 'next/link';
import clsx from 'clsx';
import Icon from './Icon';
import { CLUBS } from '@/lib/clubs';
import type {
  ImprovementInsight, Narrative, NarrativeKind,
} from '@/lib/stats';
import type { ClubId } from '@/lib/types';
import type { StrokeIconName } from './Icon';

/* ────────────────────────────────────────────────────────────────────
   Today's Read
   Single panel that fuses the two analysis sections we used to ship
   separately: the prioritised narratives and the per-club improvement
   diagnostic. Wins on the left, work-ons on the right.

   Both source shapes (Narrative, ImprovementInsight) normalise into a
   shared ReadItem so the column renderer stays simple.
   ──────────────────────────────────────────────────────────────────── */

interface ReadItem {
  id: string;
  tone: 'positive' | 'warn';
  /** Club this insight is about — when present, surfaces as a coloured chip. */
  club?: ClubId;
  /** Fallback icon for non-club items (e.g. surprise-shots, smash trend). */
  iconKind?: NarrativeKind;
  eyebrow: string;
  headline: string;
  detail: string;
  cta?: { label: string; href: string };
  /** Higher = ranked first within its column. Narratives (already
   *  prioritised in generateNarratives) get a flat boost so headline
   *  takeaways outrank per-club improvement deltas; among improvements,
   *  more shots = higher confidence = higher rank. */
  rank: number;
}

const MAX_PER_COLUMN = 5;

const NARRATIVE_ICON: Record<NarrativeKind, StrokeIconName> = {
  'best-club':       'badge-check',
  'worst-club':      'chart-bar',
  'smash-up':        'trending-up',
  'smash-down':      'trending-down',
  'surprise-shots':  'exclamation-circle',
};

export default function TodaysRead({
  narratives,
  improvements,
}: {
  narratives: Narrative[];
  improvements: ImprovementInsight[];
}) {
  const items = [
    ...narratives.map(narrativeToItem),
    ...improvements.map(improvementToItem),
  ];
  // Sort by rank descending then cap each column — keeps the highest-
  // impact 5 wins and 5 work-ons so a chatty session doesn't bury the
  // headlines in noise.
  const byRank = (a: ReadItem, b: ReadItem) => b.rank - a.rank;
  const wins = items.filter((i) => i.tone === 'positive').sort(byRank).slice(0, MAX_PER_COLUMN);
  const workOns = items.filter((i) => i.tone === 'warn').sort(byRank).slice(0, MAX_PER_COLUMN);

  if (wins.length === 0 && workOns.length === 0) return null;

  // One column if a side is empty; otherwise side-by-side.
  const twoCol = wins.length > 0 && workOns.length > 0;

  return (
    <section className="bg-white rounded-2xl border border-border-subtle shadow-sm p-6 mb-10">
      <div className="flex items-baseline justify-between mb-5">
        <h2 className="type-h2 text-text-primary">Today's Read</h2>
        <span className="text-xs text-text-tertiary">
          Vs your usual on each club
        </span>
      </div>

      <div
        className={clsx(
          'grid gap-4',
          twoCol ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1',
        )}
      >
        {wins.length > 0 && (
          <ReadColumn
            label="Wins"
            tone="positive"
            icon="trending-up"
            items={wins}
          />
        )}
        {workOns.length > 0 && (
          <ReadColumn
            label="Work-ons"
            tone="warn"
            icon="trending-down"
            items={workOns}
          />
        )}
      </div>
    </section>
  );
}

/* ────────────────────────── Column ────────────────────────── */

function ReadColumn({
  label,
  tone,
  icon,
  items,
}: {
  label: string;
  tone: 'positive' | 'warn';
  icon: StrokeIconName;
  items: ReadItem[];
}) {
  return (
    <div>
      <div
        className={clsx(
          'inline-flex items-center gap-1.5 mb-3 text-[11px] font-bold uppercase tracking-caps',
          tone === 'positive' ? 'text-sport-golf-700' : 'text-warning',
        )}
      >
        <Icon name={icon} size={12} />
        {label}
        <span
          className={clsx(
            'inline-block min-w-[18px] text-center px-1.5 py-0.5 rounded-pill text-[10px] font-bold leading-none',
            tone === 'positive'
              ? 'bg-sport-golf/15 text-sport-golf-700'
              : 'bg-warning-bg text-warning',
          )}
        >
          {items.length}
        </span>
      </div>
      <div className="flex flex-col gap-3">
        {items.map((item) => (
          <ReadRow key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
}

/* ────────────────────────── Row ────────────────────────── */

function ReadRow({ item }: { item: ReadItem }) {
  const positive = item.tone === 'positive';
  const def = item.club ? CLUBS[item.club] : null;

  return (
    <div
      className={clsx(
        'rounded-lg border p-4 flex items-start gap-3',
        positive
          ? 'border-sport-golf/30 bg-sport-golf/5'
          : 'border-warning/30 bg-warning-bg/40',
      )}
    >
      {def ? (
        <span
          className="w-9 h-9 rounded-pill flex items-center justify-center text-[11px] font-bold text-white shrink-0"
          style={{ backgroundColor: def.color }}
        >
          {item.club}
        </span>
      ) : (
        <span
          className={clsx(
            'w-9 h-9 rounded-pill flex items-center justify-center shrink-0',
            positive
              ? 'bg-sport-golf/15 text-sport-golf-700'
              : 'bg-warning-bg text-warning',
          )}
        >
          <Icon
            name={item.iconKind ? NARRATIVE_ICON[item.iconKind] : 'sparkles'}
            size={18}
          />
        </span>
      )}

      <div className="flex-1 min-w-0">
        <div
          className={clsx(
            'text-[11px] font-bold uppercase tracking-caps mb-1',
            positive ? 'text-sport-golf-700' : 'text-warning',
          )}
        >
          {item.eyebrow}
        </div>
        <div className="text-sm font-semibold text-text-primary leading-tight mb-1">
          {item.headline}
        </div>
        <div className="text-xs text-text-secondary">{item.detail}</div>

        {item.cta && (
          <Link
            href={item.cta.href}
            className="inline-flex items-center gap-1.5 mt-2 text-xs font-semibold text-rap-red hover:text-rap-red-hover transition-colors"
          >
            {item.cta.label}
            <Icon name="arrow-right" size={12} />
          </Link>
        )}
      </div>
    </div>
  );
}

/* ────────────────────────── Adapters ────────────────────────── */

/** Rank baselines — narratives are pre-prioritised session headlines, so
 *  they sit above per-club improvement rows. Within narratives, earlier
 *  index = higher priority. Within improvements, more shots = more
 *  confidence in the signal = higher rank. */
const NARRATIVE_BASE_RANK = 1000;

function narrativeToItem(n: Narrative, idx: number): ReadItem {
  // Neutral narratives (e.g. "worst-club") map to work-ons — they're
  // not celebrations, even if not strictly negative.
  const tone: ReadItem['tone'] = n.tone === 'positive' ? 'positive' : 'warn';
  return {
    id: `n-${n.kind}-${idx}`,
    tone,
    club: n.club,
    iconKind: n.kind,
    eyebrow: n.eyebrow,
    headline: n.headline,
    detail: n.detail,
    cta: n.cta,
    rank: NARRATIVE_BASE_RANK - idx,
  };
}

function improvementToItem(i: ImprovementInsight): ReadItem {
  return {
    id: `i-${i.id}`,
    tone: i.trend === 'improved' ? 'positive' : 'warn',
    club: i.club,
    eyebrow: `${i.metricLabel} · ${i.shotCount} swings`,
    headline: i.headline,
    detail: i.detail,
    rank: i.shotCount,
  };
}
