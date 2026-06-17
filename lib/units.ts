// Unit conversions for shot metrics. Stored values are imperial
// (yards / mph / feet); presentation switches between systems.

export type UnitSystem = 'imperial' | 'metric';

export const UNIT_SYSTEMS: { id: UnitSystem; label: string; hint: string }[] = [
  { id: 'imperial', label: 'Imperial', hint: 'yds · mph · ft' },
  { id: 'metric', label: 'Metric', hint: 'm · km/h · m' },
];

const YD_TO_M = 0.9144;
const MPH_TO_KMH = 1.609344;
const FT_TO_M = 0.3048;

export interface Formatted {
  value: string;
  unit: string;
}

export function fmtDistance(yards: number, system: UnitSystem, digits = 1): Formatted {
  if (system === 'metric') return { value: (yards * YD_TO_M).toFixed(digits), unit: 'm' };
  return { value: yards.toFixed(digits), unit: 'yds' };
}

export function fmtSignedDistance(yards: number, system: UnitSystem, digits = 1): Formatted {
  const f = fmtDistance(Math.abs(yards), system, digits);
  return { value: `${yards > 0 ? '+' : yards < 0 ? '−' : ''}${f.value}`, unit: f.unit };
}

export function fmtSpeed(mph: number, system: UnitSystem, digits = 1): Formatted {
  if (system === 'metric') return { value: (mph * MPH_TO_KMH).toFixed(digits), unit: 'km/h' };
  return { value: mph.toFixed(digits), unit: 'mph' };
}

export function fmtHeight(ft: number, system: UnitSystem, digits = 0): Formatted {
  if (system === 'metric') return { value: (ft * FT_TO_M).toFixed(digits), unit: 'm' };
  return { value: ft.toFixed(digits), unit: 'ft' };
}

/** Convenience: render a Formatted as "value unit". */
export const join = (f: Formatted) => (f.unit ? `${f.value} ${f.unit}` : f.value);
