import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { brl, monthLabel } from '@/lib/finance';
import { tooltipProps } from './PieCard';

const short = m => { const [y, mo] = m.split('-'); return `${['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'][Number(mo) - 1]}/${y.slice(2)}`; };

export default function PatrimonyChart({ data }) {
  return (
    <section className="card p-5">
      <h3 className="font-bold">Evolução do patrimônio</h3>
      <p className="text-xs text-muted">Saldo total no fim de cada mês (ações pelo valor aportado).</p>
      {data.length < 2 ? <p className="py-10 text-center text-sm text-muted">O gráfico aparece a partir do segundo mês com lançamentos.</p> :
        <div className="mt-4 h-64">
          <ResponsiveContainer>
            <AreaChart data={data} margin={{ left: 10, right: 10 }}>
              <defs><linearGradient id="pat" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="rgb(var(--accent))" stopOpacity={0.35} /><stop offset="100%" stopColor="rgb(var(--accent))" stopOpacity={0} /></linearGradient></defs>
              <CartesianGrid stroke="rgb(var(--line))" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="month" tickFormatter={short} tick={{ fill: 'rgb(var(--muted))', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={v => `R$ ${(v / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mil`} tick={{ fill: 'rgb(var(--muted))', fontSize: 12 }} axisLine={false} tickLine={false} width={80} />
              <Tooltip {...tooltipProps} cursor={{ stroke: 'rgb(var(--faint))' }} formatter={v => [brl(v), 'Patrimônio']} labelFormatter={monthLabel} />
              <Area type="monotone" dataKey="balance" stroke="rgb(var(--accent))" strokeWidth={2.5} fill="url(#pat)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>}
    </section>
  );
}
