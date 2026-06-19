'use client';

import clsx from 'clsx';
import { CLUBS } from '@/lib/clubs';
import { aimByClub, type AimRecommendation } from '@/lib/smartAim';
import type { Shot, ClubId } from '@/lib/types';

interface Props {
  shots: Shot[];
  /** Restrict to a subset of clubs (e.g. the current Bag-tab selection). */
  onlyClubs?: ClubId[];
}

/**
 * Course-management surface: takes the dispersion you already plot and
 * turns it into a single plain-English aim instruction per club. The
 * fairway-fit number assumes a 30-yd wide window, picked because it's
 * roughly the width of a typical mid-handicap landing area.
 */
export default function SmartAimCard({ shots, onlyClubs }: Props) {
  const all = aimByClub(shots);
  const filtered = onlyClubs
    ? all.filter((r) => onlyClubs.includes(r.club))
    : all;
  if (!filtered.length) return null;

  // Sort by how much we'd shift them — biggest aim corrections first, so the
  // most actionable advice leads.
  const ordered = filtered.slice().sort(
    (a, b) => Math.abs(b.aimOffset) - Math.abs(a.aimOffset),
  );

  return (
    <section className="rcl-card bg-white rounded-2xl border border-border-subtle shadow-sm p-6 mb-8">
      <div className="flex items-baseline justify-between mb-1">
        <h2 className="type-h2 text-text-primary">Smart aim</h2>
        <span className="text-xs text-text-tertiary">Pattern-centred targets</span>
      </div>
      <p className="type-body-sm text-text-secondary mb-5 max-w-prose">
        Aim instructions derived from your dispersion. Aiming the offset
        below puts the centre of your pattern on the target, so you fit
        more shots inside a 30-yd window.
      </p>

      <div className="flex flex-col gap-2">
        {ordered.map((r) => (
          <AimRow key={r.club} rec={r} />
        ))}
      </div>
    </section>
  );
}

function AimRow({ rec }: { rec: AimRecommendation }) {
  const yds = Math.round(Math.abs(rec.aimOffset));
  const dir = rec.aimOffset > 0 ? 'right' : 'left';
  const straight = yds <= 2;
  const fitPct = Math.round(rec.fairwayFitPct * 100);

  return (
    <div className="flex items-center gap-3 py-2 border-b border-border-subtle/60 last:border-0">
      <span
        className="shrink-0 w-8 h-8 rounded-pill flex items-center justify-center text-[11px] font-bold text-white"
        style={{ backgroundColor: CLUBS[rec.club].color }}
      >
        {rec.club}
      </span>

      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold text-text-primary leading-tight">
          {straight ? (
            <>Aim straight — pattern centres on target.</>
          ) : (
            <>
              Aim <span className="tabular-nums">{yds}</span> yds {dir}
              <span className="text-text-tertiary"> to centre on target.</span>
            </>
          )}
        </div>
        <div className="text-[11px] text-text-tertiary mt-0.5">
          {rec.shots} shots · ±{rec.spreadSd.toFixed(0)} yds spread · {fitPct}% fit a 30-yd window
        </div>
      </div>

      <span
        className={clsx(
          'shrink-0 text-[11px] font-bold uppercase tracking-caps px-2 py-0.5 rounded-pill',
          rec.confidence === 'high'   && 'bg-sport-golf/15 text-sport-golf-700',
          rec.confidence === 'medium' && 'bg-neutral-100   text-text-secondary',
          rec.confidence === 'low'    && 'bg-warning-bg    text-warning',
        )}
        title={`Confidence based on sample size (${rec.shots} shots)`}
      >
        {rec.confidence}
      </span>
    </div>
  );
}
