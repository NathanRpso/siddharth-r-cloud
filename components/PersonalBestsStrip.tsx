'use client';

import { useState } from 'react';
import Icon from './Icon';
import AnimatedBestIcon, { type BestIconKind } from './AnimatedBestIcon';
import VideoPlayerModal from './VideoPlayerModal';
import type { LifetimeInsights, SessionHighlight } from '@/lib/stats';
import type { Shot } from '@/lib/types';

type Best = {
  kind: BestIconKind;
  /** SessionHighlight.kind for the shared player modal (unused by it visually). */
  highlightKind: SessionHighlight['kind'];
  label: string;
  value: string;
  shot: Shot;
};

export default function PersonalBestsStrip({
  lifetime,
  shots,
}: {
  lifetime: LifetimeInsights;
  shots: Shot[];
}) {
  const [active, setActive] = useState<Best | null>(null);

  // Cleanest strike — highest smash, filtered to driver to avoid wedge artefacts.
  const drivers = shots.filter((s) => s.club === 'Dr');
  const fastestSwing = drivers.length
    ? drivers.reduce((b, s) => (s.clubSpeed > b.clubSpeed ? s : b))
    : lifetime.fastestClub;
  const cleanest = drivers.length
    ? drivers.reduce((b, s) => (s.smash > b.smash ? s : b))
    : null;

  const bests = [
    {
      kind: 'drive' as BestIconKind,
      highlightKind: 'longest-drive' as SessionHighlight['kind'],
      label: 'Longest Drive',
      value: `${lifetime.longestShot.total.toFixed(0)} yds`,
      shot: lifetime.longestShot,
    },
    {
      kind: 'ball' as BestIconKind,
      highlightKind: 'fastest-ball' as SessionHighlight['kind'],
      label: 'Fastest Ball',
      value: `${lifetime.fastestBall.ballSpeed.toFixed(0)} mph`,
      shot: lifetime.fastestBall,
    },
    {
      kind: 'swing' as BestIconKind,
      highlightKind: 'fastest-ball' as SessionHighlight['kind'],
      label: 'Fastest Swing',
      value: `${fastestSwing.clubSpeed.toFixed(0)} mph`,
      shot: fastestSwing,
    },
    cleanest && {
      kind: 'smash' as BestIconKind,
      highlightKind: 'cleanest-strike' as SessionHighlight['kind'],
      label: 'Cleanest Strike',
      value: cleanest.smash.toFixed(2),
      shot: cleanest,
    },
  ].filter(Boolean) as Best[];

  return (
    <div>
      <h2 className="type-label-sm text-text-tertiary tracking-caps mb-3">
        All-time bests
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {bests.map((b) => (
          <div
            key={b.label}
            className="group bg-white rounded-2xl border border-border-subtle shadow-sm p-4 flex items-center gap-3"
          >
            <span className="w-9 h-9 rounded-pill bg-neutral-100 flex items-center justify-center text-text-secondary shrink-0 transition-colors group-hover:bg-sport-golf/15 group-hover:text-rap-black">
              <AnimatedBestIcon kind={b.kind} size={20} />
            </span>
            <div className="min-w-0">
              <div className="text-[11px] font-bold uppercase tracking-caps text-text-tertiary">
                {b.label}
              </div>
              <div className="text-base font-semibold text-text-primary leading-tight">
                {b.value}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setActive(b)}
              aria-label={`Watch ${b.label} shot`}
              className="ml-auto shrink-0 text-text-tertiary hover:text-rap-red transition-colors"
            >
              <Icon name="play-circle" size={26} />
            </button>
          </div>
        ))}
      </div>

      {active && (
        <VideoPlayerModal
          highlight={{
            kind: active.highlightKind,
            label: active.label,
            shot: active.shot,
            metricLabel: active.value,
            sub: 'All-time best',
          }}
          sessionId={active.shot.sessionId}
          onClose={() => setActive(null)}
        />
      )}
    </div>
  );
}
