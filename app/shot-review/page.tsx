'use client';

import { Fragment, Suspense, useEffect, useMemo, useRef, useState, type Dispatch, type ReactNode, type SetStateAction } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import clsx from 'clsx';
import PageHeader from '@/components/PageHeader';
import VideoTile from '@/components/VideoTile';
import Icon from '@/components/Icon';
import { type AnnotateTool, type Stroke } from '@/components/AnnotationCanvas';
import { ALL_SHOTS, SESSIONS, getSession } from '@/lib/mockData';
import { CLUBS } from '@/lib/clubs';
import { getShotClips } from '@/lib/shotVideos';
import { TIMELINE_MS } from '@/lib/ballFlight';
import { modeLabel } from '@/lib/sessionTitle';
import {
  UNIT_SYSTEMS,
  fmtDistance,
  fmtSignedDistance,
  fmtSpeed,
  join as joinUnit,
  type UnitSystem,
} from '@/lib/units';
import type { Shot } from '@/lib/types';

const MAX_TILES = 4;
const SPEEDS = [0.25, 0.5, 1] as const;
const INK_COLORS = ['#FFFFFF', '#1BE377', '#FF4D4D', '#FFC53D'] as const;

interface Clock {
  progress: number;
  playing: boolean;
  speed: number;
}

// Stable reference for frames with no markup (avoids re-creating [] each render).
const EMPTY_STROKES: Stroke[] = [];

// Human-readable names for ink swatches (tooltips).
const INK_NAMES: Record<string, string> = {
  '#FFFFFF': 'White',
  '#1BE377': 'Green',
  '#FF4D4D': 'Red',
  '#FFC53D': 'Amber',
};

// Metrics shown in the Compare table (one row each, value under each shot).
const METRICS: { label: string; fmt: (s: Shot, u: UnitSystem) => string }[] = [
  { label: 'Carry', fmt: (s, u) => joinUnit(fmtDistance(s.carry, u)) },
  { label: 'Total', fmt: (s, u) => joinUnit(fmtDistance(s.total, u)) },
  { label: 'Side', fmt: (s, u) => joinUnit(fmtSignedDistance(s.sideCarry, u)) },
  { label: 'Ball speed', fmt: (s, u) => joinUnit(fmtSpeed(s.ballSpeed, u)) },
  { label: 'Club speed', fmt: (s, u) => joinUnit(fmtSpeed(s.clubSpeed, u)) },
  { label: 'Smash', fmt: (s) => s.smash.toFixed(2) },
  { label: 'Launch', fmt: (s) => `${s.launchAngle.toFixed(1)}°` },
  { label: 'Spin', fmt: (s) => `${s.spinRate} rpm` },
  { label: 'Attack', fmt: (s) => `${s.attackAngle.toFixed(1)}°` },
];

export default function ShotReviewPage() {
  return (
    <Suspense fallback={<div className="p-10 text-text-secondary">Loading…</div>}>
      <ShotReviewContent />
    </Suspense>
  );
}

function ShotReviewContent() {
  const params = useSearchParams();
  const sessionId = params.get('session');
  const outliersOnly = params.get('outliers') === '1';
  const shotId = params.get('shot');
  const shotsCsv = params.get('shots');

  const session = sessionId ? getSession(sessionId) : null;

  // Resolve the initial shot set. Precedence: explicit shots list → single
  // shot deep-link → session (optionally outliers) → newest session default.
  const initialShots = useMemo<Shot[]>(() => {
    if (shotsCsv) {
      const ids = shotsCsv.split(',');
      const found = ids
        .map((id) => ALL_SHOTS.find((s) => s.id === id))
        .filter((s): s is Shot => Boolean(s));
      if (found.length) return found.slice(0, MAX_TILES);
    }
    if (shotId) {
      const s = ALL_SHOTS.find((x) => x.id === shotId);
      if (s) return [s];
    }
    if (session) {
      const candidatePool = outliersOnly ? session.shots.filter((s) => s.isOutlier) : session.shots;
      // Prefer shots with real footage so the default view leads with video.
      const withVideo = candidatePool.filter((s) => s.hasVideo);
      return (withVideo.length >= 2 ? withVideo : candidatePool).slice(0, 2);
    }
    const recent = SESSIONS.slice(0, 8).flatMap((s) => s.shots);
    const recentVideo = recent.filter((s) => s.hasVideo);
    return (recentVideo.length ? recentVideo : recent).slice(0, 2);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shotsCsv, shotId, sessionId, outliersOnly]);

  const [selected, setSelected] = useState<Shot[]>(initialShots);
  const selectedIds = selected.map((s) => s.id);
  const idsKey = selectedIds.join(',');

  // ── Playback clocks + link groups ─────────────────────────────────────────
  // One clock per tile. Adjacent tiles can be linked into contiguous groups; a
  // control acts on its whole group. `links[i]` = tile i linked to tile i+1.
  const [clocks, setClocks] = useState<Record<string, Clock>>({});
  // Adjacency links default to linked, so the initial shots open as one group.
  const [links, setLinks] = useState<boolean[]>(() => Array(Math.max(0, initialShots.length - 1)).fill(true));

  // Keep exactly one clock per selected shot.
  useEffect(() => {
    setClocks((prev) => {
      const next: Record<string, Clock> = {};
      for (const id of selectedIds) next[id] = prev[id] ?? { progress: 0, playing: false, speed: 1 };
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsKey]);

  // Which tiles are real footage — those drive their own progress; tracer
  // tiles (the rest) are advanced by the rAF loop below.
  const videoIds = useMemo(
    () => new Set(selected.filter((s) => getShotClips(s)).map((s) => s.id)),
    [idsKey], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const anyTracerPlaying = selected.some((s) => !videoIds.has(s.id) && clocks[s.id]?.playing);

  // Advance only the tracer clocks; video tiles report their own position.
  useEffect(() => {
    if (!anyTracerPlaying) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = now - last;
      last = now;
      setClocks((prev) => {
        let changed = false;
        const next: Record<string, Clock> = { ...prev };
        for (const id in next) {
          const c = next[id];
          if (!c.playing || videoIds.has(id)) continue;
          const p = c.progress + (dt / TIMELINE_MS) * c.speed;
          next[id] = p >= 1 ? { ...c, progress: 1, playing: false } : { ...c, progress: p };
          changed = true;
        }
        return changed ? next : prev;
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [anyTracerPlaying, videoIds]);

  // Video tiles push their real position here (never broadcast — each clip
  // owns its own progress even when linked).
  const reportProgress = (id: string, p: number) =>
    setClocks((prev) => (prev[id] && prev[id].progress !== p ? { ...prev, [id]: { ...prev[id], progress: p } } : prev));
  const endClock = (id: string) =>
    setClocks((prev) => (prev[id] ? { ...prev, [id]: { ...prev[id], playing: false, progress: 1 } } : prev));

  // The contiguous link-group (tile ids) containing a tile.
  function groupOf(id: string): string[] {
    const idx = selectedIds.indexOf(id);
    if (idx < 0) return [id];
    let lo = idx;
    let hi = idx;
    while (lo > 0 && links[lo - 1]) lo--;
    while (hi < selectedIds.length - 1 && links[hi]) hi++;
    return selectedIds.slice(lo, hi + 1);
  }

  // Apply a change to a tile's whole link-group (a lone tile = just itself).
  function apply(id: string, patch: Partial<Clock> | ((c: Clock) => Partial<Clock>)) {
    const targets = groupOf(id);
    setClocks((prev) => {
      const next = { ...prev };
      for (const k of targets) {
        const p = typeof patch === 'function' ? patch(prev[k]) : patch;
        next[k] = { ...prev[k], ...p };
      }
      return next;
    });
  }
  const togglePlay = (id: string) =>
    apply(id, (c) => ({ playing: !c.playing, progress: !c.playing && c.progress >= 1 ? 0 : c.progress }));
  const scrubTo = (id: string, value: number) => apply(id, { playing: false, progress: value });
  const stepFrame = (id: string, dir: -1 | 1) =>
    apply(id, (c) => ({ playing: false, progress: Math.min(1, Math.max(0, c.progress + dir * 0.03)) }));
  const setSpeed = (id: string, speed: number) => apply(id, { speed });

  // Toggle the link between tile i and i+1. Linking snaps the merged group to
  // the left tile's state (paused) so they line up.
  function toggleLink(i: number) {
    const willLink = !links[i];
    const newLinks = links.map((v, j) => (j === i ? willLink : v));
    setLinks(newLinks);
    if (!willLink) return;
    let lo = i;
    let hi = i + 1;
    while (lo > 0 && newLinks[lo - 1]) lo--;
    while (hi < selectedIds.length - 1 && newLinks[hi]) hi++;
    const groupIds = selectedIds.slice(lo, hi + 1);
    const baseId = selectedIds[i];
    setClocks((prev) => {
      const base = prev[baseId] ?? { progress: 0, playing: false, speed: 1 };
      const next = { ...prev };
      for (const id of groupIds) next[id] = { ...base, playing: false };
      return next;
    });
  }

  // Shot ⇄ Impact view per tile — toggling one updates its whole link-group.
  const [views, setViews] = useState<Record<string, 'shot' | 'impact'>>({});
  const setGroupView = (id: string, v: 'shot' | 'impact') => {
    setViews((prev) => {
      const next = { ...prev };
      for (const k of groupOf(id)) next[k] = v;
      return next;
    });
  };

  // Uniform gap between tiles in the scroll rail (also seats the link connector).
  const colGapPx = 28;
  // Each tile fills (just under) half the rail so two big portrait videos show
  // at once; you scroll horizontally to review the rest. A 9:16 portrait at a
  // literal half-width would overflow the viewport on a landscape monitor, so we
  // also cap by height (reserving room for the page chrome + controls) and clamp
  // to a sane range. The smaller of the two wins → big, but never taller than
  // the screen.
  const tileWidthCss = `clamp(248px, min(calc((100% - ${colGapPx}px) / 2), calc((100vh - 250px) * 9 / 16)), 560px)`;

  // Detailed numbers live in a collapsible table below (everything glanceable is
  // already overlaid on the video edges). Collapsed by default for a clean view.
  const [tableOpen, setTableOpen] = useState(false);

  // ── Annotation ───────────────────────────────────────────────────────────
  const [tool, setTool] = useState<AnnotateTool>('off');
  const [ink, setInk] = useState<string>(INK_COLORS[1]);
  // Strokes live here (keyed by shot id) so we can clear one frame, clear all,
  // and undo the most recent stroke across any frame.
  const [annos, setAnnos] = useState<Record<string, Stroke[]>>({});
  const historyRef = useRef<string[]>([]); // shot ids, in commit order

  const commitStroke = (id: string, s: Stroke) => {
    historyRef.current.push(id);
    setAnnos((prev) => ({ ...prev, [id]: [...(prev[id] ?? []), s] }));
  };
  const clearFrame = (id: string) => {
    historyRef.current = historyRef.current.filter((h) => h !== id);
    setAnnos((prev) => ({ ...prev, [id]: [] }));
  };
  const clearAllMarkup = () => {
    historyRef.current = [];
    setAnnos({});
  };
  const undoMarkup = () => {
    const id = historyRef.current.pop();
    if (!id) return;
    setAnnos((prev) => {
      const arr = (prev[id] ?? []).slice(0, -1);
      return { ...prev, [id]: arr };
    });
  };
  const hasAnyMarkup = Object.values(annos).some((a) => a.length > 0);

  // ── Selection helpers ────────────────────────────────────────────────────
  function removeShot(id: string) {
    const idx = selectedIds.indexOf(id);
    setSelected((s) => s.filter((x) => x.id !== id));
    setLinks((prev) => {
      if (prev.length === 0) return prev;
      // Drop the removed tile's right connector (or its left one if it's last).
      const drop = idx >= prev.length ? prev.length - 1 : idx;
      return prev.filter((_, j) => j !== drop);
    });
  }
  function addShot(shot: Shot) {
    if (selected.length >= MAX_TILES || selected.some((x) => x.id === shot.id)) return;
    setSelected((s) => [...s, shot]);
    // Mirror the existing link state for the new adjacency: joining a linked
    // run keeps it linked; an unlinked run stays unlinked. First pair defaults linked.
    setLinks((prev) => [...prev, prev.length ? prev[prev.length - 1] : true]);
  }

  // Candidate pool for "Add shot": the session's shots, or a recent sample.
  // Shots with real footage are surfaced first.
  const pool = useMemo<Shot[]>(() => {
    const base = session ? session.shots : SESSIONS.slice(0, 6).flatMap((s) => s.shots);
    return [...base].sort((a, b) => Number(b.hasVideo) - Number(a.hasVideo));
  }, [session]);

  const [addOpen, setAddOpen] = useState(false);

  // Display unit system — toggled from the picker bar; persists per session via localStorage.
  const [units, setUnits] = useState<UnitSystem>('imperial');
  useEffect(() => {
    const saved = typeof window !== 'undefined' ? window.localStorage.getItem('rcloud:units') : null;
    if (saved === 'imperial' || saved === 'metric') setUnits(saved);
  }, []);
  useEffect(() => {
    if (typeof window !== 'undefined') window.localStorage.setItem('rcloud:units', units);
  }, [units]);

  const titleSuffix = session
    ? `${modeLabel(session.mode)} · ${new Date(session.date).toLocaleDateString('en-GB', {
        weekday: 'short', day: '2-digit', month: 'short',
      })}`
    : 'Pick shots to review';

  const clockFor = (id: string): Clock => clocks[id] ?? { progress: 0, playing: false, speed: 1 };
  const renderTile = (shot: Shot, i: number) => (
    <VideoTile
      shot={shot}
      index={i + 1}
      progress={clockFor(shot.id).progress}
      playing={clockFor(shot.id).playing}
      speed={clockFor(shot.id).speed}
      tool={tool}
      color={ink}
      strokes={annos[shot.id] ?? EMPTY_STROKES}
      onCommit={(s) => commitStroke(shot.id, s)}
      onClearFrame={() => clearFrame(shot.id)}
      view={views[shot.id] ?? 'shot'}
      onView={(v) => setGroupView(shot.id, v)}
      onRemove={() => removeShot(shot.id)}
      onProgress={(p) => reportProgress(shot.id, p)}
      onEnded={() => endClock(shot.id)}
      units={units}
    />
  );
  // Controls bound to a tile id. Actions broadcast to the tile's whole link
  // group, so playing/scrubbing one linked shot drives every member.
  const renderControls = (id: string) => (
    <PlaybackControls
      compact
      clock={clockFor(id)}
      onToggle={() => togglePlay(id)}
      onScrub={(v) => scrubTo(id, v)}
      onStep={(d) => stepFrame(id, d)}
      onSpeed={(s) => setSpeed(id, s)}
    />
  );

  return (
    <>
      <PageHeader
        eyebrow={outliersOnly ? 'Surprise shots' : 'Shot Review'}
        title={titleSuffix}
        backHref={sessionId ? `/sessions/${sessionId}` : undefined}
        backLabel={sessionId ? 'Back to session' : undefined}
      />
      <div className="px-6 sm:px-8 lg:px-10 pb-10">
        <div className="max-w-[1400px]">
          {/* Shot picker bar */}
          <div className="bg-white rounded-2xl border border-border-subtle shadow-sm p-4 mb-6">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="type-label-sm text-text-tertiary">
                {selected.length} of {MAX_TILES} shots
              </span>
              <div className="flex items-center gap-2 flex-wrap">
                {selected.map((shot, i) => (
                  <span
                    key={shot.id}
                    className="inline-flex items-center gap-2 pl-2 pr-1.5 py-1 rounded-pill bg-neutral-50 border border-border-default"
                  >
                    <span
                      className="w-5 h-5 rounded-pill flex items-center justify-center text-[10px] font-bold text-white"
                      style={{ backgroundColor: CLUBS[shot.club].color }}
                    >
                      {shot.club}
                    </span>
                    <span className="text-xs font-semibold text-text-primary">Shot {i + 1}</span>
                    <span className="text-[11px] font-mono text-text-secondary">
                      {joinUnit(fmtDistance(shot.carry, units, 0))}
                    </span>
                    {shot.hasVideo && (
                      <Icon name="video-camera" size={12} className="text-text-tertiary" />
                    )}
                    <button
                      onClick={() => removeShot(shot.id)}
                      aria-label="Remove shot"
                      className="w-5 h-5 rounded-pill text-text-tertiary hover:text-text-primary hover:bg-neutral-200 flex items-center justify-center"
                    >
                      <Icon name="x" size={12} />
                    </button>
                  </span>
                ))}
                {selected.length < MAX_TILES && (
                  <AddShotControl
                    pool={pool.filter((p) => !selected.some((s) => s.id === p.id))}
                    open={addOpen}
                    setOpen={setAddOpen}
                    onAdd={(s) => {
                      addShot(s);
                      setAddOpen(false);
                    }}
                    units={units}
                  />
                )}
              </div>
              <div className="ml-auto">
                <UnitsControl value={units} onChange={setUnits} />
              </div>
            </div>
          </div>

          {selected.length === 0 ? (
            <EmptyState />
          ) : (
            <>
              <div className="flex gap-3 sm:gap-4 mb-6 items-stretch">
                {/* Vertical annotation rail — centred against the video rail. */}
                <div className="shrink-0 flex items-center">
                  <AnnotationRail
                    tool={tool}
                    setTool={setTool}
                    ink={ink}
                    setInk={setInk}
                    hasMarkup={hasAnyMarkup}
                    onUndo={undoMarkup}
                    onClearAll={clearAllMarkup}
                  />
                </div>

                {/* Horizontal scroll rail: two big portrait videos fill the
                    width, scroll/swipe to review the rest. All the numbers ride
                    on the video edges (trackman-style), so nothing crowds below.
                    A link icon between adjacent tiles syncs their playback. */}
                <div
                  className="flex-1 min-w-0 flex overflow-x-auto snap-x snap-mandatory -mx-1 px-1 pb-2"
                  style={{ columnGap: colGapPx }}
                >
                  {selected.map((shot, i) => (
                    <div
                      key={shot.id}
                      className="relative shrink-0 snap-start flex flex-col gap-2"
                      style={{ width: tileWidthCss }}
                    >
                      {renderTile(shot, i)}
                      {renderControls(shot.id)}
                      {i < selected.length - 1 && (
                        <LinkConnector
                          gap={colGapPx}
                          linked={links[i]}
                          onClick={() => toggleLink(i)}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Collapsible detail table — everything glanceable is already on
                  the videos; this is the deep side-by-side read on demand. */}
              <div className="bg-white rounded-2xl border border-border-subtle shadow-sm overflow-hidden">
                <button
                  onClick={() => setTableOpen((v) => !v)}
                  aria-expanded={tableOpen}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-neutral-50 transition-colors"
                >
                  <span className="type-label-sm text-text-secondary">
                    All metrics{tableOpen ? '' : ` · ${METRICS.length} per shot`}
                  </span>
                  <Icon
                    name={tableOpen ? 'chevron-up' : 'chevron-down'}
                    size={18}
                    className="text-text-tertiary"
                  />
                </button>
                {tableOpen && (
                  <div className="px-4 pb-4 overflow-x-auto">
                    <div
                      className="grid min-w-fit"
                      style={{
                        gridTemplateColumns: `minmax(72px, max-content) repeat(${selected.length}, minmax(96px, 1fr))`,
                      }}
                    >
                      {/* Header row: empty corner + shot chips. */}
                      <div aria-hidden />
                      {selected.map((shot, i) => (
                        <div
                          key={shot.id}
                          className="flex items-center justify-center gap-1.5 pb-2 mb-1 border-b border-border-subtle"
                        >
                          <span
                            className="px-1.5 py-0.5 rounded-sm text-[10px] font-bold uppercase tracking-caps text-white"
                            style={{ backgroundColor: CLUBS[shot.club].color }}
                          >
                            {shot.club}
                          </span>
                          <span className="text-[11px] font-bold uppercase tracking-caps text-text-tertiary">
                            Shot {i + 1}
                          </span>
                        </div>
                      ))}
                      {/* One row per metric: label (left) + a value per shot. */}
                      {METRICS.map((m) => (
                        <Fragment key={m.label}>
                          <div className="text-[11px] uppercase tracking-caps text-text-tertiary text-right self-center py-2 pr-3 border-b border-border-subtle/50">
                            {m.label}
                          </div>
                          {selected.map((shot) => (
                            <div
                              key={shot.id}
                              className="text-sm font-semibold text-text-primary tabular-nums text-center py-2 border-b border-border-subtle/50"
                            >
                              {m.fmt(shot, units)}
                            </div>
                          ))}
                        </Fragment>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}

function fmtTime(progress: number): string {
  const totalSec = (TIMELINE_MS / 1000) * progress;
  const s = Math.floor(totalSec);
  const cs = Math.floor((totalSec - s) * 10);
  return `0:0${s}.${cs}`;
}

function TransportButton({ icon, label, onClick }: { icon: 'chevron-left' | 'chevron-right'; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className="w-9 h-9 rounded-pill text-text-secondary hover:text-text-primary hover:bg-neutral-100 flex items-center justify-center transition-colors"
    >
      <Icon name={icon} size={18} />
    </button>
  );
}

function PlaybackControls({
  clock,
  compact,
  onToggle,
  onScrub,
  onStep,
  onSpeed,
  onUnlink,
}: {
  clock: Clock;
  compact?: boolean;
  onToggle: () => void;
  onScrub: (v: number) => void;
  onStep: (dir: -1 | 1) => void;
  onSpeed: (s: number) => void;
  /** When set (a multi-tile group bar), shows an unlink cap at the right end. */
  onUnlink?: () => void;
}) {
  const { progress, playing, speed } = clock;
  const cycleSpeed = () => {
    const idx = SPEEDS.indexOf(speed as (typeof SPEEDS)[number]);
    onSpeed(SPEEDS[(idx + 1) % SPEEDS.length]);
  };

  if (compact) {
    return (
      <div className="w-full flex items-center gap-2 bg-white rounded-pill border border-border-subtle shadow-sm px-3 py-1.5">
        <button
          onClick={onToggle}
          aria-label={playing ? 'Pause' : 'Play'}
          className="w-8 h-8 rounded-pill bg-rap-red text-white hover:bg-rap-red-hover flex items-center justify-center transition-colors shrink-0"
        >
          <Icon name={playing ? 'pause-circle' : 'play-circle'} size={18} />
        </button>
        <input
          type="range"
          min={0}
          max={1}
          step={0.005}
          value={progress}
          onChange={(e) => onScrub(parseFloat(e.target.value))}
          aria-label="Scrub playback"
          className="flex-1 accent-rap-red cursor-pointer"
        />
        <button
          onClick={cycleSpeed}
          className="shrink-0 w-11 text-center text-[11px] font-semibold text-text-secondary hover:text-text-primary bg-neutral-100 rounded-pill px-2 py-1"
        >
          {speed}×
        </button>
        {onUnlink && (
          <button
            onClick={onUnlink}
            aria-label="Separate these shots"
            title="Separate these shots"
            className="shrink-0 w-6 h-6 flex items-center justify-center text-text-secondary hover:text-rap-red transition-colors"
          >
            <Icon name="link" size={16} />
          </button>
        )}
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center gap-1">
        <TransportButton icon="chevron-left" label="Back frame" onClick={() => onStep(-1)} />
        <button
          onClick={onToggle}
          aria-label={playing ? 'Pause' : 'Play'}
          className="w-10 h-10 rounded-pill bg-rap-red text-white hover:bg-rap-red-hover flex items-center justify-center transition-colors"
        >
          <Icon name={playing ? 'pause-circle' : 'play-circle'} size={22} />
        </button>
        <TransportButton icon="chevron-right" label="Forward frame" onClick={() => onStep(1)} />
      </div>
      <div className="flex-1 flex items-center gap-3">
        <span className="font-mono text-xs text-text-tertiary tabular-nums w-10">{fmtTime(progress)}</span>
        <input
          type="range"
          min={0}
          max={1}
          step={0.005}
          value={progress}
          onChange={(e) => onScrub(parseFloat(e.target.value))}
          aria-label="Scrub playback"
          className="flex-1 accent-rap-red cursor-pointer"
        />
        <span className="font-mono text-xs text-text-tertiary tabular-nums w-10">{fmtTime(1)}</span>
      </div>
      <div className="flex items-center gap-1 bg-neutral-100 rounded-pill p-1">
        {SPEEDS.map((s) => (
          <button
            key={s}
            onClick={() => onSpeed(s)}
            className={clsx(
              'px-2.5 py-1 rounded-pill text-[11px] font-semibold transition-colors',
              s === speed ? 'bg-white text-text-primary shadow-sm' : 'text-text-secondary hover:text-text-primary',
            )}
          >
            {s}×
          </button>
        ))}
      </div>
    </>
  );
}

/** Seats in the gap between two adjacent tiles and toggles whether their
 *  playback is synced. Filled red when linked, muted when not. */
function LinkConnector({ gap, linked, onClick }: { gap: number; linked: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-label={linked ? 'Unsync these shots' : 'Sync these shots'}
      aria-pressed={linked}
      title={linked ? 'Playback synced — click to separate' : 'Click to sync playback'}
      className={clsx(
        'absolute z-10 -translate-x-1/2 w-7 h-7 rounded-pill flex items-center justify-center shadow-sm transition-colors',
        linked
          ? 'bg-rap-red text-white hover:bg-rap-red-hover'
          : 'bg-white border border-border-default text-text-secondary hover:text-rap-red',
      )}
      style={{ left: `calc(100% + ${gap / 2}px)`, bottom: 10 }}
    >
      <Icon name="link" size={15} />
    </button>
  );
}

function AnnotationRail({
  tool,
  setTool,
  ink,
  setInk,
  hasMarkup,
  onUndo,
  onClearAll,
}: {
  tool: AnnotateTool;
  setTool: Dispatch<SetStateAction<AnnotateTool>>;
  ink: string;
  setInk: (c: string) => void;
  hasMarkup: boolean;
  onUndo: () => void;
  onClearAll: () => void;
}) {
  const toggle = (t: AnnotateTool) => setTool((cur) => (cur === t ? 'off' : t));
  return (
    <div className="shrink-0 flex flex-col items-center gap-2.5 bg-white rounded-2xl border border-border-subtle shadow-sm p-2">
      <div className="flex flex-col gap-1">
        <RailTool glyph={<Icon name="pencil" size={16} />} label="Pen" active={tool === 'pen'} onClick={() => toggle('pen')} />
        <RailTool glyph={<LineGlyph />} label="Line" active={tool === 'line'} onClick={() => toggle('line')} />
        <RailTool glyph={<Icon name="arrow-right" size={16} />} label="Arrow" active={tool === 'arrow'} onClick={() => toggle('arrow')} />
        <RailTool glyph={<DotGlyph />} label="Dot" active={tool === 'dot'} onClick={() => toggle('dot')} />
      </div>
      <div className="w-7 h-px bg-border-subtle" />
      <div className="flex flex-col items-center gap-1.5">
        {INK_COLORS.map((c) => {
          const name = INK_NAMES[c] ?? c;
          const isWhite = c.toUpperCase() === '#FFFFFF';
          return (
            <button
              key={c}
              onClick={() => setInk(c)}
              aria-label={`${name} ink`}
              title={`${name} ink`}
              className={clsx(
                'w-6 h-6 rounded-pill transition-transform',
                // Selected swatch gets a dark ring + scales up. The white swatch
                // needs a heavier, darker border to read against the white rail.
                ink === c
                  ? 'scale-110 ring-2 ring-offset-1 ring-text-primary border border-white'
                  : isWhite
                    ? 'border-2 border-neutral-500 hover:scale-105'
                    : 'border border-neutral-300 hover:scale-105',
              )}
              style={{ backgroundColor: c }}
            />
          );
        })}
      </div>
      <div className="w-7 h-px bg-border-subtle" />
      <button
        onClick={onUndo}
        disabled={!hasMarkup}
        aria-label="Undo last markup"
        title="Undo last markup"
        className="w-9 h-9 rounded-md flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-neutral-100 transition-colors disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-default"
      >
        <UndoIcon />
      </button>
      <button
        onClick={onClearAll}
        disabled={!hasMarkup}
        aria-label="Clear all markup"
        title="Clear all markup"
        className="w-9 h-9 rounded-md flex items-center justify-center text-text-secondary hover:text-rap-red hover:bg-neutral-50 transition-colors disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-default"
      >
        <Icon name="trash" size={16} />
      </button>
    </div>
  );
}

function UndoIcon() {
  // Curved "undo" arrow (no matching DS stroke icon).
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M9 14L4 9l5-5" />
      <path d="M4 9h11a5 5 0 0 1 0 10h-1" />
    </svg>
  );
}

function RailTool({ glyph, label, active, onClick }: { glyph: ReactNode; label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      aria-pressed={active}
      className={clsx(
        'w-9 h-9 rounded-md flex items-center justify-center transition-colors',
        active ? 'bg-rap-red text-white' : 'text-text-secondary hover:text-text-primary hover:bg-neutral-100',
      )}
    >
      {glyph}
    </button>
  );
}

/** Diagonal line — clearer than a minus for the line tool. */
function LineGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden>
      <line x1="5" y1="19" x2="19" y2="5" />
    </svg>
  );
}

/** Solid filled dot — for the dot/marker tool. */
function DotGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <circle cx="12" cy="12" r="5" />
    </svg>
  );
}

function AddShotControl({
  pool,
  open,
  setOpen,
  onAdd,
  units = 'imperial',
}: {
  pool: Shot[];
  open: boolean;
  setOpen: (v: boolean) => void;
  onAdd: (s: Shot) => void;
  units?: UnitSystem;
}) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on outside click (anywhere not the trigger or the portalled menu).
  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t)) return;
      if (menuRef.current?.contains(t)) return;
      setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open, setOpen]);

  return (
    <>
      <button
        ref={triggerRef}
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-pill text-xs font-semibold text-text-secondary border border-dashed border-border-default hover:text-text-primary hover:border-text-primary transition-colors"
      >
        <Icon name="plus" size={14} />
        Add shot
      </button>
      {open && (
        <PortalMenu anchor={triggerRef} menuRef={menuRef} onClose={() => setOpen(false)}>
          {pool.length === 0 ? (
            <div className="px-3 py-6 text-center text-sm text-text-tertiary">No more shots to add</div>
          ) : (
            pool.slice(0, 40).map((shot) => (
              <button
                key={shot.id}
                onClick={() => onAdd(shot)}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-neutral-50 transition-colors text-left"
              >
                <span
                  className="w-6 h-6 rounded-pill flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                  style={{ backgroundColor: CLUBS[shot.club].color }}
                >
                  {shot.club}
                </span>
                <span className="text-sm font-semibold text-text-primary tabular-nums">
                  {joinUnit(fmtDistance(shot.carry, units, 0))}
                </span>
                <span className="text-xs text-text-tertiary">
                  {joinUnit(fmtSpeed(shot.ballSpeed, units, 0))} ball
                </span>
                {shot.hasVideo && <Icon name="video-camera" size={13} className="text-sport-golf-600" />}
                {shot.isOutlier && (
                  <span className="ml-auto px-1.5 py-0.5 rounded-sm bg-warning text-rap-black text-[9px] font-bold uppercase tracking-caps">
                    Surprise
                  </span>
                )}
              </button>
            ))
          )}
        </PortalMenu>
      )}
    </>
  );
}

/**
 * Renders a floating menu in a portal at the document body, positioned just
 * below an anchor element. Necessary because hardware-accelerated <video>
 * elements paint in a separate compositor layer that ignores normal z-index,
 * so a same-tree absolutely-positioned dropdown will flicker behind them.
 * Repositions on scroll / resize so the menu tracks the trigger.
 */
function PortalMenu({
  anchor,
  menuRef,
  onClose,
  children,
  align = 'left',
  width = 288,
  className = 'max-h-80 overflow-y-auto bg-white rounded-xl border border-border-default shadow-lg p-2',
}: {
  anchor: React.RefObject<HTMLElement>;
  menuRef: React.RefObject<HTMLDivElement>;
  onClose: () => void;
  children: ReactNode;
  align?: 'left' | 'right';
  width?: number;
  className?: string;
}) {
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    function place() {
      const el = anchor.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const left = align === 'right' ? r.right - width : r.left;
      setPos({ top: r.bottom + 8, left });
    }
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [anchor, align, width]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (typeof document === 'undefined' || !pos) return null;
  return createPortal(
    <div
      ref={menuRef}
      role="menu"
      style={{ position: 'fixed', top: pos.top, left: pos.left, width, zIndex: 1000 }}
      className={className}
    >
      {children}
    </div>,
    document.body,
  );
}


function UnitsControl({ value, onChange }: { value: UnitSystem; onChange: (u: UnitSystem) => void }) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t)) return;
      if (menuRef.current?.contains(t)) return;
      setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);
  const current = UNIT_SYSTEMS.find((u) => u.id === value) ?? UNIT_SYSTEMS[0];

  return (
    <>
      <button
        ref={triggerRef}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-pill text-xs font-semibold text-text-secondary border border-border-default hover:text-text-primary hover:border-text-primary transition-colors"
      >
        <Icon name="cog" size={14} />
        <span>Metrics</span>
        <span className="text-text-tertiary">·</span>
        <span className="text-text-primary">{current.label}</span>
        <Icon name={open ? 'chevron-up' : 'chevron-down'} size={12} />
      </button>
      {open && (
        <PortalMenu
          anchor={triggerRef}
          menuRef={menuRef}
          onClose={() => setOpen(false)}
          align="right"
          width={224}
          className="bg-white rounded-xl border border-border-default shadow-lg p-1"
        >
          {UNIT_SYSTEMS.map((u) => {
            const active = u.id === value;
            return (
              <button
                key={u.id}
                role="option"
                aria-selected={active}
                onClick={() => {
                  onChange(u.id);
                  setOpen(false);
                }}
                className={clsx(
                  'w-full flex items-center justify-between gap-3 px-3 py-2 rounded-lg text-left transition-colors',
                  active ? 'bg-neutral-100' : 'hover:bg-neutral-50',
                )}
              >
                <span className="flex flex-col">
                  <span className="text-sm font-semibold text-text-primary">{u.label}</span>
                  <span className="text-[11px] text-text-tertiary">{u.hint}</span>
                </span>
                {active && <Icon name="check" size={14} className="text-rap-red" />}
              </button>
            );
          })}
        </PortalMenu>
      )}
    </>
  );
}

function EmptyState() {
  return (
    <div className="bg-white rounded-2xl border border-border-subtle shadow-sm p-12 text-center">
      <span className="inline-flex w-12 h-12 rounded-pill bg-neutral-100 items-center justify-center text-text-secondary mb-4">
        <Icon name="video-camera" size={24} />
      </span>
      <h3 className="type-h3 text-text-primary mb-1">Pick shots to review</h3>
      <p className="type-body-sm text-text-secondary mb-5 max-w-md mx-auto">
        Open Shot Review from a session — surprise-shot callouts or any shot with a video icon drop
        straight into a side-by-side compare here.
      </p>
      <Link
        href="/sessions"
        className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-md bg-rap-red text-white text-sm font-semibold uppercase tracking-cta hover:bg-rap-red-hover transition-colors"
      >
        Browse sessions
        <Icon name="arrow-right" size={14} />
      </Link>
    </div>
  );
}
