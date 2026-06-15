'use client';

import { usePathname } from 'next/navigation';
import clsx from 'clsx';
import Sidebar from './Sidebar';

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
      {!isShared && <Sidebar />}
      <main className={clsx('min-h-screen', !isShared && 'ml-[256px]')}>
        {children}
      </main>
    </>
  );
}
