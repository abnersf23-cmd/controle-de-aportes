import { Area, ComposedChart, CartesianGrid, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { brl } from '@/lib/finance';
import { activeDot, axisProps, compactBrl, gridProps, tooltipProps } from './theme';

// Três linhas só, para ficar claro: quanto você vai ter, quanto isso vale em dinheiro de hoje
// e quanto saiu do seu bolso. A distância entre a primeira e a última é o que os juros fizeram.
// (Antes eram uma linha por bucket + total; o detalhe por bucket continua na tabela abaixo.)
const SERIES = [
  { key: 'Total', label: 'Você vai ter', color: 'rgb(var(--accent))' },
  { key: 'Total em valor de hoje', label: 'Em dinheiro de hoje', color: 'rgb(var(--info))', dash: '6 4' },
  { key: 'Você aportou', label: 'Saiu do seu bolso', color: 'rgb(var(--faint))' }
];
const tick = n => (n % 12 === 0 ? `${n / 12} ${n === 12 ? 'ano' : 'anos'}` : `mês ${n}`);

export default function ProjectionChart({ data, showReal = false }) {
  const rows = data.map((r, i) => ({ ...r, n: i + 1 }));
  const series = SERIES.filter(s => s.key !== 'Total em valor de hoje' || showReal);
  const last = rows[rows.length - 1] || {};
  return (
    <section className="card p-5">
      <h3 className="font-bold">Crescimento projetado</h3>
      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
        {series.map(s => (
          <li key={s.key} className="flex items-center gap-1.5 text-muted">
            <i className="h-0.5 w-4 rounded" style={{ background: s.color }} />
            {s.label}: <strong className="text-ink">{brl(last[s.key])}</strong>
          </li>
        ))}
      </ul>
      <div className="mt-3 h-72">
        <ResponsiveContainer>
          <ComposedChart data={rows} margin={{ left: 0, right: 8, top: 8 }}>
            <defs>
              <linearGradient id="proj" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="rgb(var(--accent))" stopOpacity={0.18} />
                <stop offset="100%" stopColor="rgb(var(--accent))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid {...gridProps} />
            <XAxis dataKey="n" tickFormatter={tick} {...axisProps} interval={rows.length > 24 ? 11 : rows.length > 12 ? 5 : 2} />
            <YAxis tickFormatter={compactBrl} {...axisProps} width={84} />
            <Tooltip {...tooltipProps} labelFormatter={n => tick(n)} formatter={(v, name) => [brl(v), SERIES.find(s => s.key === name)?.label || name]} />
            <Area type="monotone" dataKey="Total" stroke="rgb(var(--accent))" strokeWidth={2} fill="url(#proj)" activeDot={activeDot('rgb(var(--accent))')} />
            {showReal && (
              <Line
                type="monotone"
                dataKey="Total em valor de hoje"
                stroke="rgb(var(--info))"
                strokeWidth={2}
                strokeDasharray="6 4"
                dot={false}
                activeDot={activeDot('rgb(var(--info))')}
              />
            )}
            <Line type="monotone" dataKey="Você aportou" stroke="rgb(var(--faint))" strokeWidth={2} dot={false} activeDot={activeDot('rgb(var(--faint))')} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
