import { CLUBS } from './clubs';
import type { Shot } from './types';

/**
 * Maps a shot to a pair of real MLM2PRO sample clips — a vertical "shot
 * vision" swing video and a near-square "impact vision" close-up — the two
 * views the device captures alongside the numbers for every shot.
 *
 * We only have driver and iron footage, so woods borrow the driver clips and
 * wedges borrow the iron clips. A clip is offered only when the shot's
 * `hasVideo` flag is set (MLM2PRO captures); older MLM shots return null and
 * fall back to the synthetic ball-flight tracer.
 */

export interface ShotClips {
  shot: string; // vertical swing clip
  impact: string; // impact close-up clip
}

const base = '/shot-videos';

const DRIVER_SETS: ShotClips[] = [1, 2, 3].map((i) => ({
  shot: `${base}/driver-shot-${i}.mp4`,
  impact: `${base}/driver-impact-${i}.mp4`,
}));

const IRON_SETS: ShotClips[] = [1, 2].map((i) => ({
  shot: `${base}/iron-shot-${i}.mp4`,
  impact: `${base}/iron-impact-${i}.mp4`,
}));

/** Stable string hash so a given shot always maps to the same clip. */
function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function getShotClips(shot: Shot): ShotClips | null {
  if (!shot.hasVideo) return null;
  const cat = CLUBS[shot.club].category;
  const sets = cat === 'driver' || cat === 'wood' ? DRIVER_SETS : IRON_SETS;
  return sets[hash(shot.id) % sets.length];
}
