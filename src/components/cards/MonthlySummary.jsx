import { CalendarDays } from 'lucide-react';
import { brl, monthKey, monthLabel, totalBalance, round, stockMonthTotal, withdrawalBrl } from '@/lib/finance';

export default function MonthlySummary({ buckets, records, extras, withdrawals, stocks = [] }) {
  const mk = monthKey();
  const aportes = [
    ...records.filter(r => r.month === mk).flatMap(r => (r.allocations || []).map(a => Number(a.amount) || 0)),
    ...extras.filter(e => (e.date || '').slice(0, 7) === mk).map(e => Number(e.amount) || 0)
  ].reduce((s, v) => s + v, 0) + stockMonthTotal(stocks, mk);
  const retirado = withdrawals.filter(w => (w.date || '').slice(0, 7) === mk).reduce((s, w) => s + withdrawalBrl(w), 0);
  const now = new Date();
  const current = totalBalance(buckets, records, extras, withdrawals, now, stocks);
  const prev = totalBalance(buckets, records, extras, withdrawals, new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59), stocks);
  const variation = prev > 0 ? round(((current - prev) / prev) * 100) : null;
  return (
    <section className="card p-5">
      <div className="mb-4 flex items-center gap-2"><CalendarDays size={18} className="text-accent" /><h2 className="font-bold">Resumo de {monthLabel(mk)}</h2></div>
      <div className="grid grid-cols-3 gap-3">
        <div><p className="text-xs text-muted">Aportado</p><strong className="text-good">{brl(aportes)}</strong></div>
        <div><p className="text-xs text-muted">Retirado</p><strong className="text-bad">{brl(retirado)}</strong></div>
        <div><p className="text-xs text-muted">Variação</p>{variation != null ? <strong className={variation >= 0 ? 'text-good' : 'text-bad'}>{variation >= 0 ? '+' : ''}{variation.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%</strong> : <strong className="text-faint">—</strong>}</div>
      </div>
      <div className="mt-4 flex justify-between rounded-xl bg-surface2 p-3 text-sm"><span className="text-muted">Saldo líquido do mês</span><strong className={aportes - retirado >= 0 ? 'text-good' : 'text-bad'}>{brl(aportes - retirado)}</strong></div>
    </section>
  );
}
