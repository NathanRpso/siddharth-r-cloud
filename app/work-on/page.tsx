'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import PageHeader from '@/components/PageHeader';
import Icon from '@/components/Icon';
import { ALL_SHOTS, SESSIONS } from '@/lib/mockData';
import { coachingPlan, type FocusArea } from '@/lib/coaching';
import { loadProfile, DEFAULT_PROFILE, type GolferProfile } from '@/lib/golferProfile';

/** "Work on this next" — turns the golfer's data into one prioritised practice
 *  focus + drill, then a few secondary ones. Reads the goal handicap set on My
 *  Game, so the plan is always aimed at the gap they actually want to close. */
export default function WorkOnPage() {
  const [profile, setProfile] = useState<GolferProfile>(DEFAULT_PROFILE);
  useEffect(() => { setProfile(loadProfile()); }, []);

  const plan = useMemo(
    () => coachingPlan(profile, ALL_SHOTS, SESSIONS),
    [profile],
  );
  const primary = plan[0];
  const secondary = plan.slice(1, 4);

  return (
    <>
      <PageHeader title="Work On" eyebrow="Your next practice focus" />
      <div className="px-6 sm:px-8 lg:px-10 pb-10">
        <div className="max-w-[1100px]">
          <p className="type-body text-text-secondary mb-6 max-w-[70ch]">
            One thing to groove next time you practise — chosen from where your game
            is furthest behind a{' '}
            <Link href="/my-game" className="font-semibold text-rap-red hover:text-rap-red-hover">
              {profile.goals.targetHandicap}-handicap
            </Link>
            , with accuracy weighted highest because that&apos;s what moves your score most.
          </p>

          {!primary ? (
            <div className="bg-white rounded-2xl border border-border-subtle shadow-sm p-10 text-center">
              <div className="w-12 h-12 rounded-pill bg-sport-golf/15 text-sport-golf-700 flex items-center justify-center mx-auto mb-3">
                <Icon name="badge-check" size={24} />
              </div>
              <h2 className="type-h2 text-text-primary mb-1">You&apos;re at goal level across the board</h2>
              <p className="type-body-sm text-text-secondary max-w-md mx-auto">
                Nothing is dragging you behind a {profile.goals.targetHandicap}-handicap right now.
                Keep grooving it — or set a tougher goal handicap on{' '}
                <Link href="/my-game" className="font-semibold text-rap-red">My Game</Link>.
              </p>
            </div>
          ) : (
            <>
              <PrimaryFocus area={primary} />
              {secondary.length > 0 && (
                <div className="mt-8">
                  <h2 className="type-h2 text-text-primary mb-4">Also worth working on</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {secondary.map((a) => <SecondaryFocus key={a.id} area={a} />)}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}

function PrimaryFocus({ area }: { area: FocusArea }) {
  return (
    <section className="bg-white rounded-2xl border border-border-subtle shadow-sm overflow-hidden">
      <div className="rcl-brand-strip h-1.5" />
      <div className="p-6 sm:p-8">
        <div className="flex items-center gap-2 mb-3">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-caps text-rap-red">
            <Icon name="fire" size={14} /> Focus #1
          </span>
          {area.accuracy && (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-caps text-text-tertiary">
              <Icon name="badge-check" size={13} /> Accuracy
            </span>
          )}
        </div>

        <h2 className="type-display-xs text-text-primary mb-2">{area.title}</h2>
        <p className="type-body-lg text-text-primary font-semibold mb-2 leading-snug">{area.headline}</p>
        <p className="type-body-sm text-text-secondary mb-5 max-w-[60ch]">{area.why}</p>

        <div className="flex flex-wrap gap-2 mb-6">
          <Chip>{area.yourLabel}</Chip>
          <Chip tone="goal">{area.targetLabel}</Chip>
        </div>

        <div className="rounded-xl bg-neutral-50 border border-border-subtle p-5">
          <div className="flex items-center gap-2 mb-2 text-[11px] font-bold uppercase tracking-caps text-sport-golf-700">
            <Icon name="clipboard" size={14} /> Try this drill
          </div>
          <p className="type-body text-text-primary leading-snug">{area.drill}</p>
        </div>
      </div>
    </section>
  );
}

function SecondaryFocus({ area }: { area: FocusArea }) {
  return (
    <div className="bg-white rounded-2xl border border-border-subtle shadow-sm p-5 flex flex-col">
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <h3 className="type-h3 text-text-primary">{area.title}</h3>
        {area.accuracy && (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-caps text-text-tertiary shrink-0">
            <Icon name="badge-check" size={12} /> Accuracy
          </span>
        )}
      </div>
      <p className="type-body-sm text-text-secondary mb-3">{area.headline}</p>
      <div className="mt-auto rounded-lg bg-neutral-50 border border-border-subtle p-3">
        <span className="text-[10px] font-bold uppercase tracking-caps text-sport-golf-700">Drill</span>
        <p className="text-sm text-text-primary mt-1 leading-snug">{area.drill}</p>
      </div>
    </div>
  );
}

function Chip({ children, tone }: { children: React.ReactNode; tone?: 'goal' }) {
  return (
    <span
      className={
        tone === 'goal'
          ? 'inline-flex items-center px-3 py-1.5 rounded-pill text-sm font-semibold bg-sport-golf/15 text-sport-golf-700'
          : 'inline-flex items-center px-3 py-1.5 rounded-pill text-sm font-semibold bg-neutral-100 text-text-secondary'
      }
    >
      {children}
    </span>
  );
}
