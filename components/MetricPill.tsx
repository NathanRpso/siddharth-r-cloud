export default function MetricPill({
  icon,
  label,
  value,
}: {
  icon?: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-pill bg-white border border-border-default">
      {icon && <span className="text-text-tertiary">{icon}</span>}
      <span className="text-xs text-text-secondary uppercase tracking-caps font-semibold">
        {label}
      </span>
      <span className="text-sm text-text-primary font-semibold">{value}</span>
    </div>
  );
}
