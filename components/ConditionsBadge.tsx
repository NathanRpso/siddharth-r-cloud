import clsx from 'clsx';
import type { SessionConditions } from '@/lib/types';

interface Props {
  conditions: SessionConditions;
  size?: 'sm' | 'md';
}

/**
 * Compact weather badge for outdoor sessions. Reads as one chip:
 * [wind icon] 12 mph SW · 64°F. Tone shifts with wind so a windy day is
 * visually distinct from a calm one — context for any distance numbers.
 */
export default function ConditionsBadge({ conditions, size = 'sm' }: Props) {
  const { windMph, windDir, tempF, label } = conditions;
  const compass = bearingToCompass(windDir);
  const tone =
    label === 'Calm'    ? 'bg-sport-golf/10 text-sport-golf-700 border-sport-golf/30'
    : label === 'Light' ? 'bg-neutral-50    text-text-secondary  border-border-subtle'
    : label === 'Breezy'? 'bg-info-bg       text-info            border-info/30'
    : label === 'Windy' ? 'bg-warning-bg    text-warning         border-warning/30'
    :                     'bg-danger-bg     text-danger          border-danger/30';

  const text = size === 'md' ? 'text-xs' : 'text-[11px]';
  const pad  = size === 'md' ? 'px-2.5 py-1' : 'px-2 py-0.5';

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-pill border font-semibold',
        tone, text, pad,
      )}
      title={`${label} — ${windMph} mph from ${compass} · ${tempF}°F`}
    >
      <WindGlyph />
      <span className="tabular-nums">{windMph}</span>
      <span className="font-normal opacity-70">mph {compass}</span>
      <span className="opacity-40">·</span>
      <span className="tabular-nums">{tempF}°</span>
    </span>
  );
}

function bearingToCompass(deg: number): string {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  return dirs[Math.round(((deg % 360) / 45)) % 8];
}

function WindGlyph() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3 8h11a3 3 0 1 0-3-3" />
      <path d="M3 12h17a3 3 0 1 1-3 3" />
      <path d="M3 16h9" />
    </svg>
  );
}
