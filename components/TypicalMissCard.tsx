'use client';

import Link from 'next/link';
import clsx from 'clsx';
import Icon from './Icon';
import { CLUBS } from '@/lib/clubs';
import { typicalMissByClub, type ClubMiss } from '@/lib/typicalMiss';
import type { Shot } from '@/lib/types';

interface Props {
  shots: Shot[];
  /** Cap how many clubs to show — keeps the card scannable. */
  limit?: number;
}

/**
 * Per-club typical-miss readout. Leads with the most persistent miss
 * (where there's something to fix), then trails into the more neutral
 * clubs so a golfer sees both "what's costing me" and "what's holding."
 */
export default function TypicalMissCard({ shots, limit = 5 }: Props) {
  const all = typicalMissByClub(shots);
  if (!all.length) {
    return (
      <section className="rcl-card bg-white rounded-2xl border border-border-subtle shadow-sm p-6 mb-10">
        <Header />
        <p className="type-body-sm text-text-secondary">
          Hit a few more shots and we&apos;ll surface the patterns we see.
        </p>
      </section>
    );
  }

  const top = all.slice(0, limit);
  const lead = top[0];

  return (
    <section className="rcl-card bg-white rounded-2xl border border-border-subtle shadow-sm p-6 mb-10">
      <Header subtitle="Across your last 60 days, what your data actually says." />

      {/* Lead row — a single sentence, golfer-language. */}
      <div
        className={clsx(
          'flex items-start gap-3 px-4 py-3 mb-5 rounded-lg border',
          lead.tone === 'warn'     && 'bg-warning-bg/40 border-warning/30',
          lead.tone === 'neutral'  && 'bg-neutral-50    border-border-subtle',
          lead.tone === 'positive' && 'bg-sport-golf/10 border-sport-golf/30',
        )}
      >
        <span
          className="shrink-0 w-9 h-9 rounded-pill flex items-center justify-center text-[12px] font-bold text-white"
          style={{ backgroundColor: CLUBS[lead.club].color }}
        >
          {lead.club}
        </span>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-text-primary leading-snug">
            {lead.headline}
          </div>
          <div className="text-xs text-text-secondary mt-0.5">
            Based on {lead.count} shots — your most {lead.tone === 'warn' ? 'persistent miss' : 'consistent pattern'}.
          </div>
        </div>
      </div>

      <div className="flex flex-col">
        {top.slice(1).map((m) => (
          <MissRow key={m.club} miss={m} />
        ))}
      </div>

      <Link
        href="/performance?tab=bag"
        className="inline-flex items-center gap-1.5 mt-5 text-sm font-semibold text-rap-red hover:text-rap-red-hover transition-colors"
      >
        See dispersion by club
        <Icon name="arrow-right" size={14} />
      </Link>
    </section>
  );
}

function Header({ subtitle }: { subtitle?: string }) {
  return (
    <div className="mb-4">
      <div className="flex items-baseline justify-between">
        <h2 className="type-h2 text-text-primary">Your typical miss</h2>
        <span className="text-xs text-text-tertiary">By club</span>
      </div>
      {subtitle && (
        <p className="type-body-sm text-text-secondary mt-1">{subtitle}</p>
      )}
    </div>
  );
}

function MissRow({ miss }: { miss: ClubMiss }) {
  return (
    <div className="flex items-center gap-3 py-2 border-b border-border-subtle/60 last:border-0">
      <span
        className="shrink-0 w-7 h-7 rounded-pill flex items-center justify-center text-[10px] font-bold text-white"
        style={{ backgroundColor: CLUBS[miss.club].color }}
      >
        {miss.club}
      </span>
      <span className="flex-1 text-sm text-text-primary leading-tight">
        {miss.headline}
      </span>
      <span
        className={clsx(
          'shrink-0 text-[11px] font-bold uppercase tracking-caps px-2 py-0.5 rounded-pill',
          miss.tone === 'warn'     && 'bg-warning-bg text-warning',
          miss.tone === 'neutral'  && 'bg-neutral-100 text-text-secondary',
          miss.tone === 'positive' && 'bg-sport-golf/15 text-sport-golf-700',
        )}
      >
        {miss.tone === 'warn' ? 'Fix' : miss.tone === 'positive' ? 'Strong' : 'Mixed'}
      </span>
    </div>
  );
}
