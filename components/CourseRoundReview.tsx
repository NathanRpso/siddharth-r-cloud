'use client';

import { useMemo, useState } from 'react';
import clsx from 'clsx';
import Icon from './Icon';
import VideoTile from './VideoTile';
import HoleLayout from './HoleLayout';
import { CLUBS } from '@/lib/clubs';
import { generateHoleLayout, plotShots, zoneLabel } from '@/lib/holeLayout';
import { fmtDistance, type UnitSystem } from '@/lib/units';
import { DEFAULT_OVERLAY, type OverlayPrefs } from '@/lib/overlayMetrics';
import type { Session, Shot } from '@/lib/types';
import type { AnnotateTool, Stroke } from './AnnotationCanvas';

interface Props {
  session: Session;
  units: UnitSystem;
  overlay: OverlayPrefs;
}

const EMPTY_STROKES: Stroke[] = [];

/**
 * Course-round view of Shot Review. Groups the session's shots by hole and
 * pairs each group with a procedurally-generated hole layout that shows
 * where each shot landed. Replaces the side-by-side compare rail when the
 * session's mode is "Course".
 */
export default function CourseRoundReview({ session, units, overlay }: Props) {
  const holes = session.course?.holes ?? [];

  // Bucket shots by hole, in tee-time order.
  const shotsByHole = useMemo(() => {
    const map = new Map<number, Shot[]>();
    for (const s of session.shots) {
      if (!s.hole) continue;
      const arr = map.get(s.hole);
      if (arr) arr.push(s);
      else map.set(s.hole, [s]);
    }
    return map;
  }, [session]);

  // Round summary across the visible holes.
  const summary = useMemo(() => {
    const total = holes.reduce((s, h) => s + h.strokes, 0);
    const par = holes.reduce((s, h) => s + h.par, 0);
    return { total, par, diff: total - par };
  }, [holes]);

  // Default: only the first hole is open. The rest expand on click.
  const [openHole, setOpenHole] = useState<number | null>(holes[0]?.hole ?? null);

  if (!holes.length) {
    return (
      <div className="bg-white rounded-2xl border border-border-subtle shadow-sm p-12 text-center">
        <h3 className="type-h3 text-text-primary mb-1">No scorecard for this round</h3>
        <p className="type-body-sm text-text-secondary">
          We don&apos;t have hole-by-hole data for this session, so the hole view can&apos;t be drawn.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Round summary strip */}
      <div className="bg-white rounded-2xl border border-border-subtle shadow-sm px-5 py-4 flex items-baseline justify-between flex-wrap gap-3">
        <div>
          <div className="text-[11px] uppercase tracking-caps font-bold text-text-tertiary">
            Round summary
          </div>
          <div className="type-h2 text-text-primary mt-0.5">
            {session.course?.name}
          </div>
        </div>
        <div className="flex items-baseline gap-4 font-mono tabular-nums">
          <ScoreBlock label="Strokes" value={String(summary.total)} />
          <ScoreBlock label="Par"     value={String(summary.par)} />
          <ScoreBlock
            label="vs Par"
            value={summary.diff > 0 ? `+${summary.diff}` : String(summary.diff)}
            tone={summary.diff > 0 ? 'warn' : summary.diff < 0 ? 'positive' : 'neutral'}
          />
        </div>
      </div>

      {holes.map((h) => {
        const open = openHole === h.hole;
        return (
          <HoleGroup
            key={h.hole}
            hole={h}
            shots={shotsByHole.get(h.hole) ?? []}
            open={open}
            onToggle={() => setOpenHole(open ? null : h.hole)}
            units={units}
            overlay={overlay}
          />
        );
      })}
    </div>
  );
}

function ScoreBlock({
  label, value, tone = 'neutral',
}: {
  label: string;
  value: string;
  tone?: 'positive' | 'neutral' | 'warn';
}) {
  return (
    <div className="text-right">
      <div className="text-[10px] uppercase tracking-caps font-bold text-text-tertiary">
        {label}
      </div>
      <div
        className={clsx(
          'text-2xl font-bold',
          tone === 'positive' && 'text-sport-golf-700',
          tone === 'warn'     && 'text-rap-red',
          tone === 'neutral'  && 'text-text-primary',
        )}
      >
        {value}
      </div>
    </div>
  );
}

function HoleGroup({
  hole,
  shots,
  open,
  onToggle,
  units,
  overlay,
}: {
  hole: NonNullable<NonNullable<Session['course']>['holes']>[number];
  shots: Shot[];
  open: boolean;
  onToggle: () => void;
  units: UnitSystem;
  overlay: OverlayPrefs;
}) {
  const layout = useMemo(() => generateHoleLayout(hole), [hole]);
  const plotted = useMemo(() => plotShots(layout, shots), [layout, shots]);
  const [selectedShotId, setSelectedShotId] = useState<string | null>(null);

  const diff = hole.strokes - hole.par;
  const scoreLabel = diff === 0
    ? 'Par'
    : diff === -1 ? 'Birdie'
    : diff === -2 ? 'Eagle'
    : diff === 1  ? 'Bogey'
    : diff === 2  ? 'Double'
    : diff > 2    ? `+${diff}`
    :                 `${diff}`;
  const scoreTone =
    diff < 0 ? 'positive'
    : diff === 0 ? 'neutral'
    : diff === 1 ? 'warn'
    : 'caution';

  return (
    <section
      className={clsx(
        'rcl-card bg-white rounded-2xl border border-border-subtle shadow-sm overflow-hidden transition-all',
      )}
    >
      {/* Header — always visible. Clicking the whole row toggles the group. */}
      <button
        onClick={onToggle}
        aria-expanded={open}
        className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-neutral-50 transition-colors text-left"
      >
        <span
          className={clsx(
            'shrink-0 w-10 h-10 rounded-md flex items-center justify-center text-sm font-bold',
            'bg-neutral-100 text-text-primary',
          )}
        >
          {hole.hole}
        </span>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-text-primary">
            Hole {hole.hole}
            <span className="ml-2 font-normal text-text-secondary">Par {hole.par} · {hole.yards} yds</span>
          </div>
          <div className="text-[12px] text-text-tertiary mt-0.5 flex flex-wrap items-center gap-x-3">
            <span>{shots.length} shot{shots.length === 1 ? '' : 's'} captured</span>
            {hole.gir && <span>· GIR</span>}
            {hole.fairwayHit && <span>· Fairway</span>}
            <span>· {hole.putts} putt{hole.putts === 1 ? '' : 's'}</span>
          </div>
        </div>
        <span
          className={clsx(
            'shrink-0 px-3 py-1 rounded-pill text-xs font-bold uppercase tracking-caps',
            scoreTone === 'positive' && 'bg-sport-golf/15 text-sport-golf-700',
            scoreTone === 'neutral'  && 'bg-neutral-100   text-text-secondary',
            scoreTone === 'warn'     && 'bg-warning-bg    text-warning',
            scoreTone === 'caution'  && 'bg-danger-bg     text-danger',
          )}
        >
          {scoreLabel} · {hole.strokes}
        </span>
        <Icon
          name={open ? 'chevron-up' : 'chevron-down'}
          size={18}
          className="text-text-tertiary ml-1"
        />
      </button>

      {open && (
        <div className="border-t border-border-subtle p-4 sm:p-5 grid gap-5 md:grid-cols-[320px_minmax(0,1fr)] items-start">
          {/* Hole layout — taller than wide. Capped so it doesn't dominate. */}
          <div className="relative aspect-[9/16] max-h-[560px] mx-auto md:mx-0 w-full md:max-w-[320px] rounded-xl overflow-hidden bg-[#0A1F12]">
            <HoleLayout
              layout={layout}
              shots={plotted}
              selectedShotId={selectedShotId}
              onSelectShot={(id) => setSelectedShotId(id === selectedShotId ? null : id)}
            />
          </div>

          {/* Shot list with mini-tile + plain summary. Click a row to highlight
              its arrow on the layout. */}
          <div className="flex flex-col gap-3 min-w-0">
            {plotted.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border-default p-6 text-center text-sm text-text-tertiary">
                No launch-monitor shots captured on this hole (putts and recovery shots aren&apos;t tracked).
              </div>
            ) : (
              plotted.map((p) => (
                <HoleShotRow
                  key={p.shot.id}
                  plotted={p}
                  selected={selectedShotId === p.shot.id}
                  onSelect={() =>
                    setSelectedShotId(p.shot.id === selectedShotId ? null : p.shot.id)
                  }
                  units={units}
                  overlay={overlay}
                />
              ))
            )}
          </div>
        </div>
      )}
    </section>
  );
}

/** One shot on the hole — header row (always visible) + expanded clip body
 *  when the row is selected. Reuses VideoTile so playback feels consistent
 *  with the rest of the Shot Review tab. */
function HoleShotRow({
  plotted,
  selected,
  onSelect,
  units,
  overlay,
}: {
  plotted: ReturnType<typeof plotShots>[number];
  selected: boolean;
  onSelect: () => void;
  units: UnitSystem;
  overlay: OverlayPrefs;
}) {
  const { shot, index, zone } = plotted;
  const def = CLUBS[shot.club];
  const carry = fmtDistance(shot.carry, units, 0);
  const zoneTone =
    zone === 'green'   ? 'text-sport-golf-700'
    : zone === 'fairway' ? 'text-sport-golf-700'
    : zone === 'rough' ? 'text-warning'
    : zone === 'hazard' ? 'text-danger'
    : zone === 'lost'  ? 'text-danger'
    : 'text-text-secondary';

  return (
    <div
      className={clsx(
        'rounded-xl border transition-colors',
        selected ? 'border-rap-red bg-rap-red/[0.04]' : 'border-border-subtle bg-white',
      )}
    >
      <button
        onClick={onSelect}
        className="w-full flex items-center gap-3 p-3 text-left"
        aria-expanded={selected}
      >
        <span
          className="shrink-0 w-9 h-9 rounded-pill flex items-center justify-center text-[11px] font-bold text-white"
          style={{ backgroundColor: def.color }}
        >
          {shot.club}
        </span>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-text-primary leading-tight">
            Shot {index} · {def.label}
          </div>
          <div className={clsx('text-[12px] mt-0.5 font-medium', zoneTone)}>
            {zoneLabel(plotted)}
          </div>
        </div>
        <div className="shrink-0 text-right font-mono tabular-nums text-sm text-text-secondary">
          {carry.value}<span className="text-text-tertiary"> {carry.unit}</span>
        </div>
        <Icon
          name={selected ? 'chevron-up' : 'chevron-down'}
          size={16}
          className="text-text-tertiary"
        />
      </button>

      {selected && (
        <div className="border-t border-border-subtle p-3">
          {/* Constrain the tile so it doesn't blow up the row; 9:16 video
              tiles look right at ~300px wide on a desktop. */}
          <div className="mx-auto w-full max-w-[300px]">
            <VideoTile
              shot={shot}
              index={index}
              progress={0}
              playing={false}
              speed={1}
              tool="off"
              color="#FFFFFF"
              strokes={EMPTY_STROKES}
              onCommit={() => {}}
              onClearFrame={() => {}}
              units={units}
              overlay={overlay}
            />
          </div>
        </div>
      )}
    </div>
  );
}
