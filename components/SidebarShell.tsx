'use client';

import { usePathname } from 'next/navigation';
import clsx from 'clsx';
import Sidebar from './Sidebar';
import AmbientBackdrop from './AmbientBackdrop';

/**
 * Wraps the app shell — adds the sidebar on every internal route,
 * but hides it (and removes the left offset) on `/share/*` so the
 * coach-share view renders as a standalone page.
 */
export default function SidebarShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isShared = pathname.startsWith('/share/');

  return (
    <>
      {/* Ambient golf-swing motion, behind everything. Skipped on the
          standalone coach-share view to keep it print-clean. */}
      {!isShared && <AmbientBackdrop />}
      {!isShared && <Sidebar />}
      {/* `key` on pathname re-mounts the main column on every navigation, so
          the page-enter transition plays each route change instead of only on
          first load. `relative z-10` keeps content above the ambient backdrop.
          Cheap and works with the existing static-page routing. */}
      <main
        key={pathname}
        className={clsx('rcl-page-enter relative z-10 min-h-screen', !isShared && 'ml-[256px]')}
      >
        {children}
      </main>
    </>
  );
}
