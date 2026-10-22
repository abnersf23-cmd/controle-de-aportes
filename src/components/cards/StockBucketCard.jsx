import { ArrowRight } from 'lucide-react';
import { brl, pct, round, stockNetAmount, stockMarketValue } from '@/lib/finance';

export default function StockBucketCard({ bucket, stocks = [], quotes = {}, onOpen }) {
  const invested = round(stocks.reduce((s, st) => s + stockNetAmount(st), 0));
  const market = round(stocks.reduce((s, st) => s + (stockMarketValue(st, quotes[st.ticker]) ?? stockNetAmount(st)), 0));
  const profit = round(market - invested);
  return (
    <button onClick={onOpen} className="card lift group p-5 text-left hover:border-[color:var(--c)]" style={{ '--c': `${bucket.color}99` }}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          <span className="lift-icon grid h-11 w-11 place-items-center rounded-xl text-2xl" style={{ backgroundColor: `${bucket.color}1f` }}>{bucket.icon}</span>
          <div><h3 className="font-bold">{bucket.name}</h3><p className="text-xs text-muted">{stocks.filter(s => (s.contributions || []).length).length} ativos com posição</p></div>
        </div>
        <span className="chip" style={{ backgroundColor: `${bucket.color}22`, color: bucket.color }}>{pct(bucket.percentage)}</span>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div><p className="text-xs text-muted">Valor de mercado</p><strong className="text-xl">{brl(market)}</strong></div>
        <div><p className="text-xs text-muted">Aportado</p><strong className="text-xl">{brl(invested)}</strong></div>
      </div>
      <div className="mt-4 flex items-center justify-between text-xs">
        <span className={profit >= 0 ? 'text-good' : 'text-bad'}>{profit >= 0 ? '+' : ''}{brl(profit)} de resultado</span>
        <span className="flex items-center gap-1 font-semibold text-accent transition-all group-hover:gap-2">Ver ativos <ArrowRight size={14} /></span>
      </div>
    </button>
  );
}
