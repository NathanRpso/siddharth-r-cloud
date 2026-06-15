'use client';

import { Fragment, useState } from 'react';
import clsx from 'clsx';
import Icon from './Icon';
import type { ClubId, Shot } from '@/lib/types';
import { CLUBS } from '@/lib/clubs';
import { rateDistanceConsistency, type ClubAggregate, type Rating } from '@/lib/stats';

export default function ClubBreakdownTable({
  byClub,
  shots,
}: {
  byClub: ClubAggregate[];
  shots: Shot[];
}) {
  const [expanded, setExpanded] = useState<Set<ClubId>>(new Set());

  function toggle(club: ClubId) {
    const next = new Set(expanded);
    if (next.has(club)) next.delete(club);
    else next.add(club);
    setExpanded(next);
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[920px]">
        <thead>
          <tr className="text-left border-b border-border-subtle">
            <Th>Club</Th>
            <Th align="right">Shots</Th>
            <Th align="right">Avg Carry</Th>
            <Th align="right">Range</Th>
            <Th align="right">Avg Ball Spd</Th>
            <Th align="right">Smash</Th>
            <Th align="left">Consistency</Th>
            <Th />
          </tr>
        </thead>
        <tbody>
          {byClub.map((c) => {
            const isOpen = expanded.has(c.club);
            const def = CLUBS[c.club];
            const clubShots = shots
              .filter((s) => s.club === c.club)
              .sort((a, b) => +new Date(a.timestamp) - +new Date(b.timestamp));
            return (
              <Fragment key={c.club}>
                <tr
                  onClick={() => toggle(c.club)}
                  className={clsx(
                    'border-b border-border-subtle cursor-pointer transition-colors',
                    isOpen ? 'bg-neutral-50' : 'hover:bg-neutral-50',
                  )}
                >
                  <Td>
                    <span className="inline-flex items-center gap-2.5">
                      <span
                        className="w-7 h-7 rounded-pill flex items-center justify-center text-[11px] font-bold text-white"
                        style={{ backgroundColor: def.color }}
                      >
                        {c.club}
                      </span>
                      <span className="font-semibold text-text-primary">{def.label}</span>
                    </span>
                  </Td>
                  <Td align="right" mono>{c.count}</Td>
                  <Td align="right" mono>{c.avgCarry.toFixed(1)} <Unit>yds</Unit></Td>
                  <Td align="right" mono>
                    <span className="text-text-secondary">±{c.carrySd.toFixed(0)} <Unit>yds</Unit></span>
                  </Td>
                  <Td align="right" mono>{c.avgBallSpeed.toFixed(1)} <Unit>mph</Unit></Td>
                  <Td align="right" mono>{c.avgSmash.toFixed(2)}</Td>
                  <Td>
                    <RatingPill rating={rateDistanceConsistency(c.carrySd, c.avgCarry)} />
                  </Td>
                  <Td align="right">
                    <span
                      className={clsx(
                        'text-text-tertiary transition-transform inline-block',
                        isOpen && 'rotate-180',
                      )}
                    >
                      <Icon name="chevron-down" size={16} />
                    </span>
                  </Td>
                </tr>

                {isOpen && (
                  <tr className="bg-neutral-50/70 border-b border-border-subtle">
                    <td colSpan={8} className="p-0">
                      <div className="px-6 py-4 overflow-x-auto">
                        <table className="w-full min-w-[820px]">
                          <thead>
                            <tr className="text-left">
                              <SubTh>#</SubTh>
                              <SubTh align="right">Carry</SubTh>
                              <SubTh align="right">Total</SubTh>
                              <SubTh align="right">Side</SubTh>
                              <SubTh align="right">Ball Spd</SubTh>
                              <SubTh align="right">Club Spd</SubTh>
                              <SubTh align="right">Smash</SubTh>
                              <SubTh align="right">Launch</SubTh>
                              <SubTh align="right">Spin</SubTh>
                              <SubTh align="center">Video</SubTh>
                            </tr>
                          </thead>
                          <tbody>
                            {clubShots.map((s, idx) => (
                              <tr
                                key={s.id}
                                className={clsx(
                                  'transition-colors',
                                  s.isOutlier && 'bg-danger-bg/40',
                                )}
                              >
                                <SubTd>
                                  <span className="inline-flex items-center gap-1.5">
                                    <span className="text-text-tertiary">{idx + 1}</span>
                                    {s.isOutlier && (
                                      <span className="text-danger">
                                        <Icon name="exclamation-circle" size={14} />
                                      </span>
                                    )}
                                  </span>
                                </SubTd>
                                <SubTd align="right" mono>{s.carry.toFixed(1)}</SubTd>
                                <SubTd align="right" mono>{s.total.toFixed(1)}</SubTd>
                                <SubTd align="right" mono>
                                  <span className={clsx(s.sideCarry > 0 ? 'text-text-primary' : 'text-text-secondary')}>
                                    {s.sideCarry > 0 ? '+' : ''}{s.sideCarry.toFixed(1)}
                                  </span>
                                </SubTd>
                                <SubTd align="right" mono>{s.ballSpeed.toFixed(1)}</SubTd>
                                <SubTd align="right" mono>{s.clubSpeed.toFixed(1)}</SubTd>
                                <SubTd align="right" mono>{s.smash.toFixed(2)}</SubTd>
                                <SubTd align="right" mono>{s.launchAngle.toFixed(1)}°</SubTd>
                                <SubTd align="right" mono>{s.spinRate}</SubTd>
                                <SubTd align="center">
                                  {s.hasVideo ? (
                                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-pill bg-neutral-100 text-text-primary">
                                      <Icon name="video-camera" size={14} />
                                    </span>
                                  ) : (
                                    <span className="text-text-tertiary">—</span>
                                  )}
                                </SubTd>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Th({
  children,
  align = 'left',
}: {
  children?: React.ReactNode;
  align?: 'left' | 'right' | 'center';
}) {
  return (
    <th
      className={clsx(
        'type-label-sm text-text-secondary px-4 py-3 font-semibold',
        align === 'right' && 'text-right',
        align === 'center' && 'text-center',
      )}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  align = 'left',
  mono = false,
}: {
  children: React.ReactNode;
  align?: 'left' | 'right' | 'center';
  mono?: boolean;
}) {
  return (
    <td
      className={clsx(
        'px-4 py-3 text-sm text-text-primary',
        align === 'right' && 'text-right',
        align === 'center' && 'text-center',
        mono && 'font-mono',
      )}
    >
      {children}
    </td>
  );
}

function SubTh({
  children,
  align = 'left',
}: {
  children?: React.ReactNode;
  align?: 'left' | 'right' | 'center';
}) {
  return (
    <th
      className={clsx(
        'text-[11px] uppercase tracking-caps text-text-tertiary font-semibold px-3 py-2',
        align === 'right' && 'text-right',
        align === 'center' && 'text-center',
      )}
    >
      {children}
    </th>
  );
}

function SubTd({
  children,
  align = 'left',
  mono = false,
}: {
  children: React.ReactNode;
  align?: 'left' | 'right' | 'center';
  mono?: boolean;
}) {
  return (
    <td
      className={clsx(
        'px-3 py-2 text-sm text-text-primary border-t border-border-subtle/60',
        align === 'right' && 'text-right',
        align === 'center' && 'text-center',
        mono && 'font-mono',
      )}
    >
      {children}
    </td>
  );
}

function Unit({ children }: { children: React.ReactNode }) {
  return <span className="text-text-tertiary text-xs ml-0.5">{children}</span>;
}

function RatingPill({ rating }: { rating: Rating }) {
  const tone = rating.tone;
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-pill text-xs font-semibold',
        tone === 'positive' && 'bg-sport-golf/15 text-sport-golf-700',
        tone === 'neutral'  && 'bg-neutral-100 text-text-secondary',
        tone === 'warn'     && 'bg-warning-bg text-warning',
        tone === 'caution'  && 'bg-danger-bg text-danger',
      )}
    >
      <span
        className={clsx(
          'w-1.5 h-1.5 rounded-pill',
          tone === 'positive' && 'bg-sport-golf',
          tone === 'neutral'  && 'bg-neutral-400',
          tone === 'warn'     && 'bg-warning',
          tone === 'caution'  && 'bg-danger',
        )}
      />
      {rating.label}
    </span>
  );
}
