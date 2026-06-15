'use client';

import { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import Icon from './Icon';
import FilterDropdown from './FilterDropdown';
import { modeLabel } from '@/lib/sessionTitle';
import type { Environment, SessionMode } from '@/lib/types';

export type SortKey = 'recent' | 'best' | 'shots';

export const SORT_OPTIONS: { id: SortKey; label: string }[] = [
  { id: 'recent', label: 'Most recent' },
  { id: 'best',   label: 'Best score' },
  { id: 'shots',  label: 'Most shots' },
];

/** Filter + sort toolbar for the sessions list.
 *
 *  Each filter group is a dropdown button so the bar reads as a single
 *  horizontal row no matter how many venues, devices, or other facets
 *  exist. Selected counts surface as badges on the button. Brand red
 *  stays reserved for CTAs and active checkbox fills — active button
 *  state uses neutral-950 inversion. */
export default function SessionsFilterBar({
  query,
  onQueryChange,
  modes,
  selectedModes,
  onToggleMode,
  onClearModes,
  environments,
  selectedEnvironments,
  onToggleEnvironment,
  onClearEnvironments,
  venues,
  selectedVenues,
  onToggleVenue,
  onClearVenues,
  sort,
  onSortChange,
  onClear,
  hasAnyFilter,
}: {
  query: string;
  onQueryChange: (q: string) => void;
  modes: SessionMode[];
  selectedModes: Set<SessionMode>;
  onToggleMode: (m: SessionMode) => void;
  onClearModes: () => void;
  environments: Environment[];
  selectedEnvironments: Set<Environment>;
  onToggleEnvironment: (e: Environment) => void;
  onClearEnvironments: () => void;
  venues: string[];
  selectedVenues: Set<string>;
  onToggleVenue: (v: string) => void;
  onClearVenues: () => void;
  sort: SortKey;
  onSortChange: (s: SortKey) => void;
  onClear: () => void;
  hasAnyFilter: boolean;
}) {
  return (
    <div className="mb-4 bg-white rounded-2xl border border-border-subtle shadow-sm px-4 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <SearchInput value={query} onChange={onQueryChange} />

        <FilterDropdown
          label="Mode"
          options={modes as unknown as string[]}
          selected={selectedModes as unknown as Set<string>}
          onToggle={(v) => onToggleMode(v as SessionMode)}
          onClearGroup={onClearModes}
          optionLabel={(v) => modeLabel(v as SessionMode)}
          searchable={false}
        />

        <FilterDropdown
          label="Where"
          options={environments as unknown as string[]}
          selected={selectedEnvironments as unknown as Set<string>}
          onToggle={(v) => onToggleEnvironment(v as Environment)}
          onClearGroup={onClearEnvironments}
          searchable={false}
        />

        {venues.length > 0 && (
          <FilterDropdown
            label="Venue"
            icon="location-marker"
            options={venues}
            selected={selectedVenues}
            onToggle={onToggleVenue}
            onClearGroup={onClearVenues}
            searchPlaceholder="Search venues…"
          />
        )}

        {hasAnyFilter && (
          <button
            type="button"
            onClick={onClear}
            className="inline-flex items-center gap-1 px-2 py-2 text-xs font-semibold uppercase tracking-cta text-text-secondary hover:text-text-primary transition-colors"
          >
            <Icon name="x" size={12} />
            Clear all
          </button>
        )}

        <div className="ml-auto">
          <SortDropdown sort={sort} onChange={onSortChange} />
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────────── Search input ───────────────────────────── */

function SearchInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="relative">
      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-tertiary pointer-events-none">
        <Icon name="search" size={14} />
      </span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search venue, course, date…"
        className="w-56 pl-8 pr-8 py-2 text-sm bg-white border border-border-default rounded-md focus:outline-none focus:border-rap-red focus:ring-2 focus:ring-rap-red/20 transition-colors"
        aria-label="Search sessions"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label="Clear search"
          className="absolute right-1.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-pill flex items-center justify-center text-text-tertiary hover:text-text-primary hover:bg-neutral-100 transition-colors"
        >
          <Icon name="x" size={12} />
        </button>
      )}
    </div>
  );
}

/* ─────────────────────────── Sort dropdown ──────────────────────────── */

function SortDropdown({
  sort,
  onChange,
}: {
  sort: SortKey;
  onChange: (s: SortKey) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = SORT_OPTIONS.find((s) => s.id === sort)!;

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={clsx(
          'inline-flex items-center gap-2 px-3 py-2 rounded-md border text-sm font-semibold transition-colors',
          open
            ? 'border-neutral-400 bg-neutral-50 text-text-primary'
            : 'border-border-default bg-white text-text-primary hover:border-neutral-400',
        )}
      >
        <span className="text-text-tertiary font-normal">Sort:</span>
        {current.label}
        <Icon name="chevron-down" size={14} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-30 w-48 bg-white rounded-lg border border-border-default shadow-lg p-1">
          {SORT_OPTIONS.map((o) => {
            const active = o.id === sort;
            return (
              <button
                key={o.id}
                onClick={() => {
                  onChange(o.id);
                  setOpen(false);
                }}
                className={clsx(
                  'w-full flex items-center gap-2.5 px-2 py-1.5 rounded-md text-left text-sm transition-colors',
                  active
                    ? 'bg-neutral-100 text-text-primary font-semibold'
                    : 'text-text-secondary hover:bg-neutral-50 hover:text-text-primary',
                )}
              >
                <span
                  className={clsx(
                    'w-3.5 h-3.5 rounded-pill border-2 flex-shrink-0',
                    active ? 'border-rap-red bg-rap-red' : 'border-border-default',
                  )}
                />
                {o.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
