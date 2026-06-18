'use client';

import { useEffect, useState } from 'react';
import PageHeader from '@/components/PageHeader';
import GoalsCard from '@/components/GoalsCard';
import {
  loadProfile,
  saveProfile,
  DEFAULT_PROFILE,
  type GolferProfile,
} from '@/lib/golferProfile';

/** "My Game" — the golfer's own handicap, the cohort they're measured against,
 *  and the goals they're chasing. Lives on the sidebar because it's personal
 *  setup, not analysis; everything else (Home, Performance) reads this profile
 *  so its comparisons follow what's set here. */
export default function MyGamePage() {
  const [profile, setProfile] = useState<GolferProfile>(DEFAULT_PROFILE);
  useEffect(() => { setProfile(loadProfile()); }, []);
  const update = (p: GolferProfile) => { setProfile(p); saveProfile(p); };

  return (
    <>
      <PageHeader title="My Game" eyebrow="Handicap & goals" />
      <div className="px-6 sm:px-8 lg:px-10 pb-10">
        <div className="max-w-[1400px]">
          <GoalsCard profile={profile} onChange={update} />
          <p className="type-body-sm text-text-secondary max-w-prose">
            Set your handicap and the level you want to be measured against, then
            pick a few goals to chase. The rest of the app — your dashboard and
            Performance comparisons — follows what you set here, so every number
            is judged against <em>you</em>, not a generic golfer.
          </p>
        </div>
      </div>
    </>
  );
}
