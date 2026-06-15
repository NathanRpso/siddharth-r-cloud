'use client';

import clsx from 'clsx';
import type { ClubId } from '@/lib/types';
import { CLUBS, CLUB_ORDER } from '@/lib/clubs';

interface Props {
  available: ClubId[];
  selected: ClubId[];
  onChange: (next: ClubId[]) => void;
}

export default function ClubChipSelector({ available, selected, onChange }: Props) {
  const set = new Set(selected);
  const inBagOrder = CLUB_ORDER.filter((c) => available.includes(c));

  function toggle(c: ClubId) {
    const next = new Set(set);
    if (next.has(c)) next.delete(c);
    else next.add(c);
    onChange(Array.from(next));
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        onClick={() => onChange([])}
        className={clsx(
          'px-3 py-1.5 rounded-pill text-xs font-semibold uppercase tracking-caps transition-colors',
          selected.length === 0
            ? 'bg-rap-black text-white'
            : 'bg-white border border-border-default text-text-secondary hover:text-text-primary',
        )}
      >
        Clear
      </button>
      {inBagOrder.map((club) => {
        const def = CLUBS[club];
        const active = set.has(club);
        return (
          <button
            key={club}
            onClick={() => toggle(club)}
            className={clsx(
              'px-3 py-1.5 rounded-pill text-xs font-semibold uppercase tracking-caps transition-colors inline-flex items-center gap-2',
              active
                ? 'text-white'
                : 'bg-white border border-border-default text-text-secondary hover:text-text-primary',
            )}
            style={active ? { backgroundColor: def.color } : undefined}
          >
            <span
              className="w-2 h-2 rounded-pill"
              style={{ backgroundColor: active ? 'white' : def.color }}
            />
            {club}
          </button>
        );
      })}
    </div>
  );
}
