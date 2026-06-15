'use client';

import { useEffect, useMemo, useRef } from 'react';
import clsx from 'clsx';
import Icon from './Icon';
import AnnotationCanvas, { type AnnotateTool, type Stroke } from './AnnotationCanvas';
import { CLUBS } from '@/lib/clubs';
import { buildFlight, flightProgress, toPathD, IMPACT_AT } from '@/lib/ballFlight';
import { getShotClips } from '@/lib/shotVideos';
import type { Shot } from '@/lib/types';

// Overlay text scales with the tile's own width (container queries) and is
// clamped so it never wraps, stacks, or truncates across the tile-size range.
const FS = {
  badge: 'clamp(8px, 3.4cqw, 13px)',
  hud: 'clamp(18px, 9cqw, 38px)',
  hudLabel: 'clamp(7px, 3cqw, 11px)',
  value: 'clamp(15px, 7.4cqw, 30px)', // the numbers — big + glanceable
  unit: 'clamp(7px, 2.8cqw, 11px)', // small unit riding alongside the number
  label: 'clamp(7px, 2.7cqw, 10px)', // quiet caption
  toggle: 'clamp(7px, 3cqw, 11px)',
} as const;

interface TileProps {
  shot: Shot;
  index: number;
  progress: number;
  /** Whether the shared clock is running — video tiles play natively while true. */
  playing: boolean;
  /** Speed multiplier (0.25 / 0.5 / 1). */
  speed: number;
  tool: AnnotateTool;
  color: string;
  /** Committed annotation strokes for this frame (owned by the page). */
  strokes: Stroke[];
  /** Commit a finished stroke on this frame. */
  onCommit: (s: Stroke) => void;
  /** Clear this frame's markup only. */
  onClearFrame: () => void;
  /** Shot ⇄ Impact view (controlled, so linked tiles can share it). */
  view?: 'shot' | 'impact';
  onView?: (v: 'shot' | 'impact') => void;
  onRemove?: () => void;
  /** Video tiles report their real playback position back to the clock. */
  onProgress?: (p: number) => void;
  /** Fired when a video clip plays through to the end. */
  onEnded?: () => void;
}

/**
 * A shot replay tile. When the shot has captured MLM2PRO footage it plays the
 * real vertical "shot vision" clip (with an Impact-vision toggle), seeked from
 * the shared playback clock so every tile stays in sync. Shots without footage
 * fall back to a synthetic ball-flight tracer built from their real numbers.
 */
export default function VideoTile(props: TileProps) {
  const clips = useMemo(() => getShotClips(props.shot), [props.shot]);
  return clips ? <VideoMode {...props} clips={clips} /> : <TracerMode {...props} />;
}

const clampRate = (s: number) => Math.min(4, Math.max(0.0625, s));

// ── Real-footage mode ───────────────────────────────────────────────────────
function VideoMode({
  shot,
  index,
  progress,
  playing,
  speed,
  tool,
  color,
  strokes,
  onCommit,
  onClearFrame,
  view = 'shot',
  onView,
  onRemove,
  onProgress,
  onEnded,
  clips,
}: TileProps & { clips: { shot: string; impact: string } }) {
  const def = CLUBS[shot.club];
  const videoRef = useRef<HTMLVideoElement>(null);
  const durationRef = useRef(0);
  const src = view === 'shot' ? clips.shot : clips.impact;

  // Play/pause natively at the chosen rate. The video — not an external clock —
  // is the source of truth while it runs, so there is never a mid-play seek.
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.playbackRate = clampRate(speed);
    if (playing) {
      if (v.ended || (v.duration && v.currentTime >= v.duration - 0.05)) v.currentTime = 0;
      void v.play().catch(() => {});
    } else {
      v.pause();
    }
  }, [playing, speed, view]);

  // While playing, report the clip's real position up to the clock so the
  // scrubber tracks the footage exactly (using per-frame callbacks when available).
  useEffect(() => {
    const v = videoRef.current;
    if (!v || !playing) return;
    const anyV = v as unknown as {
      requestVideoFrameCallback?: (cb: () => void) => number;
      cancelVideoFrameCallback?: (h: number) => void;
    };
    const rvfc = typeof anyV.requestVideoFrameCallback === 'function';
    let handle: number | null = null;
    let cancelled = false;
    const report = () => {
      if (cancelled) return;
      const d = v.duration || durationRef.current;
      if (d) onProgress?.(Math.min(1, v.currentTime / d));
      handle = rvfc ? anyV.requestVideoFrameCallback!(report) : requestAnimationFrame(report);
    };
    handle = rvfc ? anyV.requestVideoFrameCallback!(report) : requestAnimationFrame(report);
    return () => {
      cancelled = true;
      if (handle == null) return;
      if (rvfc) anyV.cancelVideoFrameCallback?.(handle);
      else cancelAnimationFrame(handle);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, view]);

  // When paused (scrub / frame-step), follow the external position exactly.
  useEffect(() => {
    const v = videoRef.current;
    const d = durationRef.current;
    if (!v || !d || playing) return;
    const target = Math.min(d - 0.01, Math.max(0, progress * d));
    if (Math.abs(v.currentTime - target) > 0.015) v.currentTime = target;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [progress, playing, view]);

  const liveCarry = Math.round(progress * shot.carry);

  return (
    <Frame className="aspect-[9/16] w-full bg-black">
      <video
        key={src}
        ref={videoRef}
        src={src}
        muted
        playsInline
        preload="auto"
        className="absolute inset-0 w-full h-full object-contain"
        onEnded={() => onEnded?.()}
        onLoadedMetadata={(e) => {
          const v = e.currentTarget;
          durationRef.current = v.duration || 0;
          v.currentTime = Math.max(0, Math.min(durationRef.current - 0.01, progress * durationRef.current));
          v.playbackRate = clampRate(speed);
          if (playing) void v.play().catch(() => {});
        }}
      />

      <TileChrome shot={shot} index={index} def={def} liveCarry={liveCarry} onRemove={onRemove} />

      {/* Shot ⇄ Impact view toggle */}
      <div className="absolute bottom-[68px] left-1/2 -translate-x-1/2 flex items-center gap-1 bg-black/55 backdrop-blur-sm rounded-pill p-1">
        {(['shot', 'impact'] as const).map((v) => (
          <button
            key={v}
            onClick={() => onView?.(v)}
            className={clsx(
              'px-3 py-1 rounded-pill font-bold uppercase tracking-caps whitespace-nowrap transition-colors',
              view === v ? 'bg-white text-rap-black' : 'text-white/70 hover:text-white',
            )}
            style={{ fontSize: FS.toggle }}
          >
            {v === 'shot' ? 'Shot' : 'Impact'}
          </button>
        ))}
      </div>

      <AnnotationCanvas tool={tool} color={color} strokes={strokes} onCommit={onCommit} />
      {strokes.length > 0 && <FrameClearButton onClick={onClearFrame} />}
    </Frame>
  );
}

// ── Synthetic tracer mode (no footage) ──────────────────────────────────────
function TracerMode({ shot, index, progress, tool, color, strokes, onCommit, onClearFrame, onRemove }: TileProps) {
  const def = CLUBS[shot.club];
  const flight = useMemo(() => buildFlight(shot), [shot]);

  const ft = flightProgress(progress);
  const ball = flight.ballAt(ft);
  const activeCount = Math.max(1, Math.round(ft * (flight.path.length - 1)));
  const activePts = [...flight.path.slice(0, activeCount + 1), { x: ball.x, y: ball.y }];
  const fullD = toPathD(flight.path);
  const activeD = toPathD(activePts);
  const liveCarry = Math.round(ball.distYds);
  const ballSize = 6 + ball.r * 2.6;
  const impactGlow = progress > IMPACT_AT - 0.05 && progress < IMPACT_AT + 0.12;

  return (
    <Frame className="aspect-video w-full bg-neutral-950">
      <div
        className="absolute inset-0"
        aria-hidden
        style={{ background: 'linear-gradient(180deg, #0E1726 0%, #13203A 32%, #0C1A12 32%, #08130C 100%)' }}
      />
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
        <rect x="0" y={flight.horizonY} width="100" height={100 - flight.horizonY} fill="url(#fairway)" />
        <defs>
          <linearGradient id="fairway" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#1BE377" stopOpacity="0.10" />
            <stop offset="1" stopColor="#1BE377" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <line x1="0" y1={flight.horizonY} x2="100" y2={flight.horizonY} stroke="#ffffff" strokeOpacity="0.14" strokeWidth="1" vectorEffect="non-scaling-stroke" />
        <line x1={flight.tee.x} y1={flight.tee.y} x2={flight.tee.x} y2={flight.horizonY} stroke="#ffffff" strokeOpacity="0.06" strokeWidth="1" strokeDasharray="2 3" vectorEffect="non-scaling-stroke" />
        <path d={fullD} fill="none" stroke={def.color} strokeOpacity="0.22" strokeWidth="1" strokeDasharray="1.5 2.5" vectorEffect="non-scaling-stroke" />
        <path d={activeD} fill="none" stroke={def.color} strokeOpacity="0.35" strokeWidth="5" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        <path d={activeD} fill="none" stroke={def.color} strokeWidth="2" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        {ft >= 0.5 && (
          <circle cx={flight.apex.x} cy={flight.apex.y} r="1.6" fill="none" stroke="#ffffff" strokeOpacity="0.5" strokeWidth="1" vectorEffect="non-scaling-stroke" />
        )}
        {ft >= 0.98 && (
          <>
            <circle cx={flight.landing.x} cy={flight.landing.y} r="2.4" fill="none" stroke={def.color} strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
            <circle cx={flight.landing.x} cy={flight.landing.y} r="0.8" fill={def.color} />
          </>
        )}
        <circle cx={flight.tee.x} cy={flight.tee.y} r="0.9" fill="#ffffff" fillOpacity="0.5" />
      </svg>

      <div
        className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full bg-white"
        style={{
          left: `${ball.x}%`,
          top: `${ball.y}%`,
          width: ballSize,
          height: ballSize,
          boxShadow: impactGlow
            ? `0 0 14px 4px ${def.color}, 0 0 0 2px ${def.color}`
            : `0 0 8px 1px rgba(255,255,255,0.5), 0 0 0 1.5px ${def.color}`,
          transition: 'box-shadow 120ms linear',
        }}
        aria-hidden
      />

      <TileChrome shot={shot} index={index} def={def} liveCarry={liveCarry} onRemove={onRemove} noVideo />
      <AnnotationCanvas tool={tool} color={color} strokes={strokes} onCommit={onCommit} />
      {strokes.length > 0 && <FrameClearButton onClick={onClearFrame} />}
    </Frame>
  );
}

/** Appears on a frame once it has markup; clears just this frame. */
function FrameClearButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-label="Clear this shot's markup"
      title="Clear this shot's markup"
      className="absolute top-3 left-1/2 -translate-x-1/2 z-20 inline-flex items-center gap-1 px-2 py-1 rounded-pill bg-black/65 backdrop-blur-sm text-white hover:bg-rap-red transition-colors"
      style={{ fontSize: FS.toggle }}
    >
      <Icon name="trash" size={13} />
      <span className="font-bold uppercase tracking-caps">Clear</span>
    </button>
  );
}

// ── Shared chrome ───────────────────────────────────────────────────────────
function Frame({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div
      className={clsx('relative rounded-xl overflow-hidden shadow-sm', className)}
      style={{ containerType: 'inline-size' }}
    >
      {children}
    </div>
  );
}

function TileChrome({
  shot,
  index,
  def,
  liveCarry,
  onRemove,
  noVideo,
}: {
  shot: Shot;
  index: number;
  def: (typeof CLUBS)[keyof typeof CLUBS];
  liveCarry: number;
  onRemove?: () => void;
  noVideo?: boolean;
}) {
  return (
    <>
      {/* Top-left: shot badge + live carry HUD */}
      <div className="absolute top-3 left-3 flex flex-col items-start gap-2">
        <div className="flex items-center gap-2">
          <span className="px-2 py-1 rounded-md bg-rap-red text-white font-bold uppercase tracking-caps whitespace-nowrap" style={{ fontSize: FS.badge }}>
            Shot {index}
          </span>
          {shot.isOutlier && (
            <span className="px-2 py-1 rounded-md bg-warning text-rap-black font-bold uppercase tracking-caps whitespace-nowrap" style={{ fontSize: FS.badge }}>
              Surprise
            </span>
          )}
          {noVideo && (
            <span className="px-2 py-1 rounded-md bg-black/55 backdrop-blur-sm text-white/70 font-bold uppercase tracking-caps whitespace-nowrap" style={{ fontSize: FS.badge }}>
              Tracer
            </span>
          )}
        </div>
        <div className="px-2.5 py-1 rounded-md bg-black/55 backdrop-blur-sm flex items-baseline gap-1.5">
          <span className="type-display-xs italic text-white leading-none tabular-nums" style={{ fontSize: FS.hud }}>{liveCarry}</span>
          <span className="font-bold uppercase tracking-caps text-white/60 whitespace-nowrap" style={{ fontSize: FS.hudLabel }}>yds carry</span>
        </div>
      </div>

      {/* Top-right: club chip + remove */}
      <div className="absolute top-3 right-3 flex items-center gap-2">
        <span
          className="px-2 py-1 rounded-md text-white font-bold uppercase tracking-caps whitespace-nowrap"
          style={{ backgroundColor: def.color, fontSize: FS.badge }}
        >
          {def.label}
        </span>
        {onRemove && (
          <button
            onClick={onRemove}
            aria-label="Remove shot"
            className="w-7 h-7 rounded-pill bg-neutral-900/80 backdrop-blur text-white hover:bg-rap-red flex items-center justify-center transition-colors"
          >
            <Icon name="x" size={14} />
          </button>
        )}
      </div>

      {/* Bottom: static metric overlay */}
      <div className="absolute bottom-0 left-0 right-0 px-3 py-3 bg-gradient-to-t from-black/80 to-transparent">
        <div className="grid grid-cols-3 gap-2 text-white">
          <Stat label="Ball Speed" value={shot.ballSpeed.toFixed(0)} unit="mph" />
          <Stat label="Launch" value={shot.launchAngle.toFixed(1)} unit="°" />
          <Stat label="Apex" value={String(shot.apex)} unit="ft" />
        </div>
      </div>
    </>
  );
}

function Stat({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div className="min-w-0">
      <div className="font-bold uppercase tracking-caps text-white/55 whitespace-nowrap" style={{ fontSize: FS.label }}>
        {label}
      </div>
      <div className="flex items-baseline whitespace-nowrap leading-none">
        <span className="type-display-xs italic" style={{ fontSize: FS.value }}>
          {value}
        </span>
        {unit && (
          <span
            className={clsx('font-semibold uppercase text-white/70', unit.length > 1 && 'ml-0.5')}
            style={{ fontSize: FS.unit }}
          >
            {unit}
          </span>
        )}
      </div>
    </div>
  );
}
