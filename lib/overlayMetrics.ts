// Customisable Shot-Review overlay — the catalogue of metrics a golfer can
// pin around the video edges, where each one sits, and how it's formatted.
//
// The overlay used to be a hardcoded set (Ball/Club speed left, Spin/Path
// right, Total bottom). Golfers wanted to choose what pops up and where —
// some always want Smash, some never do — so the placement now lives in user
// prefs (persisted to localStorage) and the tile renders whatever's chosen.

import {
  fmtDistance,
  fmtHeight,
  fmtSignedDistance,
  fmtSpeed,
  type Formatted,
  type UnitSystem,
} from './units';
import type { Shot } from './types';

/** Where a metric chip sits on the tile. `off` = hidden. */
export type OverlayZone = 'off' | 'left' | 'right' | 'bottom';

export interface OverlayMetric {
  id: string;
  /** Short caption shown above the value chip. */
  label: string;
  /** Formats a shot's value (+ unit) for the current unit system. */
  fmt: (s: Shot, u: UnitSystem) => Formatted;
}

const signed = (n: number, d = 1) => `${n > 0 ? '+' : ''}${n.toFixed(d)}`;

/** The full set of placeable metrics, in read-priority order. Carry isn't
 *  here — it's the always-on live HUD that counts up as the shot lands. */
export const OVERLAY_METRICS: OverlayMetric[] = [
  { id: 'total',     label: 'Total',      fmt: (s, u) => fmtDistance(s.total, u, 0) },
  { id: 'ballSpeed', label: 'Ball Speed', fmt: (s, u) => fmtSpeed(s.ballSpeed, u, 0) },
  { id: 'clubSpeed', label: 'Club Speed', fmt: (s, u) => fmtSpeed(s.clubSpeed, u, 0) },
  { id: 'smash',     label: 'Smash',      fmt: (s) => ({ value: s.smash.toFixed(2), unit: '' }) },
  { id: 'spin',      label: 'Spin',       fmt: (s) => ({ value: String(s.spinRate), unit: 'rpm' }) },
  { id: 'path',      label: 'Club Path',  fmt: (s) => ({ value: signed(s.clubPath), unit: '°' }) },
  { id: 'launch',    label: 'Launch',     fmt: (s) => ({ value: s.launchAngle.toFixed(1), unit: '°' }) },
  { id: 'attack',    label: 'Attack',     fmt: (s) => ({ value: signed(s.attackAngle), unit: '°' }) },
  { id: 'apex',      label: 'Apex',       fmt: (s, u) => fmtHeight(s.apex, u, 0) },
  { id: 'descent',   label: 'Descent',    fmt: (s) => ({ value: s.descentAngle.toFixed(0), unit: '°' }) },
  { id: 'side',      label: 'Side',       fmt: (s, u) => fmtSignedDistance(s.sideCarry, u, 1) },
  { id: 'spinAxis',  label: 'Spin Axis',  fmt: (s) => ({ value: signed(s.spinAxis), unit: '°' }) },
];

/** Map metric id → chosen zone. Anything missing reads as `off`. */
export type OverlayPrefs = Record<string, OverlayZone>;

/** Mirrors the old hardcoded layout, so first-run looks familiar. Smash is
 *  deliberately off — it's available for those who want it, not forced on. */
export const DEFAULT_OVERLAY: OverlayPrefs = {
  ballSpeed: 'left',
  clubSpeed: 'left',
  spin: 'right',
  path: 'right',
  total: 'bottom',
};

export const OVERLAY_STORAGE_KEY = 'rcloud:overlay-v1';

export function zoneOf(prefs: OverlayPrefs, id: string): OverlayZone {
  return prefs[id] ?? 'off';
}

/** Metrics assigned to a given edge, in catalogue order. */
export function metricsInZone(
  prefs: OverlayPrefs,
  zone: Exclude<OverlayZone, 'off'>,
): OverlayMetric[] {
  return OVERLAY_METRICS.filter((m) => (prefs[m.id] ?? 'off') === zone);
}

/** Count of metrics currently shown (any non-off zone). */
export function shownCount(prefs: OverlayPrefs): number {
  return OVERLAY_METRICS.reduce((n, m) => n + ((prefs[m.id] ?? 'off') !== 'off' ? 1 : 0), 0);
}

/** Load saved prefs, falling back to the default layout. */
export function loadOverlayPrefs(): OverlayPrefs {
  if (typeof window === 'undefined') return DEFAULT_OVERLAY;
  try {
    const raw = window.localStorage.getItem(OVERLAY_STORAGE_KEY);
    if (!raw) return DEFAULT_OVERLAY;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') return parsed as OverlayPrefs;
  } catch {
    /* ignore malformed storage */
  }
  return DEFAULT_OVERLAY;
}
