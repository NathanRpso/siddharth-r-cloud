'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';
import Icon, { type StrokeIconName } from './Icon';
import ThemeToggle from './ThemeToggle';

// Primary nav = data surfaces. Secondary nav = settings.
const PRIMARY_NAV: { href: string; label: string; icon: StrokeIconName }[] = [
  { href: '/',            label: 'Home',        icon: 'home' },
  { href: '/sessions',    label: 'Sessions',    icon: 'flag' },
  { href: '/performance', label: 'Performance', icon: 'chart-bar' },
  { href: '/shot-review', label: 'Shot Review', icon: 'video-camera' },
];

const SECONDARY_NAV: { href: string; label: string; icon: StrokeIconName }[] = [
  { href: '/profile',     label: 'Profile',     icon: 'user-circle' },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-[256px] bg-rap-black text-white flex flex-col z-20">
      {/* Wordmark — full Rapsodo Golf lockup on matching black background */}
      <div className="pt-6 pb-4 flex items-center justify-center">
        <img
          src="/design-system/assets/logos/rapsodo-golf-full-black-bg.png"
          alt="Rapsodo Golf"
          width={512}
          height={320}
          className="w-[200px] h-auto select-none"
          draggable={false}
        />
      </div>

      {/* Primary nav — data surfaces */}
      <nav className="flex-1 px-3 py-2 space-y-1">
        {PRIMARY_NAV.map((item) => (
          <NavLink key={item.href} item={item} pathname={pathname} />
        ))}
      </nav>

      {/* Secondary nav — settings, divider above */}
      <div className="px-3 pt-3 pb-2 border-t border-neutral-900 space-y-1">
        {SECONDARY_NAV.map((item) => (
          <NavLink key={item.href} item={item} pathname={pathname} />
        ))}
      </div>

      {/* Theme toggle — light ↔ dark */}
      <div className="px-3 pb-2">
        <ThemeToggle />
      </div>

      {/* Logout */}
      <div className="px-3 pb-6">
        <button
          className="w-full flex items-center gap-3 px-4 py-3 rounded-md border border-neutral-800 text-neutral-300 hover:text-white hover:border-neutral-700 transition-colors"
          aria-label="Log out"
        >
          <Icon name="arrow-right" size={20} />
          <span className="type-label-sm tracking-caps text-[13px]">Logout</span>
        </button>
      </div>
    </aside>
  );
}

function NavLink({
  item,
  pathname,
}: {
  item: { href: string; label: string; icon: StrokeIconName };
  pathname: string;
}) {
  const active =
    item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
  return (
    <Link
      href={item.href}
      className={clsx(
        'group flex items-center gap-3 px-4 py-3 rounded-md transition-colors relative',
        active
          ? 'bg-neutral-900 text-white'
          : 'text-neutral-400 hover:text-white hover:bg-neutral-900',
      )}
    >
      {active && (
        <span className="absolute left-0 top-2 bottom-2 w-[3px] bg-rap-red rounded-r-sm" />
      )}
      <Icon name={item.icon} size={20} />
      <span className="type-label-sm tracking-caps text-[13px]">{item.label}</span>
    </Link>
  );
}
