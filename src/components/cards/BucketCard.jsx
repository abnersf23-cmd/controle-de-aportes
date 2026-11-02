import { ArrowRight, Check, ShieldCheck } from 'lucide-react';
import { brl, usd, pct, effectiveRate, daysSince } from '@/lib/finance';
import CountUp from '@/components/ui/CountUp';

// Card de um bucket na Carteira. Igual ao de FIIs e Ações: só mostra o resumo e, ao clicar,
// abre a página do bucket (#bucket/<id>), onde ficam aporte avulso, saque, taxa e edição.
// O aporte do mês é feito no Início, em "Quanto sobrou esse mês?" → "aportei".
export default function BucketCard({ bucket, balance, marked, onOpen }) {
  const isDollar = bucket.rate_type === 'fed';
  const staleDays = isDollar ? daysSince(bucket.dollar_rate_updated_date) : null;
  return (
    <button
      type="button"
      onClick={() => onOpen(bucket)}
      aria-label={`Abrir ${bucket.name}`}
      className="card lift group relative w-full p-5 text-left hover:border-[color:var(--c)]"
      style={{ '--c': `${bucket.color}99` }}
    >
      <div className="absolute inset-x-0 top-0 h-1 rounded-t-2xl transition-all duration-200 group-hover:h-1.5" style={{ backgroundColor: bucket.color }} />
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          <span className="lift-icon grid h-11 w-11 place-items-center rounded-xl text-2xl" style={{ backgroundColor: `${bucket.color}1f` }}>
            {bucket.icon}
          </span>
          <div>
            <h3 className="font-bold leading-tight">{bucket.name}</h3>
            <p className="text-xs text-muted">
              {pct(bucket.percentage)} do aporte · {pct(effectiveRate(bucket))} a.a.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap justify-end gap-1">
          {bucket.protected && (
            <span className="chip bg-good/10 text-good" title="Não é reduzido no rebalanceamento automático">
              <ShieldCheck size={13} /> Protegido
            </span>
          )}
          {staleDays != null && staleDays > 7 && <span className="chip bg-warn/10 text-warn">Cotação há {staleDays}d</span>}
        </div>
      </div>

      <div className="mt-4">
        <p className="text-2xl font-bold" style={{ color: bucket.color }}>
          {isDollar ? usd(balance.usdBalance) : <CountUp value={brl(balance.balance)} />}
        </p>
        <p className="text-xs text-muted">{isDollar ? `Saldo em dólar · ≈ ${brl(balance.balance)}` : 'Saldo calculado'}</p>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
        <div className="rounded-xl bg-surface2 p-2.5">
          <p className="text-xs text-muted">Total aportado</p>
          <p className="font-semibold">{brl(balance.contributed)}</p>
        </div>
        <div className="rounded-xl bg-surface2 p-2.5">
          <p className="text-xs text-muted">Rendimento</p>
          <p className="font-semibold text-good">{isDollar ? usd(balance.usdYield) : brl(balance.yield)}</p>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between text-xs">
        {marked ? (
          <span className="flex items-center gap-1 text-good">
            <Check size={13} /> Aporte do mês feito
          </span>
        ) : (
          <span className="text-faint">Aporte do mês pendente</span>
        )}
        <span className="flex items-center gap-1 font-semibold text-accent transition-all group-hover:gap-2">
          Ver detalhes <ArrowRight size={14} />
        </span>
      </div>
    </button>
  );
}
