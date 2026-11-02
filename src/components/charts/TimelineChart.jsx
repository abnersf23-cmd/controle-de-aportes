import { Area, CartesianGrid, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { brl, monthLabel } from '@/lib/finance';
import { activeDot, axisProps, compactBrl, gridProps, tooltipStyle } from './theme';

const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
export const shortMonth = m => {
  const [y, mo] = m.split('-');
  return `${MONTHS[Number(mo) - 1]}/${y.slice(2)}`;
};
export const TYPE_LABEL = { mensal: 'Aporte mensal', avulso: 'Aporte avulso', compra: 'Compra', venda: 'Venda', saque: 'Saque/gasto' };

const SERIES = [
  { key: 'balance', label: 'Patrimônio', color: 'rgb(var(--accent))' },
  { key: 'invested', label: 'Saiu do seu bolso', color: 'rgb(var(--faint))' },
  { key: 'in', label: 'Aporte', color: 'rgb(var(--good))', dot: true },
  { key: 'out', label: 'Saque ou venda', color: 'rgb(var(--bad))', dot: true }
];
const sumIn = evs => evs.filter(e => e.amount > 0).reduce((s, e) => s + e.amount, 0);
const sumOut = evs => evs.filter(e => e.amount < 0).reduce((s, e) => s + e.amount, 0);

// Balão do mouse: os números do mês e, embaixo, cada aporte que aconteceu nele.
function TimelineTooltip({ active, payload }) {
  const p = active && payload?.[0]?.payload;
  if (!p) return null;
  return (
    <div style={tooltipStyle} className="max-w-72 p-3">
      <p className="font-semibold text-muted">{monthLabel(p.month)}</p>
      <p className="mt-1">
        Patrimônio: <strong>{brl(p.balance)}</strong>
      </p>
      <p>Saiu do seu bolso: {brl(p.invested)}</p>
      <p className={p.gain >= 0 ? 'text-good' : 'text-bad'}>Rendeu sozinho: {brl(p.gain)}</p>
      {p.in > 0 && <p className="text-good">Aportado no mês: {brl(p.in)}</p>}
      {p.out < 0 && <p className="text-bad">Saques/vendas no mês: {brl(-p.out)}</p>}
      {p.events.length > 0 && (
        <ul className="mt-2 space-y-0.5 border-t border-line pt-2 text-xs">
          {p.events.slice(0, 6).map((e, i) => (
            <li key={i} className="flex justify-between gap-3">
              <span className="truncate">
                {e.name} · {TYPE_LABEL[e.type]}
              </span>
              <span className={e.amount >= 0 ? 'text-good' : 'text-bad'}>{brl(e.amount)}</span>
            </li>
          ))}
          {p.events.length > 6 && <li className="text-muted">+ {p.events.length - 6} lançamentos</li>}
        </ul>
      )}
      {p.source === 'calculado' && <p className="mt-2 text-[11px] text-faint">Valor recalculado (sem foto do mês).</p>}
    </div>
  );
}

// Marcas da linha do tempo, em cima da curva: ponto verde = mês com aporte; ponto vermelho = saque ou venda.
// Mês com os dois: ponto verde com anel vermelho. Um halo suave em volta deixa o ponto visível nos dois temas.
const EventDot = ({ cx, cy, payload }) => {
  if (cx == null || cy == null || !payload || (!(payload.in > 0) && !(payload.out < 0))) return null;
  const color = payload.in > 0 ? 'rgb(var(--good))' : 'rgb(var(--bad))';
  return (
    <g>
      <circle cx={cx} cy={cy} r={9} fill={color} fillOpacity={0.15} />
      {payload.in > 0 && payload.out < 0 && <circle cx={cx} cy={cy} r={6.5} fill="none" stroke="rgb(var(--bad))" strokeWidth={2} />}
      <circle cx={cx} cy={cy} r={4} fill={color} stroke="rgb(var(--surface))" strokeWidth={1.5} />
    </g>
  );
};

// Linha do tempo: curva suave = quanto você tinha; linha tracejada = quanto saiu do bolso;
// pontos na curva = os meses com aporte (verde) e com saque/venda (vermelho).
// A distância entre a área e a linha cinza é o que o dinheiro rendeu sozinho.
// `milestones` são linhas horizontais dos marcos (R$ 10 mil, 100 mil...).
export default function TimelineChart({ points, milestones = [] }) {
  // in = soma dos aportes do mês; out = soma dos saques e vendas (negativa). Servem para os pontos e o balão.
  const rows = points.map(p => ({ ...p, in: sumIn(p.events), out: sumOut(p.events) }));
  return (
    <>
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
        {SERIES.map(s => (
          <li key={s.key} className="flex items-center gap-1.5">
            {s.dot ? (
              <i className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />
            ) : (
              <i className="h-1 w-4 rounded" style={{ background: s.color }} />
            )}
            {s.label}
          </li>
        ))}
      </ul>
      <div className="mt-2 h-80" data-testid="timeline-chart">
        <ResponsiveContainer>
          <ComposedChart data={rows} margin={{ left: 0, right: 8, top: 12 }}>
            <defs>
              <linearGradient id="timeline" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="rgb(var(--accent))" stopOpacity={0.35} />
                <stop offset="70%" stopColor="rgb(var(--accent))" stopOpacity={0.06} />
                <stop offset="100%" stopColor="rgb(var(--accent))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid {...gridProps} />
            <XAxis dataKey="month" tickFormatter={shortMonth} {...axisProps} minTickGap={16} />
            <YAxis tickFormatter={compactBrl} {...axisProps} width={96} />
            <Tooltip content={<TimelineTooltip />} cursor={{ stroke: 'rgb(var(--faint))', strokeWidth: 1 }} />
            <Line type="monotone" dataKey="invested" stroke="rgb(var(--faint))" strokeWidth={2} strokeDasharray="6 5" dot={false} activeDot={false} />
            <Area
              type="monotone"
              dataKey="balance"
              stroke="rgb(var(--accent))"
              strokeWidth={3}
              strokeLinecap="round"
              fill="url(#timeline)"
              dot={<EventDot />}
              activeDot={activeDot('rgb(var(--accent))')}
              animationDuration={900}
            />
            {milestones.map(m => (
              <ReferenceLine
                key={m.target}
                y={m.target}
                ifOverflow="extendDomain"
                stroke={m.month ? 'rgb(var(--good))' : 'rgb(var(--warn))'}
                strokeDasharray="3 3"
                label={{ value: `${m.month ? '✓ ' : 'Meta '}${compactBrl(m.target)}`, position: 'insideTopLeft', fill: 'rgb(var(--muted))', fontSize: 11 }}
              />
            ))}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </>
  );
}
