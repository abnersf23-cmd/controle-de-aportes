import { Cell, Pie, PieChart, ResponsiveContainer, Sector, Tooltip } from 'recharts';

// Fatia "salta" um pouco ao passar o mouse.
const ActiveSlice = props => <Sector {...props} outerRadius={props.outerRadius + 6} />;
import { brl, pct, round } from '@/lib/finance';

// Balão dos gráficos: o Recharts pinta o texto de preto por padrão, ilegível no tema escuro.
// itemStyle/labelStyle forçam a cor do texto do tema (branco no escuro, escuro no claro).
export const tooltipStyle = { background: 'rgb(var(--surface2))', border: '1px solid rgb(var(--line))', borderRadius: 12, color: 'rgb(var(--ink))', fontSize: 12, boxShadow: '0 10px 25px rgba(0,0,0,.35)' };
export const tooltipProps = { contentStyle: tooltipStyle, itemStyle: { color: 'rgb(var(--ink))' }, labelStyle: { color: 'rgb(var(--muted))', fontWeight: 600 }, cursor: { fill: 'rgb(var(--line) / 0.3)' } };

// Rosca + legenda com valores e percentuais.
export default function PieCard({ title, subtitle, data, emptyLabel = 'Sem dados ainda.', format = brl }) {
  const items = data.filter(d => d.value > 0);
  const total = items.reduce((s, d) => s + d.value, 0);
  return (
    <section className="card p-5">
      <h3 className="font-bold">{title}</h3>
      {subtitle && <p className="text-xs text-muted">{subtitle}</p>}
      {!items.length ? <p className="py-10 text-center text-sm text-muted">{emptyLabel}</p> : <>
        <div className="relative h-48">
          <ResponsiveContainer>
            <PieChart>
              <Pie data={items} dataKey="value" nameKey="name" innerRadius="62%" outerRadius="90%" paddingAngle={2} stroke="none" activeShape={ActiveSlice}>
                {items.map(d => <Cell key={d.id || d.name} fill={d.color} />)}
              </Pie>
              <Tooltip {...tooltipProps} formatter={v => format(v)} />
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 grid place-items-center text-center"><div><p className="text-xs text-muted">Total</p><strong className="text-sm">{format(total)}</strong></div></div>
        </div>
        <ul className="mt-2 space-y-1.5">
          {[...items].sort((a, b) => b.value - a.value).map(d => (
            <li key={d.id || d.name} className="flex items-center gap-2 text-sm">
              <i className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: d.color }} />
              <span className="flex-1 truncate text-muted">{d.name}</span>
              <span className="font-semibold">{format(d.value)}</span>
              <span className="w-12 text-right text-xs text-faint">{pct(round(d.value / total * 100))}</span>
            </li>
          ))}
        </ul>
      </>}
    </section>
  );
}
