'use client';

import { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import Icon from './Icon';
import type { SessionScore, SessionScoreBreakdown } from '@/lib/stats';

const BAND_FG = {
  great:  'text-sport-golf-700',
  solid:  'text-sport-golf-700',
  decent: 'text-text-primary',
  off:    'text-warning',
} as const;

const BAND_RING = {
  great:  '#1CB864',
  solid:  '#1CB864',
  decent: '#A3A3A3',
  off:    '#F59E0B',
} as const;

/** Big hero score block — the first thing on a Session Detail page.
 *  Shows the 0-100 score in a generous donut, the plain-English band
 *  ("Great session", "Off day"), and the delta vs the prior session.
 *
 *  A small info button opens a per-session breakdown popover that
 *  explains where THIS session's points came from / leaked. The
 *  generic formula sits as a footer line so abstract documentation is
 *  available without dominating the popover. */
export default function SessionScoreHero({
  score,
  prevScore,
  breakdown,
}: {
  score: SessionScore;
  prevScore: SessionScore | null;
  breakdown: SessionScoreBreakdown;
}) {
  const delta = prevScore ? score.value - prevScore.value : null;
  const ring = BAND_RING[score.band];

  // SVG donut math — full circle stroke ratio.
  const R = 56;
  const circumference = 2 * Math.PI * R;
  const offset = circumference * (1 - score.value / 100);

  return (
    <section className="bg-white rounded-2xl border border-border-subtle shadow-sm p-6 mb-3">
      <div className="flex items-center gap-6 flex-wrap">
        {/* Donut score */}
        <div className="relative w-[140px] h-[140px] shrink-0">
          <svg width="140" height="140" viewBox="0 0 140 140" className="-rotate-90">
            <circle
              cx="70" cy="70" r={R}
              fill="none" stroke="#F5F5F5" strokeWidth="12"
            />
            <circle
              cx="70" cy="70" r={R}
              fill="none" stroke={ring} strokeWidth="12"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="type-display-lg text-text-primary leading-none tabular-nums">
              {score.value}
            </span>
            <span className="text-[10px] font-bold uppercase tracking-caps text-text-tertiary mt-1">
              / 100
            </span>
          </div>
        </div>

        {/* Label + delta */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <div className="type-eyebrow">Session score</div>
            <ScoreExplainer breakdown={breakdown} bandLabel={score.label} />
          </div>
          <h2 className={clsx('type-display-sm mb-2', BAND_FG[score.band])}>
            {score.label}
          </h2>
          <p className="type-body text-text-secondary max-w-md">
            A composite of how consistent your distances were, how cleanly you struck
            the ball, and how tight your left/right spread looked across the session.
          </p>
        </div>

        {/* Delta vs prior */}
        {delta !== null && (
          <div className="shrink-0 text-right">
            <div className="type-label-sm text-text-tertiary mb-1">vs last session</div>
            <div
              className={clsx(
                'inline-flex items-center gap-1.5 type-display-xs tabular-nums',
                delta > 0 ? 'text-sport-golf-700' : delta < 0 ? 'text-danger' : 'text-text-secondary',
              )}
            >
              {delta !== 0 && (
                <Icon name={delta > 0 ? 'arrow-up' : 'arrow-down'} size={20} />
              )}
              {delta > 0 ? '+' : ''}
              {delta}
            </div>
            <div className="text-xs text-text-tertiary mt-1">
              Prior: {prevScore!.value} / 100
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

/* ─────────────────── Score explainer popover ─────────────────── */

function ScoreExplainer({
  breakdown,
  bandLabel,
}: {
  breakdown: SessionScoreBreakdown;
  bandLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="How is this score calculated?"
        className={clsx(
          'w-5 h-5 rounded-pill flex items-center justify-center transition-colors',
          open
            ? 'text-text-primary bg-neutral-100'
            : 'text-text-tertiary hover:text-text-primary hover:bg-neutral-100',
        )}
      >
        <Icon name="info-circle" size={14} />
      </button>
      {open && (
        <div className="absolute left-0 top-7 z-30 w-[320px] bg-white rounded-lg border border-border-default shadow-lg p-4">
          <div className="type-label-sm text-text-tertiary tracking-caps mb-2">
            How your {breakdown.total} broke down
          </div>
          <p className="text-sm text-text-secondary mb-4 leading-snug">
            Three axes feed into the score, weighted by how much each one
            shapes a session. Here's where {bandLabel.toLowerCase()} came from:
          </p>

          <div className="space-y-3 mb-4">
            {breakdown.axes.map((axis) => (
              <AxisRow key={axis.key} axis={axis} />
            ))}
          </div>

          {breakdown.outlierPenalty > 0 && (
            <div className="flex items-center justify-between py-2 px-3 rounded-md bg-warning-bg mb-4">
              <div className="text-xs">
                <span className="font-semibold text-warning">
                  {breakdown.outlierCount} surprise shot{breakdown.outlierCount === 1 ? '' : 's'}
                </span>
                <span className="text-text-secondary"> docked from total</span>
              </div>
              <div className="text-sm font-bold text-warning tabular-nums">
                −{breakdown.outlierPenalty.toFixed(0)}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-3 border-t border-border-subtle">
            <span className="text-sm font-semibold text-text-primary">Total</span>
            <span className="font-display italic font-extrabold uppercase tracking-tight leading-none tabular-nums text-text-primary text-2xl">
              {breakdown.total}
              <span className="text-text-tertiary text-base"> / 100</span>
            </span>
          </div>

          <p className="text-[11px] text-text-tertiary mt-3 leading-snug">
            Each axis is scored 0–100 then weighted; surprise shots subtract
            2 points each (max 10). Bands: <strong>Great</strong> 80+ ·{' '}
            <strong>Solid</strong> 65–79 · <strong>Decent</strong> 50–64 ·{' '}
            <strong>Off day</strong> below 50.
          </p>
        </div>
      )}
    </div>
  );
}

function AxisRow({
  axis,
}: {
  axis: SessionScoreBreakdown['axes'][number];
}) {
  const maxContribution = axis.weight * 100;
  const fillPct = (axis.contribution / maxContribution) * 100;
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1 gap-2">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-text-primary leading-tight">
            {axis.label}
          </div>
          <div className="text-[11px] text-text-tertiary leading-tight mt-0.5">
            {axis.description}
          </div>
        </div>
        <div className="text-right tabular-nums shrink-0">
          <span className="text-sm font-bold text-text-primary">
            {axis.contribution.toFixed(1)}
          </span>
          <span className="text-xs text-text-tertiary"> / {maxContribution.toFixed(0)}</span>
        </div>
      </div>
      <div className="h-1.5 bg-neutral-100 rounded-pill overflow-hidden">
        <div
          className="h-full bg-rap-red rounded-pill"
          style={{ width: `${Math.max(0, Math.min(100, fillPct))}%` }}
        />
      </div>
    </div>
  );
}
