import { Check, DollarSign, MoreHorizontal, Pencil, Plus, RefreshCw, ShieldCheck, TrendingDown, Undo2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { brl, usd, pct, dateLabel, effectiveRate, daysSince } from '@/lib/finance';

function Menu({ items }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const close = e => !ref.current?.contains(e.target) && setOpen(false);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);
  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(v => !v)} className="btn-ghost p-1.5" aria-label="Mais ações"><MoreHorizontal size={18} /></button>
      {open && <div className="card absolute right-0 z-20 mt-1 w-52 overflow-hidden p-1 shadow-xl">
        {items.map(i => <button key={i.label} onClick={() => { setOpen(false); i.onClick(); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-surface2"><i.icon size={16} className="text-muted" />{i.label}</button>)}
      </div>}
    </div>
  );
}

// Card de um bucket. Buckets de dólar (taxa Fed) mostram saldo em US$ e variação cambial.
export default function BucketCard({ bucket, balance, total, marked, onAction }) {
  const isDollar = bucket.rate_type === 'fed';
  const staleDays = isDollar ? daysSince(bucket.dollar_rate_updated_date) : null;
  const predicted = total > 0 ? total * bucket.percentage / 100 : 0;
  const act = kind => () => onAction(kind, bucket);
  const menu = [
    { icon: Plus, label: 'Aporte avulso', onClick: act('extra') },
    { icon: TrendingDown, label: 'Registrar saque/gasto', onClick: act('withdraw') },
    { icon: RefreshCw, label: 'Atualizar taxa', onClick: act('rate') },
    ...(isDollar ? [{ icon: DollarSign, label: 'Atualizar cotação', onClick: act('dollar') }] : []),
    { icon: Pencil, label: 'Editar bucket', onClick: act('edit') },
    ...(marked ? [{ icon: Undo2, label: 'Desmarcar aporte do mês', onClick: act('unmark') }] : [])
  ];
  return (
    <article className="card lift group relative p-5 hover:border-[color:var(--c)]" style={{ '--c': `${bucket.color}99` }}>
      <div className="absolute inset-x-0 top-0 h-1 rounded-t-2xl transition-all duration-200 group-hover:h-1.5" style={{ backgroundColor: bucket.color }} />
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          <span className="lift-icon grid h-11 w-11 place-items-center rounded-xl text-2xl" style={{ backgroundColor: `${bucket.color}1f` }}>{bucket.icon}</span>
          <div>
            <h3 className="font-bold leading-tight">{bucket.name}</h3>
            <p className="text-xs text-muted">{pct(bucket.percentage)} do aporte · {pct(effectiveRate(bucket))} a.a.</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {bucket.protected && <span className="chip bg-good/10 text-good" title="Não é reduzido no rebalanceamento automático"><ShieldCheck size={13} /> Protegido</span>}
          {staleDays != null && staleDays > 7 && <span className="chip bg-warn/10 text-warn">Cotação há {staleDays}d</span>}
          <Menu items={menu} />
        </div>
      </div>

      <div className="mt-4">
        <p className="text-2xl font-bold" style={{ color: bucket.color }}>{isDollar ? usd(balance.usdBalance) : brl(balance.balance)}</p>
        <p className="text-xs text-muted">{isDollar ? `Saldo em dólar · ≈ ${brl(balance.balance)}` : 'Saldo calculado'}</p>
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
        <div className="rounded-xl bg-surface2 p-2.5"><dt className="text-xs text-muted">Total aportado</dt><dd className="font-semibold">{brl(balance.contributed)}</dd></div>
        <div className="rounded-xl bg-surface2 p-2.5"><dt className="text-xs text-muted">Rendimento</dt><dd className="font-semibold text-good">{isDollar ? usd(balance.usdYield) : brl(balance.yield)}</dd></div>
        {isDollar && <div className="col-span-2 flex items-center justify-between rounded-xl bg-surface2 p-2.5"><dt className="text-xs text-muted">Variação cambial</dt><dd className={`font-semibold ${(balance.exchange || 0) >= 0 ? 'text-good' : 'text-bad'}`}>{brl(balance.exchange)} <span className="text-xs font-normal text-muted">({usd(balance.usdExchange)})</span></dd></div>}
      </dl>

      <div className="mt-3 space-y-0.5 text-xs text-faint">
        <p>Taxa atualizada em {dateLabel(bucket.rate_updated_date)}</p>
        {isDollar && <p>Cotação R$ {Number(bucket.current_dollar_rate || 0).toFixed(2)} · atualizada em {dateLabel(bucket.dollar_rate_updated_date)}</p>}
      </div>

      <button disabled={marked || !total} onClick={act('mark')} className="btn mt-4 w-full text-white disabled:bg-surface2 disabled:text-faint disabled:opacity-100" style={!marked && total ? { backgroundColor: bucket.color } : undefined}>
        {marked ? <><Check size={16} /> Aporte do mês registrado</> : total ? `Marcar aporte de ${brl(predicted)}` : 'Informe quanto sobrou para marcar'}
      </button>
    </article>
  );
}
