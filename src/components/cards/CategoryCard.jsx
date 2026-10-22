import { ChevronDown, Plus } from 'lucide-react';
import { useState } from 'react';
import { brl, pct, round } from '@/lib/finance';

// Agrupa buckets da mesma categoria (ex.: Tesouro Direto) e expande ao clicar.
export default function CategoryCard({ name, items, renderBucket, onAdd }) {
  const [open, setOpen] = useState(false);
  const totalBalance = round(items.reduce((s, i) => s + (i.bal.balance || 0), 0));
  const totalContributed = round(items.reduce((s, i) => s + (i.bal.contributed || 0), 0));
  const totalPercentage = round(items.reduce((s, i) => s + Number(i.b.percentage || 0), 0));
  const accent = items[0]?.b.color || '#64748B';
  return (
    <article className={`card group ${open ? 'md:col-span-2' : 'lift hover:border-[color:var(--c)]'}`} style={{ '--c': `${accent}99` }}>
      <button type="button" onClick={() => setOpen(v => !v)} className="flex w-full items-center gap-3 px-5 py-4 text-left">
        <span className="w-1.5 self-stretch rounded-full transition-all duration-200 group-hover:w-2" style={{ backgroundColor: accent }} />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold uppercase tracking-wider text-muted">{name}</p>
          <p className="mt-0.5 text-2xl font-bold">{brl(totalBalance)}</p>
          <p className="truncate text-xs text-muted">{items.map(i => `${i.b.icon} ${i.b.name}`).join(' · ')}</p>
          <p className="mt-1 text-xs text-faint">Aportado {brl(totalContributed)} · {pct(totalPercentage)} do aporte</p>
        </div>
        <ChevronDown size={20} className={`shrink-0 text-muted transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="space-y-3 border-t border-line px-4 pb-4 pt-3">
        <div className="grid gap-3 md:grid-cols-2">{items.map(renderBucket)}</div>
        <button type="button" onClick={onAdd} className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-line py-2.5 text-sm font-semibold text-muted transition hover:border-accent hover:text-accent"><Plus size={16} /> Adicionar bucket em {name}</button>
      </div>}
    </article>
  );
}
