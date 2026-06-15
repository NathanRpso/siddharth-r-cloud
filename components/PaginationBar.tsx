'use client';

import { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import Icon from './Icon';

export const PAGE_SIZES = [20, 50] as const;
export type PageSize = (typeof PAGE_SIZES)[number];

/** Pagination toolbar — sits below the sessions list.
 *
 *  Left: showing range + per-page dropdown.
 *  Right: prev/next + page-number buttons with a sliding window so the
 *  control stays compact even for very long lists. */
export default function PaginationBar({
  currentPage,
  totalPages,
  perPage,
  totalItems,
  onPageChange,
  onPerPageChange,
}: {
  currentPage: number;
  totalPages: number;
  perPage: PageSize;
  totalItems: number;
  onPageChange: (page: number) => void;
  onPerPageChange: (size: PageSize) => void;
}) {
  if (totalItems === 0) return null;

  const start = (currentPage - 1) * perPage + 1;
  const end = Math.min(currentPage * perPage, totalItems);
  const pages = pageWindow(currentPage, totalPages);

  return (
    <div className="mt-6 flex flex-wrap items-center justify-between gap-3 text-sm">
      <div className="flex items-center gap-3">
        <span className="text-text-secondary">
          Showing{' '}
          <span className="font-semibold text-text-primary">
            {start}–{end}
          </span>{' '}
          of {totalItems}
        </span>
        <PerPageDropdown perPage={perPage} onChange={onPerPageChange} />
      </div>

      {totalPages > 1 && (
        <div className="flex items-center gap-1">
          <NavArrow
            direction="prev"
            disabled={currentPage === 1}
            onClick={() => onPageChange(currentPage - 1)}
          />
          {pages.map((p, i) =>
            p === 'ellipsis' ? (
              <span
                key={`e${i}`}
                className="px-1 text-text-tertiary"
                aria-hidden
              >
                …
              </span>
            ) : (
              <PageButton
                key={p}
                page={p}
                active={p === currentPage}
                onClick={() => onPageChange(p)}
              />
            ),
          )}
          <NavArrow
            direction="next"
            disabled={currentPage === totalPages}
            onClick={() => onPageChange(currentPage + 1)}
          />
        </div>
      )}
    </div>
  );
}

/* ────────────────────── Page-number button ────────────────────── */

function PageButton({
  page,
  active,
  onClick,
}: {
  page: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      aria-label={`Go to page ${page}`}
      className={clsx(
        'min-w-[32px] h-8 px-2 rounded-md text-sm font-semibold transition-colors tabular-nums',
        active
          ? 'bg-rap-red text-white'
          : 'text-text-secondary hover:bg-neutral-100 hover:text-text-primary',
      )}
    >
      {page}
    </button>
  );
}

/* ────────────────────── Prev / next arrow ────────────────────── */

function NavArrow({
  direction,
  disabled,
  onClick,
}: {
  direction: 'prev' | 'next';
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={direction === 'prev' ? 'Previous page' : 'Next page'}
      className={clsx(
        'w-8 h-8 rounded-md flex items-center justify-center transition-colors',
        disabled
          ? 'text-text-disabled cursor-not-allowed'
          : 'text-text-secondary hover:bg-neutral-100 hover:text-text-primary',
      )}
    >
      <Icon name={direction === 'prev' ? 'chevron-left' : 'chevron-right'} size={14} />
    </button>
  );
}

/* ────────────────────── Per-page dropdown ────────────────────── */

function PerPageDropdown({
  perPage,
  onChange,
}: {
  perPage: PageSize;
  onChange: (size: PageSize) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

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
          'inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border text-sm font-semibold transition-colors',
          open
            ? 'border-neutral-400 bg-neutral-50 text-text-primary'
            : 'border-border-default bg-white text-text-primary hover:border-neutral-400',
        )}
      >
        <span className="text-text-tertiary font-normal">Per page:</span>
        <span className="tabular-nums">{perPage}</span>
        <Icon name="chevron-down" size={12} />
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 z-30 w-32 bg-white rounded-lg border border-border-default shadow-lg p-1">
          {PAGE_SIZES.map((size) => {
            const active = size === perPage;
            return (
              <button
                key={size}
                type="button"
                onClick={() => {
                  onChange(size);
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
                <span className="tabular-nums">{size}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────── Page-window helper ─────────────────────── */

/** Build a compact list of pages around the current one. For small
 *  totals (≤7 pages) every page shows; otherwise we always include 1
 *  and the last page, plus a sliding window around current with
 *  ellipses in the gaps. */
function pageWindow(current: number, total: number): (number | 'ellipsis')[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  const out: (number | 'ellipsis')[] = [1];
  if (current > 4) out.push('ellipsis');
  const windowStart = Math.max(2, current - 1);
  const windowEnd = Math.min(total - 1, current + 1);
  for (let p = windowStart; p <= windowEnd; p++) out.push(p);
  if (current < total - 3) out.push('ellipsis');
  out.push(total);
  return out;
}
