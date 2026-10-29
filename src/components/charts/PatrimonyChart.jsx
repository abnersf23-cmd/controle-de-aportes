import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { brl, monthLabel, pct, round } from '@/lib/finance';
import { activeDot, axisProps, compactBrl, gridProps, tooltipProps } from './theme';

const short = m => {
  const [y, mo] = m.split('-');
  return `${['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'][Number(mo) - 1]}/${y.slice(2)}`;
};

// Linha única do patrimônio mês a mês, com o número de hoje e a variação em destaque.
export default function PatrimonyChart({ data }) {
  const first = data[0]?.balance || 0,
    last = data[data.length - 1]?.balance || 0;
  const change = round(last - first),
    changePct = first > 0 ? round((change / first) * 100) : null;
  return (
    <section className="card p-5">
      <h3 className="font-bold">Evolução do patrimônio</h3>
      <p className="text-xs text-muted">Saldo no fim de cada mês (ações pelo valor aportado).</p>
      {data.length < 2 ? (
        <p className="py-10 text-center text-sm text-muted">O gráfico aparece a partir do segundo mês com lançamentos.</p>
      ) : (
        <>
          <p className="mt-3 flex flex-wrap items-baseline gap-x-2">
            <span className="text-2xl font-bold">{brl(last)}</span>
            <span className={`text-sm font-semibold ${change >= 0 ? 'text-good' : 'text-bad'}`}>
              {change >= 0 ? '+' : ''}
              {brl(change)}
              {changePct != null && ` (${pct(changePct)})`}
            </span>
            <span className="text-xs text-muted">desde {monthLabel(data[0].month)}</span>
          </p>
          <div className="mt-2 h-60">
            <ResponsiveContainer>
              <AreaChart data={data} margin={{ left: 0, right: 8, top: 8 }}>
                <defs>
                  <linearGradient id="pat" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="rgb(var(--accent))" stopOpacity={0.22} />
                    <stop offset="100%" stopColor="rgb(var(--accent))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid {...gridProps} />
                <XAxis dataKey="month" tickFormatter={short} {...axisProps} minTickGap={16} />
                <YAxis tickFormatter={compactBrl} {...axisProps} width={96} />
                <Tooltip {...tooltipProps} formatter={v => [brl(v), 'Patrimônio']} labelFormatter={monthLabel} />
                <Area
                  type="monotone"
                  dataKey="balance"
                  stroke="rgb(var(--accent))"
                  strokeWidth={2}
                  fill="url(#pat)"
                  activeDot={activeDot('rgb(var(--accent))')}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </section>
  );
}
