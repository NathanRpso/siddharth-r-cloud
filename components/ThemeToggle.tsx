'use client';

import { useEffect, useState } from 'react';
import clsx from 'clsx';

type Theme = 'light' | 'dark';

/**
 * Sun/moon toggle that flips `data-theme` on the root <html>. The actual
 * colour overrides live in globals.css under the `[data-theme="dark"]`
 * selector. Persisted to localStorage; the pre-paint script in layout.tsx
 * applies the saved value before first paint so there's no white flash.
 */
export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('light');

  useEffect(() => {
    const initial = (document.documentElement.dataset.theme as Theme) || 'light';
    setTheme(initial);
  }, []);

  function toggle() {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem('rcloud:theme', next);
    } catch {
      // localStorage can be disabled; toggle still works for this tab.
    }
  }

  const isDark = theme === 'dark';
  return (
    <button
      onClick={toggle}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      aria-pressed={isDark}
      title={isDark ? 'Light mode' : 'Dark mode'}
      className="w-full flex items-center justify-between gap-3 px-4 py-2.5 rounded-md border border-neutral-800 text-neutral-300 hover:text-white hover:border-neutral-700 transition-colors"
    >
      <span className="type-label-sm tracking-caps text-[13px]">
        {isDark ? 'Light mode' : 'Dark mode'}
      </span>
      <span
        className={clsx(
          'relative inline-flex h-6 w-11 items-center rounded-pill transition-colors',
          isDark ? 'bg-rap-red' : 'bg-neutral-700',
        )}
      >
        <span
          className={clsx(
            'inline-block h-5 w-5 rounded-pill bg-white shadow-sm transform transition-transform',
            isDark ? 'translate-x-[22px]' : 'translate-x-[2px]',
          )}
        >
          <SunMoon dark={isDark} />
        </span>
      </span>
    </button>
  );
}

function SunMoon({ dark }: { dark: boolean }) {
  return (
    <svg viewBox="0 0 20 20" className="h-5 w-5 p-[3px]" aria-hidden>
      {dark ? (
        <path
          d="M14 11.5A6 6 0 0 1 8 5.5c0-.7.12-1.36.34-1.97A6 6 0 1 0 16 14a6 6 0 0 1-2-2.5z"
          fill="#0A0A0A"
        />
      ) : (
        <g fill="#F59E0B">
          <circle cx="10" cy="10" r="3.6" />
          {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
            <rect
              key={a}
              x="9.25"
              y="1"
              width="1.5"
              height="2.6"
              rx="0.75"
              transform={`rotate(${a} 10 10)`}
            />
          ))}
        </g>
      )}
    </svg>
  );
}
