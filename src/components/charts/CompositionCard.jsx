import { useState } from 'react';
import { brl, pct, round } from '@/lib/finance';

// "Do que é feita a carteira": uma barra empilhada (100%) + a lista ordenada pelo valor.
// Trocou a rosca (donut): numa barra fica mais fácil comparar fatias parecidas.
// Passar o mouse numa fatia destaca a linha da lista, e vice-versa.
// `plan` (opcional) = { id: % planejado } desenha uma segunda barra fina para comparar com o plano.
export default function CompositionCard({ title, subtitle, data, plan, emptyLabel = 'Sem dados ainda.', format = brl, children }) {
  const [hover, setHover] = useState(null);
  const items = data.filter(d => d.value > 0).sort((a, b) => b.value - a.value);
  const total = items.reduce((s, d) => s + d.value, 0);
  const share = d => (total > 0 ? d.value / total * 100 : 0);
  const active = items.find(d => (d.id || d.name) === hover);
  const dim = d => (hover && (d.id || d.name) !== hover ? 'opacity-40' : '');
  const planned = plan ? items.map(d => ({ ...d, pct: Number(plan[d.id]) || 0 })).filter(d => d.pct > 0) : null;

  return (
    <section className="card p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div><h3 className="font-bold">{title}</h3>{subtitle && <p className="text-xs text-muted">{subtitle}</p>}</div>
        {children}
      </div>
      {!items.length ? <p className="py-10 text-center text-sm text-muted">{emptyLabel}</p> : <>
        <p className="mt-3 text-2xl font-bold">{format(total)}</p>
        <p className="h-5 text-xs text-muted">{active ? <><strong className="text-ink">{active.name}</strong>: {format(active.value)} · {pct(round(share(active)))}</> : 'Passe o mouse numa fatia para ver o valor.'}</p>
        <div className="mt-1 flex h-3 gap-[2px]" onMouseLeave={() => setHover(null)}>
          {items.map(d => <div key={d.id || d.name} onMouseEnter={() => setHover(d.id || d.name)} className={`h-full rounded-[4px] transition-opacity first:rounded-l-full last:rounded-r-full ${dim(d)}`} style={{ width: `${share(d)}%`, minWidth: 3, backgroundColor: d.color }} />)}
        </div>
        {planned?.length > 0 && <>
          <p className="mt-3 text-xs text-muted">Plano de aporte</p>
          <div className="mt-1 flex h-1.5 gap-[2px] opacity-70">
            {planned.map(d => <div key={d.id} className="h-full rounded-full" title={`${d.name}: ${pct(d.pct)} do aporte`} style={{ width: `${d.pct}%`, backgroundColor: d.color }} />)}
          </div>
        </>}
        <ul className="mt-4 space-y-1">
          {items.map(d => {
            const key = d.id || d.name, p = round(share(d)), goal = plan ? Number(plan[d.id]) || 0 : null;
            return (
              <li key={key} onMouseEnter={() => setHover(key)} onMouseLeave={() => setHover(null)} className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition ${hover === key ? 'bg-surface2' : ''} ${dim(d)}`}>
                <i className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: d.color }} />
                <span className="min-w-0 flex-1 truncate text-muted">{d.name}</span>
                <span className="font-semibold">{format(d.value)}</span>
                <span className="w-14 text-right text-xs text-muted">{pct(p)}</span>
                {goal != null && <span className="hidden w-20 text-right text-xs text-faint sm:inline" title="Percentual do plano de aporte">plano {pct(goal)}</span>}
              </li>
            );
          })}
        </ul>
      </>}
    </section>
  );
}
