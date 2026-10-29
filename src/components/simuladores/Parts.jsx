import { ChevronDown } from 'lucide-react';

// Peças comuns dos simuladores, para todos terem o mesmo jeito:
// poucos campos em cima, os detalhes escondidos em "Ajustar detalhes" e a resposta em uma frase.

// A resposta principal, em destaque. tone: good (vale a pena), info (neutro), warn (cuidado), bad (não vale).
export function Answer({ tone = 'info', title, children }) {
  const cls = { good: 'bg-good/10 text-good', info: 'bg-info/10 text-info', warn: 'bg-warn/10 text-warn', bad: 'bg-bad/10 text-bad' }[tone];
  return (
    <div className={`rounded-2xl p-4 ${cls}`}>
      {title && <p className="text-lg font-bold leading-snug">{title}</p>}
      {children && <p className="mt-1 text-sm">{children}</p>}
    </div>
  );
}

// Campos opcionais: fechados por padrão, já vêm com um valor que serve para a maioria das pessoas.
export function More({ label = 'Ajustar detalhes (opcional)', children }) {
  return (
    <details className="group rounded-xl border border-line">
      <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-semibold text-muted hover:text-ink">
        {label}
        <ChevronDown size={16} className="transition group-open:rotate-180" />
      </summary>
      <div className="grid gap-3 border-t border-line p-4 sm:grid-cols-2">{children}</div>
    </details>
  );
}

// Um número com legenda curta embaixo.
export function Figure({ label, value, hint, className = '' }) {
  return (
    <div className={`rounded-xl bg-surface2 p-3 ${className}`}>
      <p className="text-xs text-muted">{label}</p>
      <p className="text-xl font-bold">{value}</p>
      {hint && <p className="text-xs text-faint">{hint}</p>}
    </div>
  );
}

// Botões de escolha rápida (ex.: 12, 24, 48 meses), com o campo livre ao lado para outro valor.
export function Chips({ value, options, onChange, format = v => v }) {
  return (
    <div className="mt-1.5 flex flex-wrap gap-1.5">
      {options.map(o => (
        <button
          key={o}
          type="button"
          onClick={() => onChange(String(o))}
          className={`rounded-lg border px-2.5 py-1 text-xs font-semibold transition ${String(value) === String(o) ? 'border-accent bg-accent/10 text-accent' : 'border-line text-muted hover:text-ink'}`}
        >
          {format(o)}
        </button>
      ))}
    </div>
  );
}
