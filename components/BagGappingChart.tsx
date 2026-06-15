'use client';

import Link from 'next/link';
import clsx from 'clsx';
import Icon from './Icon';
import { CLUBS } from '@/lib/clubs';
import {
  BAG_TONE_HEX,
  type BagSlot,
  type BagTone,
} from '@/lib/stats';
import type { ClubId } from '@/lib/types';

interface Props {
  bag: BagSlot[];
  /** Show "View full bag" CTA at the bottom. */
  cta?: boolean;
  /** Visually highlight one club in the supplied tone colour. */
  highlight?: { club: ClubId; tone: BagTone };
}

export default function BagGappingChart({ bag, cta = true, highlight }: Props) {
  if (!bag.length) return null;
  const maxScale = Math.max(...bag.map((s) => s.maxCarry)) * 1.04;

  return (
    <div>
      <div className="flex flex-col gap-2.5">
        {bag.map((slot) => (
          <BagRow
            key={slot.club}
            slot={slot}
            maxScale={maxScale}
            highlight={highlight}
          />
        ))}
      </div>

      {cta && (
        <Link
          href="/performance"
          className="inline-flex items-center gap-1.5 mt-6 text-sm font-semibold text-rap-red hover:text-rap-red-hover transition-colors"
        >
          View full bag
          <Icon name="arrow-right" size={14} />
        </Link>
      )}
    </div>
  );
}

function BagRow({
  slot, maxScale, highlight,
}: {
  slot: BagSlot;
  maxScale: number;
  highlight?: { club: ClubId; tone: BagTone };
}) {
  const def = CLUBS[slot.club];
  const isHighlighted = highlight?.club === slot.club;
  const dimRest = !!highlight && !isHighlighted;

  // Each row keeps its club colour — the highlight contrast comes from
  // opacity, marker thickness, and a row-background tint, not from
  // swapping non-highlight rows to grey.
  const haloColor   = isHighlighted ? BAG_TONE_HEX[highlight!.tone] : def.color;
  const markerColor = isHighlighted ? BAG_TONE_HEX[highlight!.tone] : def.color;
  const haloOpacity = isHighlighted ? 0.55 : dimRest ? 0.18 : 0.28;
  const markerWidth = isHighlighted ? '6px' : '4px';
  const markerLeftOffset = isHighlighted ? 3 : 2;

  const rangeLeftPct  = (slot.minCarry / maxScale) * 100;
  const rangeWidthPct = ((slot.maxCarry - slot.minCarry) / maxScale) * 100;
  const avgPct        = (slot.avgCarry / maxScale) * 100;

  return (
    <div
      className="relative -mx-3 px-3 py-1 rounded-lg flex items-center gap-3"
      style={
        isHighlighted
          ? { backgroundColor: `${BAG_TONE_HEX[highlight!.tone]}14` }
          : undefined
      }
    >
      <span
        className={clsx(
          'w-8 text-[11px] font-bold text-right uppercase tracking-caps',
          isHighlighted ? 'text-text-primary'
            : dimRest    ? 'text-text-tertiary'
            : 'text-text-secondary',
        )}
      >
        {slot.club}
      </span>

      <div className="flex-1 h-6 bg-neutral-100 rounded-pill relative overflow-hidden">
        <div
          className="absolute top-0 bottom-0 rounded-pill"
          style={{
            left:  `${rangeLeftPct}%`,
            width: `${rangeWidthPct}%`,
            backgroundColor: haloColor,
            opacity: haloOpacity,
          }}
          aria-hidden
        />
        <div
          className="absolute top-0 bottom-0 rounded-sm"
          style={{
            left: `calc(${avgPct}% - ${markerLeftOffset}px)`,
            width: markerWidth,
            backgroundColor: markerColor,
            opacity: dimRest ? 0.6 : 1,
          }}
          aria-hidden
        />
      </div>

      <span
        className={clsx(
          'w-24 text-xs font-mono text-right tabular-nums',
          isHighlighted ? 'text-text-primary font-semibold'
            : dimRest    ? 'text-text-tertiary'
            : '',
        )}
      >
        {slot.avgCarry.toFixed(0)}{' '}
        <span className="text-text-tertiary">yds</span>
      </span>
    </div>
  );
}
