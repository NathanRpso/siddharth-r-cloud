import clsx from 'clsx';
import Icon from './Icon';

interface MetricTileProps {
  label: string;
  value: string | number;
  unit?: string;
  /** Plain-English rating — surfaced as the hero insight. */
  rating?: { label: string; tone: 'positive' | 'neutral' | 'warn' | 'caution' };
  /** Quiet supporting line under the rating. */
  sub?: string;
  /** Optional delta vs baseline. */
  delta?: number | null;
  deltaUnit?: string;
  goodDirection?: 'up' | 'down';
  icon?: React.ReactNode;
}

const TONE_TEXT = {
  positive: 'text-sport-golf-700',
  neutral:  'text-text-secondary',
  warn:     'text-warning',
  caution:  'text-danger',
} as const;

const TONE_DOT = {
  positive: 'bg-sport-golf',
  neutral:  'bg-neutral-400',
  warn:     'bg-warning',
  caution:  'bg-danger',
} as const;

const TONE_EDGE = {
  positive: 'bg-sport-golf',
  neutral:  'bg-transparent',
  warn:     'bg-warning',
  caution:  'bg-danger',
} as const;

export default function MetricTile({
  label,
  value,
  unit,
  rating,
  sub,
  delta,
  deltaUnit,
  goodDirection = 'up',
  icon,
}: MetricTileProps) {
  let deltaTone: 'positive' | 'warn' | 'neutral' = 'neutral';
  let deltaIcon: 'arrow-up' | 'arrow-down' | null = null;
  if (delta !== null && delta !== undefined && Math.abs(delta) > 0.001) {
    const good =
      (goodDirection === 'up' && delta > 0) ||
      (goodDirection === 'down' && delta < 0);
    deltaTone = good ? 'positive' : 'warn';
    deltaIcon = delta > 0 ? 'arrow-up' : 'arrow-down';
  }

  return (
    <div className="relative rounded-2xl bg-white border border-border-subtle shadow-sm p-5 flex flex-col gap-3 min-h-[180px] overflow-hidden">
      {/* State accent — slim left edge only when the rating has a non-neutral tone */}
      {rating && rating.tone !== 'neutral' && (
        <span
          aria-hidden
          className={clsx('absolute left-0 top-5 bottom-5 w-[3px] rounded-r-sm', TONE_EDGE[rating.tone])}
        />
      )}

      {/* Header — label + decorative icon */}
      <div className="flex items-start justify-between gap-3">
        <span className="type-label-sm text-text-tertiary leading-tight">
          {label}
        </span>
        {icon && <span className="text-text-tertiary/60 shrink-0">{icon}</span>}
      </div>

      {/* Value — big italic number */}
      <div className="flex items-baseline gap-1.5">
        <span className="type-display-md text-text-primary leading-none">
          {value}
        </span>
        {unit && (
          <span className="text-xs text-text-tertiary font-semibold uppercase tracking-caps">
            {unit}
          </span>
        )}
      </div>

      {/* Rating — the actual insight */}
      {rating && (
        <div className="flex items-center gap-2">
          <span className={clsx('w-1.5 h-1.5 rounded-pill shrink-0', TONE_DOT[rating.tone])} />
          <span className={clsx('text-sm font-semibold leading-tight', TONE_TEXT[rating.tone])}>
            {rating.label}
          </span>
        </div>
      )}

      {/* Sub + delta footer */}
      <div className="mt-auto space-y-1">
        {sub && <div className="text-xs text-text-tertiary leading-tight">{sub}</div>}
        {delta !== null && delta !== undefined && deltaIcon && (
          <div
            className={clsx(
              'inline-flex items-center gap-1 text-xs font-semibold',
              deltaTone === 'positive' && 'text-sport-golf-700',
              deltaTone === 'warn' && 'text-danger',
              deltaTone === 'neutral' && 'text-text-tertiary',
            )}
          >
            <Icon name={deltaIcon} size={12} />
            {delta > 0 ? '+' : ''}
            {delta.toFixed(Math.abs(delta) < 1 ? 2 : 1)}
            {deltaUnit && <span className="font-normal opacity-80">{deltaUnit}</span>}
          </div>
        )}
      </div>
    </div>
  );
}
