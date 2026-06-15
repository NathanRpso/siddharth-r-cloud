'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import clsx from 'clsx';
import Icon from './Icon';
import { CLUBS } from '@/lib/clubs';
import type { SessionHighlight } from '@/lib/stats';

/** Lightweight video-player modal spawned from a highlight card.
 *
 *  No real video in the prototype — the player area is a dark surface
 *  with a play affordance and the shot's club-tinted accent. The point
 *  is to demonstrate the experience: highlight → spawn a focused
 *  review window with the shot's metadata + share + deeper drill-down.
 */
export default function VideoPlayerModal({
  highlight,
  sessionId,
  onClose,
}: {
  highlight: SessionHighlight;
  sessionId: string;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);

  // Esc to close, prevent body scroll while open.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const shot = highlight.shot;
  const def = CLUBS[shot.club];
  const hasVideo = shot.hasVideo;

  function handleShare() {
    // Prototype share: copy a deep link to the shot.
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      const url = `${window.location.origin}/shot-review?session=${sessionId}&shot=${shot.id}`;
      navigator.clipboard.writeText(url).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${highlight.label} review`}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8"
    >
      {/* Backdrop */}
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="absolute inset-0 bg-neutral-950/80 backdrop-blur-sm"
      />

      {/* Modal box */}
      <div className="relative bg-white rounded-2xl shadow-lg max-w-3xl w-full overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-subtle">
          <div className="min-w-0">
            <div className="type-eyebrow mb-0.5">{highlight.label}</div>
            <div className="flex items-center gap-2">
              <div className="type-h3 text-text-primary truncate">
                {highlight.metricLabel}
              </div>
              <span
                className="px-2 py-0.5 rounded-md text-white text-[10px] font-bold uppercase tracking-caps shrink-0"
                style={{ backgroundColor: def.color }}
              >
                {shot.club}
              </span>
            </div>
            <div className="text-sm text-text-tertiary mt-0.5">
              {highlight.sub}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="w-9 h-9 rounded-md flex items-center justify-center text-text-tertiary hover:text-text-primary hover:bg-neutral-100 transition-colors shrink-0"
          >
            <Icon name="x" size={18} />
          </button>
        </div>

        {/* Player area — placeholder dark surface with club-tinted accent */}
        <div
          className="relative aspect-video bg-neutral-950 flex items-center justify-center"
          style={{
            background: `radial-gradient(ellipse at 50% 50%, ${def.color}22, transparent 70%), linear-gradient(135deg, #171717 0%, #0A0A0A 60%, #171717 100%)`,
          }}
        >
          {hasVideo ? (
            <button
              type="button"
              aria-label="Play video"
              className="w-20 h-20 rounded-pill bg-white/95 text-rap-red flex items-center justify-center hover:bg-white hover:scale-105 transition-all shadow-lg"
            >
              <Icon name="play-circle" size={48} />
            </button>
          ) : (
            <div className="text-center px-6">
              <div className="w-14 h-14 rounded-pill bg-neutral-800 flex items-center justify-center mx-auto mb-3 text-text-tertiary">
                <Icon name="video-camera" size={24} />
              </div>
              <p className="text-sm text-white/70">
                No video captured for this shot
              </p>
            </div>
          )}
        </div>

        {/* Metadata strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-border-subtle border-b border-border-subtle">
          <MetadataCell label="Carry" value={`${shot.carry.toFixed(0)} yds`} />
          <MetadataCell label="Ball speed" value={`${shot.ballSpeed.toFixed(0)} mph`} />
          <MetadataCell label="Launch" value={`${shot.launchAngle.toFixed(1)}°`} />
          <MetadataCell label="Smash" value={shot.smash.toFixed(2)} />
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
          <button
            type="button"
            onClick={handleShare}
            className={clsx(
              'inline-flex items-center gap-2 px-4 py-2 rounded-md text-xs font-semibold uppercase tracking-cta transition-colors',
              copied
                ? 'bg-sport-golf/15 text-sport-golf-700'
                : 'border border-border-default text-text-primary hover:bg-neutral-50',
            )}
          >
            <Icon name={copied ? 'check' : 'share'} size={14} />
            {copied ? 'Link copied' : 'Share'}
          </button>
          <Link
            href={`/shot-review?session=${sessionId}&shot=${shot.id}`}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-rap-red text-white text-xs font-semibold uppercase tracking-cta hover:bg-rap-red-hover transition-colors"
          >
            Open in Shot Review
            <Icon name="arrow-right" size={14} />
          </Link>
        </div>
      </div>
    </div>
  );
}

function MetadataCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white px-4 py-3">
      <div className="type-label-sm text-text-tertiary tracking-caps mb-0.5">
        {label}
      </div>
      <div className="text-sm font-semibold text-text-primary tabular-nums">
        {value}
      </div>
    </div>
  );
}
