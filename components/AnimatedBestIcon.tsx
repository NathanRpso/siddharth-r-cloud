import clsx from 'clsx';

/**
 * Animated line-art icons for the All-time bests tiles.
 *
 * Each icon is stationary at rest. The motion only runs while an ancestor
 * `.group` (the tile) is hovered — the animation utilities are gated behind
 * `group-hover:`, and `pb-anim` lets `prefers-reduced-motion` switch them off.
 * Keyframes live in globals.css.
 */

export type BestIconKind = 'drive' | 'ball' | 'swing' | 'smash';

export default function AnimatedBestIcon({
  kind,
  size = 22,
  className,
}: {
  kind: BestIconKind;
  size?: number;
  className?: string;
}) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.6,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
    className: clsx('overflow-visible', className),
  };

  if (kind === 'drive') {
    return (
      <svg {...common}>
        {/* trajectory guide */}
        <path d="M3 19 Q12 0 21 19" strokeDasharray="1.5 2.4" opacity={0.4} />
        <line x1="2" y1="20" x2="22" y2="20" opacity={0.25} />
        {/* ball glides continuously along the arc (offset-path) */}
        <circle
          cx="0"
          cy="0"
          r="2"
          fill="currentColor"
          stroke="none"
          className="pb-anim group-hover:[animation:pb-fly_1.9s_ease-in-out_infinite]"
          style={{ offsetPath: "path('M3 19 Q12 0 21 19')", offsetRotate: '0deg' }}
        />
      </svg>
    );
  }

  if (kind === 'ball') {
    return (
      <svg {...common}>
        {/* speed lines */}
        <g stroke="currentColor">
          <line
            x1="2" y1="8" x2="9" y2="8"
            className="pb-anim group-hover:[animation:pb-streak_0.9s_ease-out_infinite]"
          />
          <line
            x1="1" y1="12" x2="9" y2="12"
            className="pb-anim group-hover:[animation:pb-streak_0.9s_ease-out_infinite_0.12s]"
          />
          <line
            x1="2" y1="16" x2="9" y2="16"
            className="pb-anim group-hover:[animation:pb-streak_0.9s_ease-out_infinite_0.24s]"
          />
        </g>
        {/* ball */}
        <g className="pb-anim group-hover:[animation:pb-nudge_0.9s_ease-in-out_infinite]">
          <circle cx="16" cy="12" r="4.2" fill="currentColor" stroke="none" />
        </g>
      </svg>
    );
  }

  if (kind === 'swing') {
    // A stick-figure golfer addressing the ball; on hover the arms + club
    // swing through to a follow-through finish. Body is static; the L-shaped
    // arms+club unit pivots at the shoulders (12.2, 6.8).
    return (
      <svg {...common} strokeWidth={1.8}>
        {/* body — head, leaning spine, athletic stance (static) */}
        <circle cx="13" cy="3.4" r="2" fill="currentColor" stroke="none" />
        <line x1="12.4" y1="5.4" x2="10.8" y2="13" />
        {/* lead leg (planted) + trail leg (flexed) */}
        <path d="M10.8 13 L8.2 17 L7.4 21.6" fill="none" />
        <path d="M10.8 13 L13.4 16.4 L15.2 20.4" fill="none" />
        {/* arms + club as one rigid L-shape, swinging at the shoulders */}
        <g
          className="pb-anim group-hover:[animation:pb-golfswing_1.6s_ease-in-out_infinite]"
          style={{ transformBox: 'view-box', transformOrigin: '12.2px 6.8px' }}
        >
          <line x1="12.2" y1="6.8" x2="12.9" y2="12" />
          <line x1="12.9" y1="12" x2="11.4" y2="19" strokeWidth={1.5} />
          <path d="M11.4 19 q-1.7 0.3 -2.1 1.9" strokeWidth={2.3} />
        </g>
      </svg>
    );
  }

  // smash (Cleanest Strike) — club head sweeps through contact, ball flies clean.
  return (
    <svg {...common}>
      {/* club: shaft + head, pivoting at the hands (12,4) */}
      <g
        className="pb-anim group-hover:[animation:pb-clubstrike_1.3s_ease-in-out_infinite]"
        style={{ transformBox: 'view-box', transformOrigin: '12px 4px' }}
      >
        <line x1="12" y1="4" x2="12" y2="18" />
        <path d="M12 18 q2.6 0.6 3.2 2.8" strokeWidth={2.6} />
      </g>
      {/* ball at the bottom of the arc, ejected on contact */}
      <circle
        cx="11"
        cy="20"
        r="2.2"
        fill="currentColor"
        stroke="none"
        className="pb-anim group-hover:[animation:pb-cleanlaunch_1.3s_ease-in-out_infinite]"
      />
    </svg>
  );
}
