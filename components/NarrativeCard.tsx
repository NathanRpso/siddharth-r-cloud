import Link from 'next/link';
import clsx from 'clsx';
import Icon, { type StrokeIconName } from './Icon';
import { CLUBS } from '@/lib/clubs';
import type { Narrative, NarrativeKind } from '@/lib/stats';

const KIND_ICON: Record<NarrativeKind, StrokeIconName> = {
  'best-club':       'badge-check',
  'worst-club':      'chart-bar',
  'smash-up':        'trending-up',
  'smash-down':      'trending-down',
  'surprise-shots':  'exclamation-circle',
};

const TONE_TEXT = {
  positive: 'text-sport-golf-700',
  warn:     'text-warning',
  neutral:  'text-text-secondary',
} as const;

const TONE_BG = {
  positive: 'bg-sport-golf/15 text-sport-golf-700',
  warn:     'bg-warning-bg text-warning',
  neutral:  'bg-neutral-100 text-text-secondary',
} as const;

const TONE_BORDER = {
  positive: 'border-sport-golf/40',
  warn:     'border-warning/40',
  neutral:  'border-border-subtle',
} as const;

export default function NarrativeCard({ narrative }: { narrative: Narrative }) {
  return (
    <div
      className={clsx(
        'rounded-2xl border p-6 flex gap-4 bg-white shadow-sm',
        TONE_BORDER[narrative.tone],
      )}
    >
      {/* Left visual — club chip when the insight is about a club,
          otherwise a kind-specific icon in a tinted pill. */}
      {narrative.club ? (
        <span
          className="w-10 h-10 rounded-pill flex items-center justify-center text-[12px] font-bold text-white shrink-0"
          style={{ backgroundColor: CLUBS[narrative.club].color }}
        >
          {narrative.club}
        </span>
      ) : (
        <span
          className={clsx(
            'w-10 h-10 rounded-pill flex items-center justify-center shrink-0',
            TONE_BG[narrative.tone],
          )}
        >
          <Icon name={KIND_ICON[narrative.kind]} size={20} />
        </span>
      )}

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div
          className={clsx(
            'text-[11px] font-bold uppercase tracking-caps mb-1.5',
            TONE_TEXT[narrative.tone],
          )}
        >
          {narrative.eyebrow}
        </div>
        <div className="type-h4 text-text-primary mb-1">{narrative.headline}</div>
        <div className="type-body-sm text-text-secondary">{narrative.detail}</div>

        {narrative.cta && (
          <Link
            href={narrative.cta.href}
            className="inline-flex items-center gap-1.5 mt-3 text-sm font-semibold text-rap-red hover:text-rap-red-hover transition-colors"
          >
            {narrative.cta.label}
            <Icon name="arrow-right" size={14} />
          </Link>
        )}
      </div>
    </div>
  );
}
