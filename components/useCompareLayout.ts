'use client';

import { useEffect, useState, type RefObject } from 'react';

export interface CompareLayout {
  /** Tiles per row. */
  cols: number;
  /** Pixel width each tile should render at. */
  tileWidth: number;
  /** True when tiles can't all fit legibly — fall back to a swipe carousel. */
  carousel: boolean;
}

// Portrait shot-vision tiles: height ≈ 1.78 × width.
const ASPECT = 16 / 9;
const GAP = 36; // must match the layout's column gap, or rows mis-wrap
const MIN_W = 150; // legibility floor — low enough that 4 tiles + the label column fit one row on a laptop
const MAX_W = 460; // upper bound so a lone tile on a huge display stays sane
// Reserve only for what must stay on screen alongside the tiles — the playback
// controls + a breathing margin. The annotation toolbar and compare table sit
// below the fold and scroll, so they don't steal tile height.
const MARGIN = 24;
const MASTER_BAR = 76; // the single linked-mode control bar below the grid
const TILE_CONTROL = 56; // a per-tile control bar (separated/unlinked mode)

/**
 * Measurement-driven fit solver. Observes a STABLE container for width and the
 * visual viewport for height (so the mobile URL bar can't lie), then picks the
 * rows×cols arrangement and tile size that keeps every selected tile visible at
 * the largest legible size. Below the legibility floor it signals a carousel.
 *
 * `controlsPerTile` (separated/unlinked view) folds the per-tile control bar
 * into each row's height budget — so the separated layout sizes down or drops a
 * column to leave room for every tile's own controls, rather than overflowing.
 *
 * It only *optimises* — pair it with a CSS baseline so layout is correct even
 * before this runs.
 */
export function useCompareLayout(
  ref: RefObject<HTMLElement>,
  count: number,
  controlsPerTile: boolean,
  /** Width taken by a fixed leading column (e.g. the compare label column). */
  reservedWidth = 0,
): CompareLayout {
  const [layout, setLayout] = useState<CompareLayout>({
    cols: Math.min(count, 2),
    tileWidth: 300,
    carousel: false,
  });

  useEffect(() => {
    const el = ref.current;
    if (!el || count < 1) return;

    const compute = () => {
      const availW = el.clientWidth;
      const vpH = window.visualViewport?.height ?? window.innerHeight;
      // Document-relative top (add scrollY) so the budget doesn't balloon as the
      // page scrolls — a viewport-relative top goes negative when scrolled and
      // feeds back into ever-larger tiles.
      const top = el.getBoundingClientRect().top + window.scrollY;
      // Linked: one master bar lives below the grid. Separated: that bar is
      // gone, but every row carries its own control bar (folded in per-row).
      const below = MARGIN + (controlsPerTile ? 0 : MASTER_BAR);
      const perRow = controlsPerTile ? TILE_CONTROL : 0;
      const availH = Math.max(220, vpH - top - below);

      const usableW = availW - reservedWidth;

      // Prefer a SINGLE row: scale every tile down to fit all N across. This is
      // the wanted behaviour up through laptops/monitors.
      const single = Math.min((usableW - (count - 1) * GAP) / count, (availH - perRow) / ASPECT, MAX_W);
      if (single >= MIN_W) {
        setLayout({ cols: count, tileWidth: Math.floor(single), carousel: false });
        return;
      }

      // Single row no longer legible — fall back to the multi-row grid that
      // yields the largest tile (keeps every shot visible at once).
      let best = { cols: 1, tileWidth: 0 };
      for (let cols = 1; cols < count; cols++) {
        const rows = Math.ceil(count / cols);
        const byWidth = (usableW - (cols - 1) * GAP) / cols;
        const byHeight = (availH - (rows - 1) * GAP - rows * perRow) / rows / ASPECT;
        const w = Math.min(byWidth, byHeight, MAX_W);
        if (w > best.tileWidth) best = { cols, tileWidth: w };
      }
      if (best.tileWidth >= MIN_W) {
        setLayout({ cols: best.cols, tileWidth: Math.floor(best.tileWidth), carousel: false });
      } else {
        // Too small even gridded — carousel as many MIN_W tiles as the row holds.
        const fit = Math.max(1, Math.floor((availW + GAP) / (MIN_W + GAP)));
        setLayout({ cols: Math.min(fit, count), tileWidth: MIN_W, carousel: fit < count });
      }
    };

    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(el);
    window.addEventListener('resize', compute);
    window.visualViewport?.addEventListener('resize', compute);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', compute);
      window.visualViewport?.removeEventListener('resize', compute);
    };
  }, [ref, count, controlsPerTile, reservedWidth]);

  return layout;
}
