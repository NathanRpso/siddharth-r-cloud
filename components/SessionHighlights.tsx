'use client';

import { useState } from 'react';
import Icon, { type StrokeIconName, MetricIcon, type MetricIconName } from './Icon';
import VideoPlayerModal from './VideoPlayerModal';
import { CLUBS } from '@/lib/clubs';
import type { SessionHighlight } from '@/lib/stats';

const KIND_ICON: Record<SessionHighlight['kind'], MetricIconName | StrokeIconName> = {
  'cleanest-strike': 'smash-factor',
  'longest-drive':   'total-carry',
  'straightest':     'launch-direction',
  'fastest-ball':    'ball-speed',
};

const KIND_IS_METRIC: Record<SessionHighlight['kind'], boolean> = {
  'cleanest-strike': true,
  'longest-drive':   true,
  'straightest':     true,
  'fastest-ball':    true,
};

/** Horizontal strip of "trophy moments" from a session. Clicking a card
 *  opens the VideoPlayerModal for that shot — sharing happens from the
 *  modal, drilling into the full Shot Review workspace happens from
 *  the modal too. Cards with `hasVideo === false` still open the modal
 *  (which renders a "no video captured" state). */
export default function SessionHighlights({
  highlights,
  sessionId,
}: {
  highlights: SessionHighlight[];
  sessionId: string;
}) {
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  if (!highlights.length) return null;

  const openHighlight = openIdx !== null ? highlights[openIdx] : null;

  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {highlights.map((h, idx) => {
          const def = CLUBS[h.shot.club];
          const iconName = KIND_ICON[h.kind];
          return (
            <button
              type="button"
              key={h.kind}
              onClick={() => setOpenIdx(idx)}
              aria-label={`Play ${h.label}: ${h.metricLabel}`}
              className="group relative rounded-xl overflow-hidden bg-neutral-950 aspect-[5/4] shadow-sm hover:shadow-md transition-shadow text-left"
            >
              {/* Faux swing-frame backdrop, club-tinted */}
              <div
                className="absolute inset-0"
                aria-hidden
                style={{
                  background: `radial-gradient(ellipse at 30% 70%, ${def.color}33, transparent 60%), linear-gradient(135deg, #171717 0%, #0A0A0A 60%, #171717 100%)`,
                }}
              />
              <div
                className="absolute inset-0 opacity-30 pointer-events-none"
                aria-hidden
                style={{
                  backgroundImage:
                    'repeating-linear-gradient(0deg, rgba(255,255,255,0.02) 0 1px, transparent 1px 4px)',
                }}
              />

              {/* Top row — label eyebrow + club chip */}
              <div className="absolute top-3 left-3 right-3 flex items-start justify-between gap-2">
                <span className="text-[10px] font-bold uppercase tracking-caps text-white/90 leading-tight max-w-[120px]">
                  {h.label}
                </span>
                <span
                  className="px-2 py-0.5 rounded-md text-white text-[10px] font-bold uppercase tracking-caps shrink-0"
                  style={{ backgroundColor: def.color }}
                >
                  {h.shot.club}
                </span>
              </div>

              {/* Centre — large metric with a play affordance behind it */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
                {KIND_IS_METRIC[h.kind] ? (
                  <MetricIcon name={iconName as MetricIconName} size={32} className="opacity-30 mb-1" />
                ) : (
                  <Icon name={iconName as StrokeIconName} size={28} className="opacity-30 mb-1" />
                )}
                <div className="type-display-sm leading-none text-center px-2">
                  {h.metricLabel}
                </div>
              </div>

              {/* Play button — bottom-right, scales up on hover */}
              <div className="absolute bottom-3 right-3">
                <span className="w-11 h-11 rounded-pill bg-white/95 text-rap-red flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                  <Icon name="play-circle" size={24} />
                </span>
              </div>

              {/* Bottom row — sub */}
              <div className="absolute bottom-0 left-0 right-0 px-4 py-3 pr-16 bg-gradient-to-t from-black/80 to-transparent">
                <span className="text-[11px] text-white/80 leading-tight">
                  {h.sub}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {openHighlight && (
        <VideoPlayerModal
          highlight={openHighlight}
          sessionId={sessionId}
          onClose={() => setOpenIdx(null)}
        />
      )}
    </>
  );
}
