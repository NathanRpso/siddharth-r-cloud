import Icon from './Icon';

export default function TopBar({ lastSync }: { lastSync?: string }) {
  return (
    <div className="flex items-center justify-end">
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-pill bg-white border border-border-default text-sm text-text-secondary">
        <span className="text-success">
          <Icon name="shield-check" size={16} />
        </span>
        <span>Last Sync: {lastSync ?? 'April 15, 2026 at 10:35 PM'}</span>
      </div>
    </div>
  );
}
