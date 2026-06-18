// Procedural hole layout — generates a stylised tee-to-green corridor
// from a HoleResult (par + yardage) and projects each captured shot onto
// it using its real carry + sideCarry. Coordinate system:
//
//   x = lateral offset from centre line, in yards (+ right, − left)
//   y = distance from tee, in yards
//
// Renderers map this to whatever viewBox they want; the maths stays in
// "yards-from-tee" so it's honest about what it's drawing.
//
// We don't have real course geometry, so the corridor is procedurally
// generated and seeded by hole number — meaning the same hole always
// looks the same. The polyline drawn on top is the *real* round.

import type { HoleResult, Shot } from './types';

export interface HolePoint { x: number; y: number; }

export interface HoleLayout {
  hole: number;
  par: 3 | 4 | 5;
  /** Hole length in yards (the data we were given). */
  yards: number;
  /** Tee box centre, always at (0, 0). */
  tee: HolePoint;
  /** Pin / green centre, at the far end of the hole. */
  pin: HolePoint;
  /** Centreline waypoints from tee to pin — includes the dogleg corner. */
  centerline: HolePoint[];
  /** Fairway corridor as a polygon (lateral half-width = `fairwayHalfWidth`). */
  fairwayHalfWidth: number;
  /** Green radius in yards (a fat circle, not the real shape). */
  greenRadius: number;
  /** Rough corridor half-width — anything past this is "lost" / out of frame. */
  roughHalfWidth: number;
  /** Optional hazard markers placed alongside the corridor. */
  hazards: Hazard[];
}

export interface Hazard {
  kind: 'bunker' | 'water';
  /** Centre of the hazard, in yards-from-tee. */
  at: HolePoint;
  /** Radius in yards. */
  r: number;
}

export interface PlottedShot {
  shot: Shot;
  /** Position the shot was struck from. */
  from: HolePoint;
  /** Position the shot finished at. */
  to: HolePoint;
  /** Which surface the ball came to rest on. */
  zone: 'tee' | 'fairway' | 'rough' | 'green' | 'hazard' | 'lost';
  /** Sequence number on the hole (1-based). */
  index: number;
}

// ── RNG ─────────────────────────────────────────────────────────────────────

/** A tiny seeded RNG so a hole always generates the same layout. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ── Layout generation ─────────────────────────────────────────────────────

/**
 * Generate a layout for one hole. Par 3s are tee-to-green straight; par 4s
 * usually have a gentle dogleg at ~60% of length; par 5s are longer with a
 * stronger dogleg and one fairway bunker.
 */
export function generateHoleLayout(hole: HoleResult): HoleLayout {
  const rnd = mulberry32(hole.hole * 9176 + hole.par * 31 + hole.yards);
  const yards = hole.yards;

  const tee: HolePoint = { x: 0, y: 0 };
  const pin: HolePoint = { x: 0, y: yards };

  // Dogleg: par 3 = none; par 4 = sometimes; par 5 = usually.
  const doglegChance = hole.par === 3 ? 0 : hole.par === 4 ? 0.6 : 0.85;
  const doDogleg = rnd() < doglegChance;
  const doglegSide: 1 | -1 = rnd() < 0.5 ? -1 : 1;
  const doglegAngleDeg = doDogleg ? 10 + rnd() * 14 : 0; // 10°–24°
  const doglegAtPct = 0.52 + rnd() * 0.12; // 52%–64% of length

  const centerline: HolePoint[] = [tee];
  if (doDogleg) {
    const cornerY = yards * doglegAtPct;
    // The corner sits offset toward the dogleg side; the pin then sits
    // along the rotated continuation so the green stays at the far end.
    const cornerX = doglegSide * (yards * 0.04 + rnd() * yards * 0.04);
    centerline.push({ x: cornerX, y: cornerY });

    // Move the pin to follow the dogleg — bend the second segment by the
    // dogleg angle. Compute as polar from corner.
    const remaining = yards - cornerY;
    const angle = (doglegAngleDeg * Math.PI) / 180 * doglegSide;
    pin.x = cornerX + Math.sin(angle) * remaining;
    pin.y = cornerY + Math.cos(angle) * remaining;
  }
  centerline.push(pin);

  // Corridor widths scale gently with par — par 5s play a touch wider.
  const fairwayHalfWidth = hole.par === 3 ? 16 : hole.par === 4 ? 18 : 22;
  const roughHalfWidth = fairwayHalfWidth + 18;
  const greenRadius = hole.par === 3 ? 14 : 13;

  // Hazards — kept sparse and seeded so they don't visually clutter.
  const hazards: Hazard[] = [];
  // Greenside bunker: high chance, alternates side per hole.
  if (rnd() < 0.85) {
    const side: 1 | -1 = rnd() < 0.5 ? -1 : 1;
    hazards.push({
      kind: 'bunker',
      at: { x: pin.x + side * (greenRadius + 6 + rnd() * 4), y: pin.y - greenRadius - 3 + rnd() * 6 },
      r: 6 + rnd() * 3,
    });
  }
  // Fairway bunker on longer holes.
  if (hole.par >= 4 && rnd() < 0.6) {
    const side: 1 | -1 = rnd() < 0.5 ? -1 : 1;
    const along = 0.55 + rnd() * 0.2;
    const y = yards * along;
    const cx = doDogleg
      ? (y < centerline[1].y ? 0 : centerline[1].x + (y - centerline[1].y) * Math.tan((doglegAngleDeg * Math.PI) / 180) * doglegSide)
      : 0;
    hazards.push({
      kind: 'bunker',
      at: { x: cx + side * (fairwayHalfWidth + 4 + rnd() * 4), y },
      r: 5 + rnd() * 3,
    });
  }
  // Pond on a handful of holes for visual variety.
  if (hole.par >= 4 && rnd() < 0.18) {
    const side: 1 | -1 = rnd() < 0.5 ? -1 : 1;
    const along = 0.45 + rnd() * 0.25;
    hazards.push({
      kind: 'water',
      at: { x: side * (fairwayHalfWidth + 14 + rnd() * 10), y: yards * along },
      r: 10 + rnd() * 5,
    });
  }

  return {
    hole: hole.hole,
    par: hole.par,
    yards,
    tee,
    pin,
    centerline,
    fairwayHalfWidth,
    greenRadius,
    roughHalfWidth,
    hazards,
  };
}

// ── Shot projection ───────────────────────────────────────────────────────

function distance(a: HolePoint, b: HolePoint): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function classifyZone(
  layout: HoleLayout,
  point: HolePoint,
): PlottedShot['zone'] {
  // Inside the green circle? Done.
  if (distance(point, layout.pin) <= layout.greenRadius) return 'green';

  // Closest point on the polyline → lateral distance from centreline.
  let minLat = Infinity;
  for (let i = 0; i < layout.centerline.length - 1; i++) {
    const a = layout.centerline[i];
    const b = layout.centerline[i + 1];
    const lat = pointToSegmentLateral(point, a, b);
    if (lat < minLat) minLat = lat;
  }

  if (minLat <= layout.fairwayHalfWidth) return 'fairway';
  if (minLat <= layout.roughHalfWidth) return 'rough';

  // Hazard hit?
  for (const h of layout.hazards) {
    if (distance(point, h.at) <= h.r) return 'hazard';
  }
  return 'lost';
}

/** Shortest distance from a point to a segment — used for fairway/rough test. */
function pointToSegmentLateral(p: HolePoint, a: HolePoint, b: HolePoint): number {
  const abx = b.x - a.x;
  const aby = b.y - a.y;
  const len2 = abx * abx + aby * aby;
  if (len2 === 0) return distance(p, a);
  let t = ((p.x - a.x) * abx + (p.y - a.y) * aby) / len2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p.x - (a.x + abx * t), p.y - (a.y + aby * t));
}

/** Plot every shot on the hole as a from→to segment, finishing each at the
 *  ball's resting position. The launch monitor gives carry + sideCarry but
 *  no "where was I aiming" — so we use the centreline direction at the
 *  shot's start point as the aim, then offset laterally by sideCarry. */
export function plotShots(layout: HoleLayout, shots: Shot[]): PlottedShot[] {
  const sorted = shots.slice().sort(
    (a, b) => +new Date(a.timestamp) - +new Date(b.timestamp),
  );

  const plotted: PlottedShot[] = [];
  let cursor: HolePoint = { ...layout.tee };

  sorted.forEach((shot, i) => {
    // Aim direction = local centreline heading from `cursor` toward the
    // next waypoint (or the pin if past the last waypoint).
    const aim = nextAimVector(layout, cursor);

    // Convert carry / sideCarry into a world-space displacement: forward
    // component along aim, lateral component perpendicular to aim. The
    // perpendicular is rotated 90° clockwise (a right-side miss feels
    // "right" relative to the aim line, irrespective of dogleg side).
    const fwd = { x: aim.x * shot.carry, y: aim.y * shot.carry };
    const per = { x: aim.y * shot.sideCarry, y: -aim.x * shot.sideCarry };

    const to: HolePoint = {
      x: cursor.x + fwd.x + per.x,
      y: cursor.y + fwd.y + per.y,
    };

    const zone = classifyZone(layout, to);
    plotted.push({ shot, from: cursor, to, zone, index: i + 1 });
    cursor = to;
  });

  return plotted;
}

/** Local unit vector pointing from `p` toward the next centreline waypoint. */
function nextAimVector(layout: HoleLayout, p: HolePoint): HolePoint {
  // Find the first centreline point that is "ahead" of us along y.
  const target =
    layout.centerline.find((w) => w.y > p.y + 5) ?? layout.pin;
  const dx = target.x - p.x;
  const dy = target.y - p.y;
  const mag = Math.hypot(dx, dy) || 1;
  return { x: dx / mag, y: dy / mag };
}

/** Convenience: full description string for a plotted shot ("Fairway, 232 yds"). */
export function zoneLabel(p: PlottedShot): string {
  const cap = (s: string) => s[0].toUpperCase() + s.slice(1);
  return `${cap(p.zone)}, ${Math.round(p.shot.carry)} yds`;
}
