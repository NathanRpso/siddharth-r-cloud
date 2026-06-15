'use client';

import { Fragment, Suspense, useEffect, useMemo, useRef, useState, type Dispatch, type ReactNode, type SetStateAction } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import clsx from 'clsx';
import PageHeader from '@/components/PageHeader';
import VideoTile from '@/components/VideoTile';
import Icon from '@/components/Icon';
import { type AnnotateTool, type Stroke } from '@/components/AnnotationCanvas';
import { useCompareLayout } from '@/components/useCompareLayout';
import { ALL_SHOTS, SESSIONS, getSession } from '@/lib/mockData';
import { CLUBS } from '@/lib/clubs';
import { getShotClips } from '@/lib/shotVideos';
import { TIMELINE_MS } from '@/lib/ballFlight';
import { modeLabel } from '@/lib/sessionTitle';
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
const METRICS: { label: string; fmt: (s: Shot) => string }[] = [
  { label: 'Carry', fmt: (s) => `${s.carry.toFixed(1)} yds` },
  { label: 'Total', fmt: (s) => `${s.total.toFixed(1)} yds` },
  { label: 'Side', fmt: (s) => `${s.sideCarry > 0 ? '+' : ''}${s.sideCarry.toFixed(1)} yds` },
  { label: 'Ball speed', fmt: (s) => `${s.ballSpeed.toFixed(1)} mph` },
  { label: 'Club speed', fmt: (s) => `${s.clubSpeed.toFixed(1)} mph` },
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

  // Adaptive layout: measure available space → tiles-per-row + tile size.
  // (Solver call lives below, once `perTile` is known.)
  const contentRef = useRef<HTMLDivElement>(null);

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

  // Break an entire group apart (every internal link → false).
  function unlinkGroup(group: string[]) {
    setLinks((prev) => {
      const next = [...prev];
      for (let j = 0; j < group.length - 1; j++) {
        const li = selectedIds.indexOf(group[j]);
        if (li >= 0) next[li] = false;
      }
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

  // Uniform gap wide enough to seat a link connector between adjacent tiles.
  const colGapPx = 36;
  // The compare table's leading metric-label column. The solver reserves it so
  // tiles + stats can share one grid and line up under each video.
  const LABEL_W = 84;

  // Every tile carries its own control bar now, so always fold a control-bar
  // height into each row of the fit-solver's budget; reserve the label column.
  const layout = useCompareLayout(contentRef, selected.length, true, LABEL_W + colGapPx);

  // Partition tiles into contiguous link-groups (one continuous control bar each).
  const groups: string[][] = [];
  selectedIds.forEach((id, i) => {
    if (i === 0 || !links[i - 1]) groups.push([id]);
    else groups[groups.length - 1].push(id);
  });
  // Continuous group bars only make sense on a single row.
  const singleRow = !layout.carousel && layout.cols >= selected.length;
  const maxRowW = layout.cols * layout.tileWidth + (layout.cols - 1) * colGapPx + 2;
  // Shared grid template: a label column + one column per tile. Tiles, control
  // bars, and stats all use it, so every shot's column lines up under its video.
  const gridTemplate = `${LABEL_W}px repeat(${selected.length}, ${layout.tileWidth}px)`;
  // Tile height (9:16) — used to centre the annotation rail against the videos
  // only, not the controls/compare table below them.
  const tileHeight = Math.round((layout.tileWidth * 16) / 9);

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
    />
  );
  // Controls bound to a tile id. Actions broadcast to the tile's whole group,
  // so a group's single bar (bound to its first tile) drives every member.
  const renderControls = (id: string, onUnlink?: () => void) => (
    <PlaybackControls
      compact
      clock={clockFor(id)}
      onToggle={() => togglePlay(id)}
      onScrub={(v) => scrubTo(id, v)}
      onStep={(d) => stepFrame(id, d)}
      onSpeed={(s) => setSpeed(id, s)}
      onUnlink={onUnlink}
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
                      {shot.carry.toFixed(0)} yds
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
                  />
                )}
              </div>
            </div>
          </div>

          {selected.length === 0 ? (
            <EmptyState />
          ) : (
            <>
              <div className="flex gap-3 sm:gap-4 mb-8 items-start">
                {/* Vertical annotation rail — centred against the videos only
                    (its wrapper is sized to the tile height). */}
                <div className="shrink-0 flex items-center" style={{ minHeight: tileHeight }}>
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

                {/* Tiles + playback controls. This column is what the fit solver
                    measures (rail excluded). */}
                <div ref={contentRef} className="flex-1 min-w-0">
              {/* The same VideoTile elements stay mounted across modes (no clip
                  reload). Single-row: tiles over one continuous control bar per
                  linked group, with a join icon only at unlinked boundaries.
                  Wrapped grid / carousel: per-tile bars (linking is a wide,
                  single-row interaction). */}
              {singleRow ? (
                <>
                  {/* Tiles on the shared grid: empty label cell + one per shot. */}
                  <div
                    className="grid items-end mb-2"
                    style={{ gridTemplateColumns: gridTemplate, columnGap: colGapPx, justifyContent: 'center' }}
                  >
                    <div aria-hidden />
                    {selected.map((shot, i) => (
                      <div key={shot.id} className="transition-[width] duration-300 ease-out">
                        {renderTile(shot, i)}
                      </div>
                    ))}
                  </div>
                  {/* Control bars on the same grid: one continuous bar per linked
                      group (spans its columns); join icon at unlinked boundaries. */}
                  <div
                    className="grid mb-6"
                    style={{ gridTemplateColumns: gridTemplate, columnGap: colGapPx, justifyContent: 'center' }}
                  >
                    <div aria-hidden style={{ gridColumn: 1 }} />
                    {groups.map((group, gi) => {
                      const startVid = selectedIds.indexOf(group[0]);
                      const boundaryIdx = selectedIds.indexOf(group[group.length - 1]);
                      return (
                        <div
                          key={group[0]}
                          className="relative"
                          style={{ gridColumn: `${2 + startVid} / span ${group.length}` }}
                        >
                          {renderControls(group[0], group.length > 1 ? () => unlinkGroup(group) : undefined)}
                          {gi < groups.length - 1 && (
                            <LinkConnector gap={colGapPx} onClick={() => toggleLink(boundaryIdx)} />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : (
                <div
                  className={clsx(
                    'flex items-end mb-6',
                    layout.carousel
                      ? 'flex-nowrap overflow-x-auto snap-x snap-mandatory justify-start -mx-1 px-1'
                      : 'flex-wrap justify-center mx-auto',
                  )}
                  style={{
                    columnGap: colGapPx,
                    rowGap: 24,
                    ...(layout.carousel ? {} : { maxWidth: maxRowW }),
                  }}
                >
                  {selected.map((shot, i) => {
                    const showJoin =
                      !layout.carousel && i < selected.length - 1 && (i + 1) % layout.cols !== 0 && !links[i];
                    return (
                      <div
                        key={shot.id}
                        className="relative flex flex-col items-center shrink-0 snap-center"
                        style={{ width: layout.tileWidth }}
                      >
                        {renderTile(shot, i)}
                        <div className="w-full mt-2">{renderControls(shot.id)}</div>
                        {showJoin && <LinkConnector gap={colGapPx} onClick={() => toggleLink(i)} />}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Compare numbers — one metric-label column, each shot's values in
                  a column under its video (shared grid → aligned with the tiles). */}
              <div className="mt-6">
                <div className={singleRow ? '' : 'overflow-x-auto'}>
                  <div
                    className="grid"
                    style={{
                      gridTemplateColumns: gridTemplate,
                      columnGap: colGapPx,
                      justifyContent: singleRow ? 'center' : 'start',
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
                    {/* One row per metric: label (left) + a value under each video. */}
                    {METRICS.map((m) => (
                      <Fragment key={m.label}>
                        <div className="text-[11px] uppercase tracking-caps text-text-tertiary text-right self-center py-2 border-b border-border-subtle/50">
                          {m.label}
                        </div>
                        {selected.map((shot) => (
                          <div
                            key={shot.id}
                            className="text-sm font-semibold text-text-primary tabular-nums text-center py-2 border-b border-border-subtle/50"
                          >
                            {m.fmt(shot)}
                          </div>
                        ))}
                      </Fragment>
                    ))}
                  </div>
                </div>
              </div>
                </div>
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

/** Join affordance shown only at an unlinked boundary (linked groups render a
 *  continuous bar instead). A bare icon seated in the gap — no container. */
function LinkConnector({ gap, onClick }: { gap: number; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-label="Link these shots"
      title="Link these shots"
      className="absolute z-10 -translate-x-1/2 w-6 h-6 flex items-center justify-center text-text-secondary hover:text-rap-red transition-colors"
      style={{ left: `calc(100% + ${gap / 2}px)`, bottom: 10 }}
    >
      <Icon name="link" size={16} />
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
}: {
  pool: Shot[];
  open: boolean;
  setOpen: (v: boolean) => void;
  onAdd: (s: Shot) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open, setOpen]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-pill text-xs font-semibold text-text-secondary border border-dashed border-border-default hover:text-text-primary hover:border-text-primary transition-colors"
      >
        <Icon name="plus" size={14} />
        Add shot
      </button>
      {open && (
        <div className="absolute z-30 left-0 top-full mt-2 w-72 max-h-80 overflow-y-auto bg-white rounded-xl border border-border-default shadow-lg p-2">
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
                <span className="text-sm font-semibold text-text-primary tabular-nums">{shot.carry.toFixed(0)} yds</span>
                <span className="text-xs text-text-tertiary">{shot.ballSpeed.toFixed(0)} mph ball</span>
                {shot.hasVideo && <Icon name="video-camera" size={13} className="text-sport-golf-600" />}
                {shot.isOutlier && (
                  <span className="ml-auto px-1.5 py-0.5 rounded-sm bg-warning text-rap-black text-[9px] font-bold uppercase tracking-caps">
                    Surprise
                  </span>
                )}
              </button>
            ))
          )}
        </div>
      )}
    </div>
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
