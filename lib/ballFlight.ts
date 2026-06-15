import type { Shot } from './types';

/**
 * Turns a shot's real numbers into a broadcast-style "shot tracer" geometry,
 * expressed in a normalized 100×100 viewBox (y grows downward, like SVG).
 *
 * The camera sits behind the golfer looking downrange:
 *  - the ball launches from the tee near the bottom-centre,
 *  - rises to an apex (height ← shot.apex),
 *  - curves left/right (← shot.sideCarry: + right, − left),
 *  - and recedes toward the horizon (how far ← shot.carry).
 *
 * Reference scales are shared across every tile so a driver and a wedge
 * render at a believable relative size when compared side-by-side.
 */

const REF_CARRY = 230; // yds — a strong driver, anchors the far horizon
const REF_APEX = 100; // ft — anchors the tallest arc
const REF_SIDE = 30; // yds — anchors maximum visible curve

const TEE_X = 50;
const TEE_Y = 90;
const HORIZON_Y = 32;

export interface FlightPoint {
  x: number;
  y: number;
  /** Ball radius at this point — shrinks with perspective distance. */
  r: number;
  /** Live carry distance at this point, yds. */
  distYds: number;
  /** Live height above ground at this point, ft. */
  heightFt: number;
}

export interface BallFlightModel {
  /** Ball state at flight position t ∈ [0,1] (0 = impact, 1 = landing). */
  ballAt: (t: number) => FlightPoint;
  /** Sampled path points for drawing the tracer. */
  path: Array<{ x: number; y: number }>;
  apex: { x: number; y: number };
  landing: { x: number; y: number };
  tee: { x: number; y: number };
  horizonY: number;
}

function clamp(n: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, n));
}

export function buildFlight(shot: Shot): BallFlightModel {
  const carryFrac = clamp(shot.carry / REF_CARRY, 0.22, 1);
  const apexFrac = clamp(shot.apex / REF_APEX, 0.18, 1);
  const sideFrac = clamp(shot.sideCarry / REF_SIDE, -1, 1);

  // Longer carries land nearer the horizon; shorter shots fall short of it.
  const landingY = HORIZON_Y + (1 - carryFrac) * 26;
  const landingX = TEE_X + sideFrac * 26;
  const apexHeight = apexFrac * 46;

  const ballAt = (tRaw: number): FlightPoint => {
    const t = clamp(tRaw, 0, 1);
    // Curve accelerates through the flight, so the shot shape reveals late.
    const drift = 0.35 * t + 0.65 * t * t;
    const baseX = TEE_X + (landingX - TEE_X) * drift;
    const baseY = TEE_Y + (landingY - TEE_Y) * t;
    const perspective = 1 - 0.45 * t;
    const arc = apexHeight * 4 * t * (1 - t) * perspective;
    return {
      x: baseX,
      y: baseY - arc,
      r: 2.4 * (1 - 0.55 * t),
      distYds: shot.carry * t,
      heightFt: shot.apex * 4 * t * (1 - t),
    };
  };

  const SAMPLES = 56;
  const path = Array.from({ length: SAMPLES + 1 }, (_, i) => {
    const p = ballAt(i / SAMPLES);
    return { x: p.x, y: p.y };
  });

  return {
    ballAt,
    path,
    apex: ballAt(0.5),
    landing: ballAt(1),
    tee: { x: TEE_X, y: TEE_Y },
    horizonY: HORIZON_Y,
  };
}

/** Build an SVG path `d` string from sampled points (linear segments). */
export function toPathD(points: Array<{ x: number; y: number }>): string {
  if (!points.length) return '';
  return points
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(2)} ${p.y.toFixed(2)}`)
    .join(' ');
}

/**
 * Maps the global playback clock (0..1 across the whole tile timeline) to a
 * flight position. The first slice is a brief pre-impact "load" so play feels
 * like a swing replay rather than a bare arc.
 */
export const IMPACT_AT = 0.12;

/** Tracer timeline length at 1× speed, ms — roughly matches the ~6 s clips. */
export const TIMELINE_MS = 6000;

export function flightProgress(globalT: number): number {
  if (globalT <= IMPACT_AT) return 0;
  return (globalT - IMPACT_AT) / (1 - IMPACT_AT);
}
