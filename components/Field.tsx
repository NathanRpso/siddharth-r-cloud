/** Form field primitives styled to the Rapsodo Design System form spec:
 *  - 44px input height, 10px/14px padding, 8px radius
 *  - --border-default default, --rap-red focus + brand ring glow
 *  - Label above input via .type-label
 */
import clsx from 'clsx';

const INPUT_CLASSES =
  'block w-full h-11 px-3.5 py-2.5 rounded-md bg-white border border-border-default ' +
  'text-sm text-text-primary placeholder:text-text-tertiary ' +
  'focus:outline-none focus:border-rap-red focus:ring-4 focus:ring-rap-red/20 ' +
  'transition-colors';

export function FieldLabel({ htmlFor, children }: { htmlFor?: string; children: React.ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="block type-label text-text-secondary mb-1.5">
      {children}
    </label>
  );
}

export function TextField({
  id,
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  autoComplete,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: 'text' | 'email' | 'date';
  placeholder?: string;
  autoComplete?: string;
}) {
  return (
    <div>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className={INPUT_CLASSES}
      />
    </div>
  );
}

export function SelectField<T extends string>({
  id,
  label,
  value,
  onChange,
  options,
}: {
  id: string;
  label: string;
  value: T;
  onChange: (v: T) => void;
  options: readonly T[];
}) {
  return (
    <div>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className={clsx(INPUT_CLASSES, 'appearance-none pr-9 bg-no-repeat')}
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none'%3E%3Cpath d='M6 9l6 6 6-6' stroke='%235C616B' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E\")",
          backgroundPosition: 'right 12px center',
        }}
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </div>
  );
}
