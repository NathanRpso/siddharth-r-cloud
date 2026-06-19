'use client';

import { CLUBS } from '@/lib/clubs';
import type { HoleLayout, PlottedShot, HolePoint } from '@/lib/holeLayout';

interface Props {
  layout: HoleLayout;
  shots: PlottedShot[];
  /** When set, that shot's segment is highlighted; the rest dim slightly. */
  selectedShotId?: string | null;
  onSelectShot?: (id: string) => void;
}

// Margin in yards around the hole bounds so labels/hazards don't get clipped.
const MARGIN_YDS = 28;

/**
 * SVG hole-layout panel. Vertical orientation, tee at the bottom, green at
 * the top. The corridor + green + hazards are stylised (we don't have real
 * course geometry); the shot polyline on top is the real round.
 */
export default function HoleLayout({ layout, shots, selectedShotId = null, onSelectShot }: Props) {
  // ── viewBox ─────────────────────────────────────────────────────────────
  // Compute world bounds from centreline + hazards + any wayward shots, then
  // add a margin. Map world (yards) → svg via a single uniform scale so the
  // aspect feels natural.
  const xs: number[] = [];
  const ys: number[] = [];
  for (const p of layout.centerline) { xs.push(p.x); ys.push(p.y); }
  for (const h of layout.hazards)    { xs.push(h.at.x - h.r, h.at.x + h.r); ys.push(h.at.y - h.r, h.at.y + h.r); }
  for (const s of shots)             { xs.push(s.to.x); ys.push(s.to.y); }

  // Force corridor width to factor into the x-bounds so the fairway isn't
  // hugged by the viewBox if every shot stayed centred.
  xs.push(-layout.roughHalfWidth - 4, layout.roughHalfWidth + 4);

  const minX = Math.min(...xs) - MARGIN_YDS;
  const maxX = Math.max(...xs) + MARGIN_YDS;
  const minY = -MARGIN_YDS;
  const maxY = layout.yards + MARGIN_YDS;

  const widthYds  = maxX - minX;
  const heightYds = maxY - minY;

  // SVG y-axis is inverted vs golf (we want tee at bottom). Build a transform
  // that mirrors y: svgY = (heightYds - (worldY - minY)) etc.
  const toSvg = (p: HolePoint): HolePoint => ({
    x: p.x - minX,
    y: heightYds - (p.y - minY),
  });

  const centerlineD = layout.centerline.map(toSvg)
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(2)} ${p.y.toFixed(2)}`)
    .join(' ');

  // Build the fairway corridor polygon by walking the centreline with
  // left+right offsets equal to `fairwayHalfWidth`. Same idea for rough.
  const fairwayPoints = buildCorridor(layout.centerline, layout.fairwayHalfWidth).map(toSvg);
  const roughPoints   = buildCorridor(layout.centerline, layout.roughHalfWidth).map(toSvg);

  const teeSvg = toSvg(layout.tee);
  const pinSvg = toSvg(layout.pin);

  return (
    <svg
      viewBox={`0 0 ${widthYds.toFixed(2)} ${heightYds.toFixed(2)}`}
      preserveAspectRatio="xMidYMid meet"
      className="block w-full h-full"
      role="img"
      aria-label={`Hole ${layout.hole}, par ${layout.par}, ${layout.yards} yards`}
    >
      <defs>
        <linearGradient id={`grass-${layout.hole}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0E2A18" />
          <stop offset="1" stopColor="#0A1F12" />
        </linearGradient>
        <pattern id={`bunker-${layout.hole}`} width="2" height="2" patternUnits="userSpaceOnUse">
          <rect width="2" height="2" fill="#E5D6A8" />
          <circle cx="1" cy="1" r="0.4" fill="#C9B884" />
        </pattern>
      </defs>

      {/* Background = surrounding rough green */}
      <rect x="0" y="0" width={widthYds} height={heightYds} fill={`url(#grass-${layout.hole})`} />

      {/* Rough corridor — lighter shade than the deep-rough background */}
      <polygon
        points={roughPoints.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ')}
        fill="#143922"
        stroke="none"
      />

      {/* Fairway corridor */}
      <polygon
        points={fairwayPoints.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ')}
        fill="#2C7A3F"
        opacity="0.95"
        stroke="none"
      />

      {/* Hazards */}
      {layout.hazards.map((h, i) => (
        <g key={i}>
          {h.kind === 'bunker' ? (
            <circle
              cx={toSvg(h.at).x}
              cy={toSvg(h.at).y}
              r={h.r}
              fill={`url(#bunker-${layout.hole})`}
              stroke="#A88F50"
              strokeWidth="0.6"
            />
          ) : (
            <ellipse
              cx={toSvg(h.at).x}
              cy={toSvg(h.at).y}
              rx={h.r * 1.15}
              ry={h.r * 0.85}
              fill="#2B73DF"
              opacity="0.85"
              stroke="#1E5BB8"
              strokeWidth="0.6"
            />
          )}
        </g>
      ))}

      {/* Centreline (faint, dashed — purely orientational) */}
      <path d={centerlineD} stroke="#FFFFFF" strokeOpacity="0.18" strokeWidth="0.6" strokeDasharray="3 5" fill="none" />

      {/* Green */}
      <circle
        cx={pinSvg.x}
        cy={pinSvg.y}
        r={layout.greenRadius}
        fill="#7FD394"
        stroke="#3F7A55"
        strokeWidth="0.8"
      />
      {/* Flag stick */}
      <line x1={pinSvg.x} y1={pinSvg.y} x2={pinSvg.x} y2={pinSvg.y - 9} stroke="#0A0A0A" strokeWidth="0.7" />
      <polygon
        points={`${pinSvg.x},${pinSvg.y - 9} ${pinSvg.x + 5},${pinSvg.y - 7} ${pinSvg.x},${pinSvg.y - 5}`}
        fill="#CD1B32"
      />

      {/* Tee box */}
      <rect
        x={teeSvg.x - 4}
        y={teeSvg.y - 2}
        width="8"
        height="3"
        rx="1"
        fill="#FAFAFC"
        stroke="#0A0A0A"
        strokeWidth="0.4"
      />

      {/* Shot polyline — one segment per shot, club-coloured, with arrowhead. */}
      <defs>
        {shots.map((s) => (
          <marker
            key={`m-${s.shot.id}`}
            id={`arrow-${layout.hole}-${s.shot.id}`}
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="3"
            markerHeight="3"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill={CLUBS[s.shot.club].color} />
          </marker>
        ))}
      </defs>
      {shots.map((s) => {
        const from = toSvg(s.from);
        const to = toSvg(s.to);
        const isSel = selectedShotId === s.shot.id;
        const dim = selectedShotId !== null && !isSel;
        const color = CLUBS[s.shot.club].color;
        return (
          <g
            key={s.shot.id}
            onClick={() => onSelectShot?.(s.shot.id)}
            style={{ cursor: onSelectShot ? 'pointer' : 'default' }}
            opacity={dim ? 0.35 : 1}
          >
            {/* Wider invisible hit target so the line is easy to click. */}
            <line x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke="transparent" strokeWidth="6" />
            <line
              x1={from.x} y1={from.y} x2={to.x} y2={to.y}
              stroke={color}
              strokeWidth={isSel ? 1.8 : 1.2}
              strokeLinecap="round"
              markerEnd={`url(#arrow-${layout.hole}-${s.shot.id})`}
            />
            {/* Landing dot + shot index number for legibility. */}
            <circle cx={to.x} cy={to.y} r={isSel ? 2.2 : 1.6} fill={color} stroke="#FFFFFF" strokeWidth="0.6" />
            <text
              x={to.x + 2.6}
              y={to.y + 1}
              fontSize="4.2"
              fontWeight="700"
              fill="#FFFFFF"
              stroke="#0A0A0A"
              strokeWidth="0.4"
              paintOrder="stroke"
            >
              {s.index}
            </text>
          </g>
        );
      })}

      {/* Hole label top-right */}
      <g>
        <rect
          x={widthYds - 28} y={3} width="25" height="9" rx="1.5"
          fill="rgba(0,0,0,0.55)"
        />
        <text
          x={widthYds - 15.5} y={9.5}
          textAnchor="middle"
          fontSize="5"
          fontWeight="800"
          fill="#FFFFFF"
        >
          H{layout.hole} · PAR {layout.par}
        </text>
      </g>
    </svg>
  );
}

/** Build a corridor polygon offset `half` yards either side of the centreline. */
function buildCorridor(centerline: HolePoint[], half: number): HolePoint[] {
  if (centerline.length < 2) return [];
  const left: HolePoint[]  = [];
  const right: HolePoint[] = [];

  for (let i = 0; i < centerline.length; i++) {
    const prev = centerline[i - 1];
    const cur = centerline[i];
    const next = centerline[i + 1];

    // Tangent — average of incoming and outgoing segments.
    const tx = ((cur.x - (prev?.x ?? cur.x)) + ((next?.x ?? cur.x) - cur.x));
    const ty = ((cur.y - (prev?.y ?? cur.y)) + ((next?.y ?? cur.y) - cur.y));
    const len = Math.hypot(tx, ty) || 1;
    const nx = -ty / len; // perpendicular
    const ny = tx / len;

    left.push({ x: cur.x + nx * half,  y: cur.y + ny * half });
    right.push({ x: cur.x - nx * half, y: cur.y - ny * half });
  }
  return [...left, ...right.reverse()];
}

