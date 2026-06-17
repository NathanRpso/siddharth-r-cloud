import Link from 'next/link';
import Icon from './Icon';
import TopBar from './TopBar';

/**
 * Full-viewport-width page header strip.
 *
 * Carries its own horizontal padding so the title aligns with the
 * content beneath (which uses the same `px-6 sm:px-8 lg:px-10` pattern),
 * while the Last Sync pill (and any `rightSlot`) pin to the far-right
 * edge of the viewport — independent of the page's content max-width.
 *
 * Pages render <PageHeader /> outside their content max-width wrapper.
 */
export default function PageHeader({
  title,
  eyebrow,
  rightSlot,
  lastSync,
  backHref,
  backLabel,
}: {
  title: string;
  eyebrow?: string;
  rightSlot?: React.ReactNode;
  lastSync?: string;
  backHref?: string;
  backLabel?: string;
}) {
  return (
    <header className="px-6 sm:px-8 lg:px-10 pt-8 pb-8">
      {backHref && (
        <Link
          href={backHref}
          className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary mb-4 transition-colors"
        >
          <Icon name="arrow-left" size={16} />
          {backLabel || 'Back'}
        </Link>
      )}
      <div className="flex items-start justify-between gap-6">
        <div>
          {/* Hairline brand accent — quiet identity mark that ties every page
              back to Rapsodo without ever dominating the surface. */}
          <span aria-hidden className="block h-[3px] w-10 rounded-pill rcl-brand-strip mb-3" />
          {eyebrow && (
            <div className="type-eyebrow mb-2">{eyebrow}</div>
          )}
          <h1 className="type-display-sm text-text-primary tracking-tight">{title}</h1>
        </div>
        <div className="flex flex-col items-end gap-3">
          <TopBar lastSync={lastSync} />
          {rightSlot}
        </div>
      </div>
    </header>
  );
}
