import { useState } from 'react';
import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts';
import { brl, pct, round } from '@/lib/finance';

// "Do que é feita a carteira": rosca (donut) com o total no meio + a lista ordenada pelo valor.
// Fatias separadas por um respiro e com cantos arredondados; passar o mouse numa fatia (ou na
// linha da lista) apaga as outras e mostra o valor dela no meio da rosca.
// `plan` (opcional) = { id: % planejado } mostra o percentual do plano de aporte ao lado de cada linha.
export default function CompositionCard({ title, subtitle, data, plan, emptyLabel = 'Sem dados ainda.', format = brl, children }) {
  const [hover, setHover] = useState(null);
  const items = data.filter(d => d.value > 0).sort((a, b) => b.value - a.value);
  const total = items.reduce((s, d) => s + d.value, 0);
  const share = d => (total > 0 ? (d.value / total) * 100 : 0);
  const keyOf = d => d.id || d.name;
  const active = items.find(d => keyOf(d) === hover);
  const dim = d => (hover && keyOf(d) !== hover ? 'opacity-40' : '');

  return (
    <section className="card p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="font-bold">{title}</h3>
          {subtitle && <p className="text-xs text-muted">{subtitle}</p>}
        </div>
        {children}
      </div>
      {!items.length ? (
        <p className="py-10 text-center text-sm text-muted">{emptyLabel}</p>
      ) : (
        <div className="mt-4 grid items-center gap-5 sm:grid-cols-[200px_1fr]">
          <div className="relative mx-auto h-[200px] w-[200px]" onMouseLeave={() => setHover(null)}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={items}
                  dataKey="value"
                  nameKey="name"
                  innerRadius="68%"
                  outerRadius="100%"
                  paddingAngle={items.length > 1 ? 2 : 0}
                  cornerRadius={6}
                  stroke="none"
                  startAngle={90}
                  endAngle={-270}
                  isAnimationActive={false}
                  onMouseEnter={d => setHover(keyOf(d))}
                >
                  {items.map(d => (
                    <Cell key={keyOf(d)} fill={d.color} fillOpacity={hover && keyOf(d) !== hover ? 0.3 : 1} className="cursor-pointer outline-none" />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            {/* Meio da rosca: o total, ou a fatia que está sob o mouse. */}
            <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
              <div className="max-w-[120px]">
                <p className="truncate text-xs text-muted">{active ? active.name : 'Total'}</p>
                <p className="text-base font-bold leading-tight">{format(active ? active.value : total)}</p>
                {active && <p className="text-xs text-muted">{pct(round(share(active)))}</p>}
              </div>
            </div>
          </div>
          <ul className="space-y-1">
            {items.map(d => {
              const key = keyOf(d),
                goal = plan ? Number(plan[d.id]) || 0 : null;
              return (
                <li
                  key={key}
                  onMouseEnter={() => setHover(key)}
                  onMouseLeave={() => setHover(null)}
                  className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition ${hover === key ? 'bg-surface2' : ''} ${dim(d)}`}
                >
                  <i className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: d.color }} />
                  <span className="min-w-0 flex-1 truncate text-muted">{d.name}</span>
                  <span className="font-semibold">{format(d.value)}</span>
                  <span className="w-12 text-right text-xs text-muted">{pct(round(share(d)))}</span>
                  {goal != null && (
                    <span className="hidden w-16 text-right text-xs text-faint sm:inline" title="Quanto deste bucket está no seu plano de aporte">
                      plano {pct(goal)}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
}
