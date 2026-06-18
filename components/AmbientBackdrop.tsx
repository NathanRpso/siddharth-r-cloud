/**
 * A slow golf-club swing drawn behind the whole app. It lives below content
 * (cards are opaque, so it only reads through gutters and page headers) and
 * never takes pointer events. Colours and the swing animation are defined in
 * globals.css (`.rcl-ambient` / `.rcl-swing`) so dark mode and the
 * reduced-motion preference are handled in one place.
 *
 * Geometry: the club pivots at the golfer's hands near the bottom-centre and
 * sweeps a wide, even arc overhead. The swing-plane guide and ground line are
 * static; only the club group rotates.
 */
export default function AmbientBackdrop() {
  return (
    <div className="rcl-ambient" aria-hidden>
      <svg viewBox="0 0 1200 800" preserveAspectRatio="xMidYMax slice">
        <g transform="translate(600 720)">
          {/* Swing-plane guide — the faint arc the club head travels. */}
          <path
            className="amb-plane"
            d="M -532.6 -173.05 A 560 560 0 0 1 532.6 -173.05"
            fill="none"
            strokeWidth={2}
            strokeDasharray="2 14"
            strokeLinecap="round"
          />
          {/* Ground line through the golfer's stance. */}
          <line
            className="amb-ground"
            x1={-760}
            y1={0}
            x2={760}
            y2={0}
            strokeWidth={2}
            strokeLinecap="round"
          />
          {/* The club itself — grip, shaft, head — rotating as one. */}
          <g className="rcl-swing">
            <line className="amb-grip" x1={0} y1={0} x2={0} y2={-90} strokeWidth={11} strokeLinecap="round" />
            <line className="amb-shaft" x1={0} y1={-90} x2={0} y2={-552} strokeWidth={6} strokeLinecap="round" />
            <circle className="amb-head" cx={0} cy={-560} r={15} />
          </g>
        </g>
      </svg>
    </div>
  );
}
