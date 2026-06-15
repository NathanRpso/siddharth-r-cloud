import clsx from 'clsx';

export default function Card({
  children,
  className,
  padding = 'lg',
}: {
  children: React.ReactNode;
  className?: string;
  padding?: 'sm' | 'md' | 'lg';
}) {
  const pad = padding === 'sm' ? 'p-4' : padding === 'md' ? 'p-5' : 'p-6';
  return (
    <div
      className={clsx(
        'bg-white rounded-2xl shadow-sm border border-border-subtle',
        pad,
        className,
      )}
    >
      {children}
    </div>
  );
}
