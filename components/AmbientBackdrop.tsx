/**
 * A faint, slowly-drifting grain texture behind the whole app — soft ambient
 * noise, like rain on glass, rather than any literal motif. It lives below
 * content (cards are opaque, so it only reads through gutters and page
 * headers) and never takes pointer events.
 *
 * All the work is in CSS (`.rcl-ambient` / `.rcl-noise` in globals.css): an
 * inline SVG turbulence used as a luminance mask over a tinted layer, drifting
 * via mask-position. Two layers at different scales/speeds add depth. Dark
 * mode and the reduced-motion preference are handled there in one place.
 */
export default function AmbientBackdrop() {
  return (
    <div className="rcl-ambient" aria-hidden>
      <div className="rcl-noise rcl-noise-1" />
      <div className="rcl-noise rcl-noise-2" />
    </div>
  );
}
