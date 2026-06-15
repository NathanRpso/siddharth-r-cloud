'use client';

import { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import Icon from './Icon';
import { useSessionRename } from '@/lib/sessionRename';

/** The session-detail header title with an inline rename affordance.
 *
 *  - Default state: title rendered in `type-display-md`, pencil icon to
 *    the right, plus an optional "Reset" link when a custom rename is
 *    in effect.
 *  - Edit state: input pre-filled with the current title, Enter saves,
 *    Escape cancels. The input adopts the same display styling so what
 *    you type is what you see.
 *
 *  Rename persists in localStorage via useSessionRename, so the new
 *  title shows on the list cards too. */
export default function EditableSessionTitle({
  sessionId,
  defaultTitle,
  inlineCity,
}: {
  sessionId: string;
  /** Title derived from session data — used when no rename is set. */
  defaultTitle: string;
  /** City rendered inline next to the title (course mode). */
  inlineCity?: string | null;
}) {
  const { rename, setRename } = useSessionRename(sessionId);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const currentTitle = rename ?? defaultTitle;

  function startEdit() {
    setDraft(currentTitle);
    setEditing(true);
  }

  function save() {
    const trimmed = draft.trim();
    // Empty or unchanged from default → clear the rename so it falls
    // back to the derived title rather than persisting a redundant copy.
    if (!trimmed || trimmed === defaultTitle) {
      setRename(null);
    } else {
      setRename(trimmed);
    }
    setEditing(false);
  }

  function cancel() {
    setEditing(false);
    setDraft('');
  }

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  if (editing) {
    return (
      <div className="flex items-center gap-2 flex-wrap">
        <input
          ref={inputRef}
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') save();
            if (e.key === 'Escape') cancel();
          }}
          aria-label="Session title"
          className="type-display-md text-text-primary bg-white border-2 border-rap-red rounded-md px-3 py-1 focus:outline-none focus:ring-2 focus:ring-rap-red/20 min-w-0 max-w-full"
        />
        <button
          type="button"
          onClick={save}
          className="px-4 py-2 rounded-md bg-rap-red text-white text-xs font-semibold uppercase tracking-cta hover:bg-rap-red-hover transition-colors"
        >
          Save
        </button>
        <button
          type="button"
          onClick={cancel}
          className="px-4 py-2 rounded-md border border-border-default text-text-secondary text-xs font-semibold uppercase tracking-cta hover:text-text-primary hover:bg-neutral-50 transition-colors"
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <h1 className="type-display-md text-text-primary">
        {currentTitle}
        {inlineCity && (
          <span className="ml-3 font-sans font-normal normal-case text-2xl text-text-tertiary tracking-normal not-italic">
            {inlineCity}
          </span>
        )}
      </h1>
      <button
        type="button"
        onClick={startEdit}
        aria-label="Rename session"
        className={clsx(
          'w-9 h-9 rounded-md flex items-center justify-center transition-colors',
          'text-text-tertiary hover:text-text-primary hover:bg-neutral-100',
        )}
      >
        <Icon name="pencil" size={16} />
      </button>
    </div>
  );
}
