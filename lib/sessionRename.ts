'use client';

import { useEffect, useState } from 'react';

/** localStorage-backed rename store. Maps session.id → custom title.
 *
 *  Renames persist across reloads so a session you've renamed on the
 *  detail page shows the new name on the list too. A custom event
 *  (`rcloud-rename`) is dispatched on write so every mounted hook
 *  re-reads — letting the rename ripple through the open page without
 *  needing a context provider. */

const STORAGE_KEY = 'rcloud_session_renames';
const RENAME_EVENT = 'rcloud-rename';

function readAll(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, string>) : {};
  } catch {
    return {};
  }
}

function writeOne(id: string, title: string | null): void {
  if (typeof window === 'undefined') return;
  const map = readAll();
  if (title && title.trim()) {
    map[id] = title.trim();
  } else {
    delete map[id];
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  window.dispatchEvent(new Event(RENAME_EVENT));
}

/** Subscribe to the rename for a single session.
 *
 *  Returns the current custom title (or null if none) plus a setter
 *  that persists to localStorage. Pass `null` to clear and fall back to
 *  the derived default. */
export function useSessionRename(sessionId: string): {
  rename: string | null;
  setRename: (title: string | null) => void;
} {
  const [rename, setLocal] = useState<string | null>(null);

  useEffect(() => {
    setLocal(readAll()[sessionId] ?? null);
    const onUpdate = () => setLocal(readAll()[sessionId] ?? null);
    window.addEventListener(RENAME_EVENT, onUpdate);
    // Storage events fire when other tabs change localStorage.
    window.addEventListener('storage', onUpdate);
    return () => {
      window.removeEventListener(RENAME_EVENT, onUpdate);
      window.removeEventListener('storage', onUpdate);
    };
  }, [sessionId]);

  return {
    rename,
    setRename: (title) => writeOne(sessionId, title),
  };
}
