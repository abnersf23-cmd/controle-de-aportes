import { Info } from 'lucide-react';

export function PageHeader({ title, subtitle, children }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="page-title">{title}</h1>
        {subtitle && <p className="page-subtitle">{subtitle}</p>}
      </div>
      {children && <div className="flex flex-wrap gap-2">{children}</div>}
    </div>
  );
}

export function Stat({ icon: Icon, label, value, hint, tone = 'ink', iconTone = 'text-accent' }) {
  const toneClass = { ink: 'text-ink', good: 'text-good', bad: 'text-bad', warn: 'text-warn', info: 'text-info' }[tone] || 'text-ink';
  return (
    <div className="card lift group flex items-center gap-3 p-4">
      {Icon && (
        <div className={`lift-icon grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-surface2 ${iconTone}`}>
          <Icon size={20} />
        </div>
      )}
      <div className="min-w-0">
        <p className="text-xs text-muted">{label}</p>
        <strong className={`block truncate text-lg ${toneClass}`}>{value}</strong>
        {hint && <p className="truncate text-xs text-faint">{hint}</p>}
      </div>
    </div>
  );
}

export function Notice({ tone = 'warn', children, icon: Icon = Info }) {
  const cls = {
    warn: 'border-warn/30 bg-warn/10 text-warn',
    info: 'border-info/30 bg-info/10 text-info',
    bad: 'border-bad/30 bg-bad/10 text-bad',
    good: 'border-good/30 bg-good/10 text-good'
  }[tone];
  return (
    <div className={`flex gap-3 rounded-2xl border p-4 text-sm ${cls}`}>
      <Icon size={18} className="mt-0.5 shrink-0" />
      <div>{children}</div>
    </div>
  );
}

export function Empty({ children }) {
  return <div className="card p-10 text-center text-sm text-muted">{children}</div>;
}

export function Segmented({ value, onChange, options }) {
  return (
    <div className="inline-flex rounded-xl border border-line bg-surface2 p-1">
      {options.map(o => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-semibold transition ${value === o.value ? 'bg-surface text-ink shadow-sm' : 'text-muted hover:text-ink'}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Field({ label, hint, children, className = '' }) {
  return (
    <label className={`label ${className}`}>
      {label}
      {children}
      {hint && <span className="mt-1 block font-normal text-faint">{hint}</span>}
    </label>
  );
}
