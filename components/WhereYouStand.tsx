'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Icon from './Icon';
import PercentileBand from './PercentileBand';
import { ALL_SHOTS } from '@/lib/mockData';
import { handicapPercentiles, synthesisePercentiles } from '@/lib/stats';
import {
  loadProfile,
  scaledHandicapBenchmarks,
  DEFAULT_PROFILE,
} from '@/lib/golferProfile';

/** "Where you stand" — benchmarks the golfer against the cohort they chose in
 *  their profile (not a hardcoded 20-handicap). Client-side so it can read the
 *  saved handicap; first render uses the default profile so the static markup
 *  stays deterministic, then it hydrates to the golfer's setting. */
export default function WhereYouStand() {
  const [handicap, setHandicap] = useState(DEFAULT_PROFILE.comparisonHandicap);
  useEffect(() => { setHandicap(loadProfile().comparisonHandicap); }, []);

  const percentiles = useMemo(
    () => handicapPercentiles(ALL_SHOTS, scaledHandicapBenchmarks(handicap)),
    [handicap],
  );
  const synthesis = useMemo(
    () => synthesisePercentiles(percentiles, handicap),
    [percentiles, handicap],
  );

  return (
    <section className="rcl-card bg-white rounded-2xl border border-border-subtle shadow-sm p-6">
      <div className="flex items-baseline justify-between mb-4">
        <h2 className="type-h2 text-text-primary">Where you stand</h2>
        <span className="text-xs text-text-tertiary">
          Vs typical {handicap}-handicaps
        </span>
      </div>
      {synthesis && (
        <p className="type-body text-text-primary font-semibold mb-6 leading-snug">
          {synthesis}
        </p>
      )}
      <div className="space-y-6">
        {percentiles.length ? (
          percentiles.map((p) => <PercentileBand key={p.metric} snapshot={p} />)
        ) : (
          <p className="text-sm text-text-secondary">
            Hit a few more shots with driver and 7-iron to unlock skill benchmarks.
          </p>
        )}
      </div>
      {percentiles.length > 0 && (
        <Link
          href="/performance?tab=scoring"
          className="inline-flex items-center gap-1.5 mt-6 text-sm font-semibold text-rap-red hover:text-rap-red-hover transition-colors"
        >
          See your strokes-gained breakdown
          <Icon name="arrow-right" size={14} />
        </Link>
      )}
    </section>
  );
}
