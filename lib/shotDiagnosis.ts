// Shot diagnosis — turns the raw measurements (clubPath, spinAxis,
// sideCarry, smash, launchAngle, attackAngle, carry) into golfer-language:
// a shape tag (push / pull / draw / fade / straight), a strike tag
// (flush / thin / fat / heavy / glance), and a one-line plain-English
// summary you can drop next to a clip.
//
// All thresholds are conservative and tuned to feel right for the prototype
// data (mid-handicap shapes). Tweak in one place if the dataset changes.

import type { Shot, ClubId } from './types';

export type ShotShape = 'push' | 'pull' | 'draw' | 'fade' | 'straight';
export type ShotStrike = 'flush' | 'thin' | 'fat' | 'heavy' | 'glance';

export interface ShotDiagnosis {
  shape: ShotShape;
  strike: ShotStrike;
  /** Tone for badges: positive = good shape/strike, warn = problem. */
  tone: 'positive' | 'neutral' | 'warn';
  /** One-line plain-English summary fit to display next to a clip. */
  line: string;
  /** Short shape tag suitable for a chip ("Pull-draw", "Push-fade"). */
  shapeLabel: string;
}

/** Direction terminology: positive sideCarry/spinAxis/clubPath = right. */
const PATH_STRAIGHT = 1.0;  // ° club-path inside this is "down the line"
const AXIS_STRAIGHT = 3.0;  // ° spin axis inside this is "no significant curve"
const SIDE_STRAIGHT = 4.0;  // yds offline inside this is "on line"

const STRIKE_FLUSH_SMASH: Record<'driver' | 'iron' | 'wedge' | 'wood', number> = {
  driver: 1.46, wood: 1.45, iron: 1.36, wedge: 1.20,
};

function clubCategory(c: ClubId): 'driver' | 'wood' | 'iron' | 'wedge' {
  if (c === 'Dr') return 'driver';
  if (c === '3W' || c === '5W') return 'wood';
  if (c === 'PW' || c === 'GW' || c === 'SW' || c === 'LW') return 'wedge';
  return 'iron';
}

/** Shape from spin axis (preferred — it's what causes the curve) with
 *  sideCarry as a tiebreaker for "did it actually go offline that way?" */
export function shotShape(shot: Shot): ShotShape {
  const axis = shot.spinAxis;
  const side = shot.sideCarry;
  const curves = Math.abs(axis) >= AXIS_STRAIGHT;
  const offline = Math.abs(side) >= SIDE_STRAIGHT;

  if (!curves && !offline) return 'straight';

  // Pushes/pulls = straight ball that started offline (axis small, side big).
  if (!curves && offline) return side > 0 ? 'push' : 'pull';

  // Curved ball: name by the curve direction.
  return axis > 0 ? 'fade' : 'draw';
}

/** Combined shape label golfers actually say ("pull-draw", "push-fade"). */
export function shapeLabel(shot: Shot): string {
  const shape = shotShape(shot);
  if (shape === 'straight') return 'Straight';
  if (shape === 'push' || shape === 'pull') {
    const cap = shape[0].toUpperCase() + shape.slice(1);
    return cap;
  }
  // For curved balls, prefix with start direction when it's clearly offline.
  const startedLeft = shot.sideCarry < -SIDE_STRAIGHT;
  const startedRight = shot.sideCarry > SIDE_STRAIGHT;
  const prefix = shape === 'draw'
    ? startedRight ? 'Push-' : startedLeft ? 'Pull-' : ''
    : startedLeft  ? 'Pull-' : startedRight ? 'Push-' : '';
  return `${prefix}${shape}`;
}

/** Strike quality from smash + launch + attack angle. The launch monitor
 *  doesn't report face contact directly, so this infers from the obvious
 *  tells: low smash + high spin = thin, low smash + low launch = fat. */
export function shotStrike(shot: Shot): ShotStrike {
  const cat = clubCategory(shot.club);
  const target = STRIKE_FLUSH_SMASH[cat];
  const dSmash = shot.smash - target;

  // Driver glance-off (heel/toe) shows up as a low smash with normal-ish launch.
  if (cat === 'driver' && dSmash <= -0.06) return 'glance';

  // Iron/wedge: divot timing matters more than for a driver.
  if (cat === 'iron' || cat === 'wedge') {
    if (dSmash <= -0.05 && shot.attackAngle <= -6) return 'fat';
    if (dSmash <= -0.05 && shot.launchAngle <= 9) return 'thin';
    // Heavy = solid contact but slightly chunked behind the ball (mild fat).
    if (dSmash <= -0.03 && shot.attackAngle <= -4) return 'heavy';
  }

  // Mild ones for any club.
  if (dSmash <= -0.04) return 'thin';
  return 'flush';
}

/** Tone judgement: a flush, straight ball is positive; a thin/fat or wild
 *  curve is warn; everything else is neutral. */
export function shotTone(d: { shape: ShotShape; strike: ShotStrike }): 'positive' | 'neutral' | 'warn' {
  if (d.strike === 'fat' || d.strike === 'thin' || d.strike === 'glance') return 'warn';
  if (d.shape === 'straight' && d.strike === 'flush') return 'positive';
  return 'neutral';
}

/** Plain-English line to display next to a clip. Keeps it short — one
 *  sentence — and reads as a coach would actually describe the shot. */
export function diagnosisLine(shot: Shot, shape: ShotShape, strike: ShotStrike): string {
  const side = Math.round(Math.abs(shot.sideCarry));
  const dir = shot.sideCarry > 0 ? 'right' : 'left';

  const strikePart = (() => {
    switch (strike) {
      case 'flush':  return 'Flushed it';
      case 'thin':   return 'Caught it thin';
      case 'fat':    return 'Hit it fat';
      case 'heavy':  return 'A touch heavy';
      case 'glance': return 'Glanced it off the face';
    }
  })();

  const shapePart = (() => {
    if (shape === 'straight') return 'straight down the line.';
    if (shape === 'push')     return `started right and held — ${side} yds ${dir} of target.`;
    if (shape === 'pull')     return `pulled left off the face — ${side} yds left of target.`;
    if (shape === 'draw')     return `worked right-to-left, finishing ${side} yds ${dir}.`;
    /* fade */                return `peeled left-to-right, finishing ${side} yds ${dir}.`;
  })();

  return `${strikePart}, ${shapePart}`;
}

export function diagnose(shot: Shot): ShotDiagnosis {
  const shape = shotShape(shot);
  const strike = shotStrike(shot);
  return {
    shape,
    strike,
    tone: shotTone({ shape, strike }),
    line: diagnosisLine(shot, shape, strike),
    shapeLabel: shapeLabel(shot),
  };
}
