/**
 * A few large, soft tonal clouds drifting slowly behind the whole app. It
 * lives below content (cards are opaque, so it only reads through gutters and
 * page headers) and never takes pointer events.
 *
 * All the work is in CSS (`.rcl-ambient` / `.rcl-cloud` in globals.css):
 * radial-gradient blobs on oversized layers, animated purely with `transform`
 * so the GPU composites them at ~no cost (no per-frame repaint). Two layers
 * drifting at different speeds add depth. Dark mode (via the `--cloud` colour)
 * and the reduced-motion preference are handled there in one place.
 */
export default function AmbientBackdrop() {
  return (
    <div className="rcl-ambient" aria-hidden>
      <div className="rcl-cloud rcl-cloud-1" />
      <div className="rcl-cloud rcl-cloud-2" />
    </div>
  );
}
