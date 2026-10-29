import { useEffect, useMemo, useRef, useState } from 'react';
import { CornerDownLeft, Search } from 'lucide-react';
import { searchItems } from '@/lib/search';

// Busca rápida (Ctrl+K ou ⌘K): digite parte do nome de uma aba, conta, ativo ou simulador
// e aperte Enter. Setas ↑ ↓ escolhem; Esc fecha.
export default function CommandPalette({ open, onClose, items }) {
  const [query, setQuery] = useState('');
  const [index, setIndex] = useState(0);
  const input = useRef(null);
  const results = useMemo(() => searchItems(items, query, 9), [items, query]);
  useEffect(() => {
    if (open) {
      setQuery('');
      setIndex(0);
      setTimeout(() => input.current?.focus(), 0);
    }
  }, [open]);
  useEffect(() => setIndex(0), [query]);
  if (!open) return null;

  const choose = item => {
    onClose();
    item?.run();
  };
  const onKey = e => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setIndex(i => Math.min(results.length - 1, i + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setIndex(i => Math.max(0, i - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      choose(results[index]);
    } else if (e.key === 'Escape') onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-4 pt-[12vh] backdrop-blur-sm"
      onMouseDown={e => e.target === e.currentTarget && onClose()}
    >
      <div role="dialog" aria-modal="true" aria-label="Busca rápida" className="card w-full max-w-lg overflow-hidden shadow-2xl">
        <div className="flex items-center gap-3 border-b border-line px-4">
          <Search size={18} className="shrink-0 text-muted" />
          <input
            ref={input}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={onKey}
            placeholder="Buscar aba, conta, ativo ou simulador…"
            className="w-full bg-transparent py-4 text-sm outline-none placeholder:text-faint"
            aria-label="Buscar"
          />
          <kbd className="rounded border border-line px-1.5 py-0.5 text-[10px] text-muted">Esc</kbd>
        </div>
        <ul className="max-h-80 overflow-y-auto p-2" role="listbox">
          {!results.length && <li className="p-4 text-center text-sm text-muted">Nada encontrado para "{query}".</li>}
          {results.map((r, i) => (
            <li key={`${r.group}-${r.label}-${r.hint || ''}`} role="option" aria-selected={i === index}>
              <button
                onMouseEnter={() => setIndex(i)}
                onClick={() => choose(r)}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm ${i === index ? 'bg-accent/10 text-accent' : 'text-ink'}`}
              >
                {r.icon ? <r.icon size={16} className="shrink-0" /> : <span className="w-4 shrink-0 text-center">{r.emoji}</span>}
                <span className="min-w-0 flex-1 truncate">
                  {r.label}
                  {r.hint && <span className="ml-2 text-xs text-muted">{r.hint}</span>}
                </span>
                <span className="shrink-0 text-[10px] uppercase tracking-wider text-faint">{r.group}</span>
                {i === index && <CornerDownLeft size={14} className="shrink-0" />}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
