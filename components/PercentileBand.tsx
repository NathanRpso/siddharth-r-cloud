import type { PercentileSnapshot } from '@/lib/stats';

/** Pill background hex by band — chosen for contrast against the neutral track. */
const PILL_BG = {
  top:     '#1D804A',  // sport-golf-700
  above:   '#1CB864',  // sport-golf-600
  average: '#404040',  // neutral-800
  below:   '#F59E0B',  // warning
} as const;

/** Plain-English labels for each quartile zone, centered in their range. */
const ZONE_LABELS = [
  { label: 'Below avg', center: 12.5 },
  { label: 'Average',   center: 37.5 },
  { label: 'Above avg', center: 62.5 },
  { label: 'Top',       center: 87.5 },
];

export default function PercentileBand({ snapshot }: { snapshot: PercentileSnapshot }) {
  const pos = Math.max(2, Math.min(98, snapshot.percentile));
  const valueStr =
    snapshot.value.toFixed(snapshot.unit === '' ? 2 : 0) +
    (snapshot.unit ? ` ${snapshot.unit}` : '');

  return (
    <div>
      <div className="mb-2">
        <span className="type-h4 text-text-primary">{snapshot.metric}</span>
      </div>

      {/* Band — neutral track, visible quartile ticks, bold value pill */}
      <div className="relative h-9 mb-1.5">
        <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 h-1.5 rounded-pill bg-neutral-150" />

        {[25, 50, 75].map((p) => (
          <div
            key={p}
            className="absolute top-1/2 -translate-y-1/2 w-0.5 h-4 bg-neutral-400 rounded-sm"
            style={{ left: `calc(${p}% - 1px)` }}
            aria-hidden
          />
        ))}

        <div
          className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 px-2.5 py-1 rounded-pill text-xs font-bold text-white whitespace-nowrap shadow-sm"
          style={{ left: `${pos}%`, backgroundColor: PILL_BG[snapshot.band] }}
        >
          {valueStr}
        </div>
      </div>

      {/* Zone labels — plain-English anchors under each quartile */}
      <div className="relative h-4">
        {ZONE_LABELS.map((z) => (
          <span
            key={z.label}
            className="absolute -translate-x-1/2 text-[10px] uppercase tracking-caps font-bold text-text-tertiary whitespace-nowrap"
            style={{ left: `${z.center}%` }}
          >
            {z.label}
          </span>
        ))}
      </div>
    </div>
  );
}
