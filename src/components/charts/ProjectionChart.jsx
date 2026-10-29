import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { brl } from '@/lib/finance';
import { tooltipProps } from './PieCard';

export default function ProjectionChart({ data, buckets, showReal = false }) {
  return (
    <section className="card p-5">
      <h3 className="font-bold">Crescimento projetado</h3>
      <div className="mt-4 h-80">
        <ResponsiveContainer>
          <LineChart data={data} margin={{ left: 10, right: 10 }}>
            <CartesianGrid stroke="rgb(var(--line))" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="month" tick={{ fill: 'rgb(var(--muted))', fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={v => brl(v).replace(',00', '')} tick={{ fill: 'rgb(var(--muted))', fontSize: 12 }} axisLine={false} tickLine={false} width={90} />
            <Tooltip {...tooltipProps} cursor={{ stroke: 'rgb(var(--faint))' }} formatter={v => brl(v)} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            {buckets.map(b => <Line key={b.id} type="monotone" dataKey={b.name} stroke={b.color} strokeWidth={1.8} dot={false} />)}
            <Line type="monotone" dataKey="Total" stroke="rgb(var(--ink))" strokeWidth={3} dot={false} />
            {showReal && <Line type="monotone" dataKey="Total em valor de hoje" stroke="rgb(var(--muted))" strokeWidth={2.5} strokeDasharray="6 4" dot={false} />}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
