'use client';

import { useEffect, useMemo, useState } from 'react';
import PageHeader from '@/components/PageHeader';
import CalendarHeatmap from '@/components/CalendarHeatmap';
import PaginationBar, { type PageSize } from '@/components/PaginationBar';
import SessionCard from '@/components/SessionCard';
import SessionsFilterBar, { type SortKey } from '@/components/SessionsFilterBar';
import Icon from '@/components/Icon';
import { ALL_SHOTS, SESSIONS } from '@/lib/mockData';
import {
  buildHeadlineContext, pickCardHeadline, sessionInsights, sessionScore,
  type CardHeadline,
} from '@/lib/stats';
import type { Environment, Session, SessionMode } from '@/lib/types';

/** Each session enriched with the values we need for filtering, sorting,
 *  and grouping — pre-computed once so re-renders on filter changes don't
 *  redo the (cheap but non-trivial) insight math. */
interface SessionMeta {
  session: Session;
  score: number;
  /** "Home" when the session had no named venue. */
  venueKey: string;
  /** Lower-cased searchable haystack: title, venue, city, mode, date. */
  searchBlob: string;
}

const HOME_KEY = 'Home';
const ENVIRONMENTS: Environment[] = ['Indoor', 'Outdoor'];

/** Canonical display order for the mode filter — only modes actually
 *  present in the data are surfaced. */
const MODE_ORDER: SessionMode[] = [
  'Range', 'Practice', 'Target Range', 'Combine', 'Closest to Pin', 'Course',
];

export default function SessionsPage() {
  // ───── State ──────────────────────────────────────────────────────
  const [query, setQuery] = useState('');
  const [selectedModes, setSelectedModes] = useState<Set<SessionMode>>(new Set());
  const [selectedEnvironments, setSelectedEnvironments] = useState<Set<Environment>>(new Set());
  const [selectedVenues, setSelectedVenues] = useState<Set<string>>(new Set());
  const [sort, setSort] = useState<SortKey>('recent');
  const [perPage, setPerPage] = useState<PageSize>(20);
  const [currentPage, setCurrentPage] = useState(1);

  // ───── Enrich SESSIONS once ───────────────────────────────────────
  const allMeta: SessionMeta[] = useMemo(
    () =>
      SESSIONS.map((s) => {
        const ins = sessionInsights(s);
        const venueName = s.venue?.name ?? HOME_KEY;
        const city = s.venue?.city ?? '';
        const date = new Date(s.date);
        // Pre-format a few date views so users can type "april 2026" or "12 may".
        const dateBlob = [
          date.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }),
          date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
          date.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }),
        ].join(' ');
        const title = s.mode === 'Course' && s.course ? s.course.name : s.mode;
        return {
          session: s,
          score: ins ? sessionScore(ins).value : 0,
          venueKey: venueName,
          searchBlob: [title, venueName, city, s.mode, dateBlob].join(' ').toLowerCase(),
        };
      }),
    [],
  );

  // Modes present in the data, in canonical order — drives the Mode filter.
  const availableModes = useMemo(() => {
    const seen = new Set(allMeta.map((m) => m.session.mode));
    return MODE_ORDER.filter((m) => seen.has(m));
  }, [allMeta]);

  // Per-session headline insight — built once with shared lookup tables.
  const headlinesById = useMemo(() => {
    const ctx = buildHeadlineContext(ALL_SHOTS);
    const map = new Map<string, CardHeadline | null>();
    for (const m of allMeta) {
      map.set(m.session.id, pickCardHeadline(m.session, ctx));
    }
    return map;
  }, [allMeta]);

  // Venue list — only those that actually appear. Home pinned last.
  const availableVenues = useMemo(() => {
    const seen = new Set<string>();
    for (const m of allMeta) seen.add(m.venueKey);
    const list = Array.from(seen);
    list.sort((a, b) => {
      if (a === HOME_KEY) return 1;
      if (b === HOME_KEY) return -1;
      return a.localeCompare(b);
    });
    return list;
  }, [allMeta]);

  // ───── Filter ─────────────────────────────────────────────────────
  const filteredMeta = useMemo(() => {
    const q = query.trim().toLowerCase();
    return allMeta.filter((m) => {
      if (selectedModes.size && !selectedModes.has(m.session.mode)) {
        return false;
      }
      if (selectedEnvironments.size && !selectedEnvironments.has(m.session.environment)) {
        return false;
      }
      if (selectedVenues.size && !selectedVenues.has(m.venueKey)) {
        return false;
      }
      if (q && !m.searchBlob.includes(q)) {
        return false;
      }
      return true;
    });
  }, [allMeta, selectedModes, selectedEnvironments, selectedVenues, query]);

  // ───── Sort ───────────────────────────────────────────────────────
  const sortedMeta = useMemo(() => {
    const arr = filteredMeta.slice();
    switch (sort) {
      case 'recent':
        arr.sort((a, b) => +new Date(b.session.date) - +new Date(a.session.date));
        break;
      case 'best':
        arr.sort((a, b) => b.score - a.score);
        break;
      case 'shots':
        arr.sort((a, b) => b.session.shots.length - a.session.shots.length);
        break;
    }
    return arr;
  }, [filteredMeta, sort]);

  // ───── Pagination ─────────────────────────────────────────────────
  const totalPages = Math.max(1, Math.ceil(sortedMeta.length / perPage));
  // Clamp so a perPage bump that shrinks the page count snaps us back.
  const safePage = Math.min(currentPage, totalPages);
  const pageItems = useMemo(
    () => sortedMeta.slice((safePage - 1) * perPage, safePage * perPage),
    [sortedMeta, safePage, perPage],
  );

  // Reset to page 1 whenever the underlying list changes (filter/sort).
  useEffect(() => {
    setCurrentPage(1);
  }, [query, selectedModes, selectedEnvironments, selectedVenues, sort, perPage]);

  // ───── Group page items by month (only for default chronological sort) ───
  const groups = useMemo(() => {
    if (sort !== 'recent') return null;
    const buckets = new Map<string, { label: string; items: SessionMeta[] }>();
    for (const m of pageItems) {
      const d = new Date(m.session.date);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      const label = d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
      const bucket = buckets.get(key) ?? { label, items: [] };
      bucket.items.push(m);
      buckets.set(key, bucket);
    }
    return Array.from(buckets.values());
  }, [pageItems, sort]);

  // ───── Handlers ───────────────────────────────────────────────────
  const toggleSet = <T,>(setter: React.Dispatch<React.SetStateAction<Set<T>>>) => (val: T) => {
    setter((prev) => {
      const next = new Set(prev);
      if (next.has(val)) next.delete(val);
      else next.add(val);
      return next;
    });
  };

  const onClear = () => {
    setQuery('');
    setSelectedModes(new Set());
    setSelectedEnvironments(new Set());
    setSelectedVenues(new Set());
  };

  const hasAnyFilter =
    query.trim().length > 0 ||
    selectedModes.size > 0 ||
    selectedEnvironments.size > 0 ||
    selectedVenues.size > 0;

  // ───── Render ─────────────────────────────────────────────────────
  return (
    <>
      <PageHeader title="Sessions" />
      <div className="px-6 sm:px-8 lg:px-10 pb-10">
        <div className="max-w-[1400px]">
          <CalendarHeatmap sessions={sortedMeta.map((m) => m.session)} />

          <SessionsFilterBar
            query={query}
            onQueryChange={setQuery}
            modes={availableModes}
            selectedModes={selectedModes}
            onToggleMode={toggleSet(setSelectedModes)}
            onClearModes={() => setSelectedModes(new Set())}
            environments={ENVIRONMENTS}
            selectedEnvironments={selectedEnvironments}
            onToggleEnvironment={toggleSet(setSelectedEnvironments)}
            onClearEnvironments={() => setSelectedEnvironments(new Set())}
            venues={availableVenues}
            selectedVenues={selectedVenues}
            onToggleVenue={toggleSet(setSelectedVenues)}
            onClearVenues={() => setSelectedVenues(new Set())}
            sort={sort}
            onSortChange={setSort}
            onClear={onClear}
            hasAnyFilter={hasAnyFilter}
          />

          {/* Meta line — "Showing X of Y" only meaningful when filters are
              active; otherwise the summary tile already tells the story. */}
          {hasAnyFilter && (
            <div className="flex items-center justify-between mb-4 text-sm">
              <span className="text-text-secondary">
                Showing{' '}
                <span className="font-semibold text-text-primary">
                  {sortedMeta.length}
                </span>{' '}
                of {allMeta.length} sessions
              </span>
              <button
                onClick={onClear}
                className="inline-flex items-center gap-1 text-rap-red hover:text-rap-red-hover font-semibold"
              >
                Clear filters
                <Icon name="x" size={12} />
              </button>
            </div>
          )}

          {sortedMeta.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border-default p-12 text-center bg-white">
              <div className="w-12 h-12 rounded-pill bg-neutral-100 flex items-center justify-center mx-auto mb-4 text-text-tertiary">
                <Icon name="filter" size={22} />
              </div>
              <h3 className="type-h3 text-text-primary mb-1">No sessions match</h3>
              <p className="text-sm text-text-secondary max-w-md mx-auto mb-4">
                Try loosening a filter — or clear them all to see every session.
              </p>
              <button
                onClick={onClear}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-rap-red text-white text-xs font-semibold uppercase tracking-cta hover:bg-rap-red-hover transition-colors"
              >
                Clear filters
              </button>
            </div>
          ) : groups ? (
            // Grouped by month (default recent sort)
            <div className="flex flex-col gap-8">
              {groups.map((g) => (
                <div key={g.label}>
                  <div className="flex items-baseline justify-between mb-3">
                    <h2 className="type-label-sm text-text-tertiary tracking-caps">
                      {g.label}
                    </h2>
                    <span className="text-xs text-text-tertiary">
                      {g.items.length} session{g.items.length === 1 ? '' : 's'}
                    </span>
                  </div>
                  <div className="flex flex-col gap-3">
                    {g.items.map((m) => (
                      <SessionCard
                        key={m.session.id}
                        session={m.session}
                        headline={headlinesById.get(m.session.id)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            // Flat list — any non-chronological sort
            <div className="flex flex-col gap-3">
              {pageItems.map((m) => (
                <SessionCard
                  key={m.session.id}
                  session={m.session}
                  headline={headlinesById.get(m.session.id)}
                />
              ))}
            </div>
          )}

          <PaginationBar
            currentPage={safePage}
            totalPages={totalPages}
            perPage={perPage}
            totalItems={sortedMeta.length}
            onPageChange={setCurrentPage}
            onPerPageChange={setPerPage}
          />
        </div>
      </div>
    </>
  );
}
