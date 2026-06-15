'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import clsx from 'clsx';
import Icon from './Icon';

/** Generic multiselect dropdown — one button on the toolbar, opens a
 *  checkbox popover. Scales to long option lists via an optional search
 *  field and a scrollable popover body. The same component drives both
 *  the "Where" (2 options, no search) and "Venue" (search on) filters
 *  so all filter groups read as a single uniform toolbar button. */
export default function FilterDropdown({
  label,
  icon,
  options,
  selected,
  onToggle,
  onClearGroup,
  searchable,
  searchPlaceholder = 'Search…',
  emptyHint = 'No matches',
  optionLabel,
}: {
  label: string;
  /** Optional stroke icon shown on the trigger button. */
  icon?: Parameters<typeof Icon>[0]['name'];
  options: string[];
  selected: Set<string>;
  onToggle: (value: string) => void;
  onClearGroup: () => void;
  /** Defaults to true when there are more than 5 options. */
  searchable?: boolean;
  searchPlaceholder?: string;
  emptyHint?: string;
  /** Map an option value to its display label (e.g. "Course" → "Course
   *  Play"). The underlying value is still used as the key + selection. */
  optionLabel?: (value: string) => string;
}) {
  const labelFor = (o: string) => (optionLabel ? optionLabel(o) : o);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const showSearch = searchable ?? options.length > 5;
  const count = selected.size;
  const active = count > 0;

  // Filter options against the search query (case-insensitive substring).
  const filtered = useMemo(() => {
    if (!query.trim()) return options;
    const q = query.toLowerCase();
    return options.filter((o) => labelFor(o).toLowerCase().includes(q));
  }, [options, query]);

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
    // Autofocus search on open.
    if (showSearch) {
      requestAnimationFrame(() => searchRef.current?.focus());
    }
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, showSearch]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={clsx(
          'inline-flex items-center gap-2 px-3 py-2 rounded-md border text-sm font-semibold transition-colors',
          active
            ? 'bg-neutral-950 border-neutral-950 text-white'
            : 'bg-white border-border-default text-text-primary hover:border-neutral-400',
        )}
      >
        {icon && <Icon name={icon} size={14} />}
        {label}
        {active && (
          <span
            className={clsx(
              'inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-pill text-[10px] font-bold leading-none tabular-nums',
              'bg-white text-neutral-950',
            )}
          >
            {count}
          </span>
        )}
        <Icon name="chevron-down" size={14} />
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1 z-30 w-64 bg-white rounded-lg border border-border-default shadow-lg overflow-hidden">
          {showSearch && (
            <div className="p-2 border-b border-border-subtle">
              <div className="relative">
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-text-tertiary pointer-events-none">
                  <Icon name="search" size={14} />
                </span>
                <input
                  ref={searchRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={searchPlaceholder}
                  className="w-full pl-7 pr-2 py-1.5 text-sm border border-border-default rounded-md focus:outline-none focus:border-rap-red focus:ring-2 focus:ring-rap-red/20"
                />
              </div>
            </div>
          )}

          <div className="max-h-64 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <div className="px-3 py-3 text-sm text-text-tertiary">{emptyHint}</div>
            ) : (
              filtered.map((o) => {
                const isSelected = selected.has(o);
                return (
                  <button
                    key={o}
                    type="button"
                    onClick={() => onToggle(o)}
                    className={clsx(
                      'w-full flex items-center gap-2.5 px-3 py-1.5 text-left text-sm transition-colors',
                      'text-text-secondary hover:bg-neutral-50 hover:text-text-primary',
                    )}
                  >
                    <span
                      className={clsx(
                        'w-4 h-4 rounded-sm border-2 flex-shrink-0 flex items-center justify-center',
                        isSelected
                          ? 'border-rap-red bg-rap-red text-white'
                          : 'border-border-default',
                      )}
                    >
                      {isSelected && <Icon name="check" size={10} />}
                    </span>
                    <span className={isSelected ? 'text-text-primary font-semibold' : undefined}>
                      {labelFor(o)}
                    </span>
                  </button>
                );
              })
            )}
          </div>

          {active && (
            <div className="border-t border-border-subtle p-2">
              <button
                type="button"
                onClick={() => {
                  onClearGroup();
                  setQuery('');
                }}
                className="w-full px-2 py-1.5 rounded-md text-xs font-semibold uppercase tracking-cta text-text-secondary hover:text-text-primary hover:bg-neutral-50 transition-colors"
              >
                Clear {label.toLowerCase()}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
