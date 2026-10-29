import { brl } from '@/lib/finance';

// Um card só com o resumo do mês (antes eram três: total de contas, falta pagar e o que sobra).
// Colunas = dia 15 e dia 30; a última linha é o que sobra no fim do mês.
export default function SheetSummary({ t }) {
  const done = (open, bills) => (bills > 0 && !open ? <span className="text-good">pago ✓</span> : brl(open));
  const neg = v => (v < 0 ? 'text-bad' : '');
  return (
    <section className="card space-y-3 p-5">
      <div className="flex items-baseline justify-between">
        <p className="text-xs font-bold uppercase tracking-wider text-muted">Resumo do mês</p>
        {t.committed != null && <span className={`text-xs font-semibold ${t.committed > 100 ? 'text-bad' : 'text-muted'}`}>{t.committed}% da renda em contas</span>}
      </div>
      <div>
        <p className="text-xs text-muted">Sobra no fim do mês</p>
        <p className={`text-3xl font-bold ${t.leftover < 0 ? 'text-bad' : 'text-good'}`}>{brl(t.leftover)}</p>
      </div>
      {t.income > 0 && <div className="h-2 overflow-hidden rounded-full bg-surface2"><div className={`h-full ${t.bills > t.income ? 'bg-bad' : 'bg-accent'}`} style={{ width: `${Math.min(100, t.bills / t.income * 100)}%` }} /></div>}
      <table className="w-full text-sm">
        <thead><tr className="text-xs text-muted"><th className="pb-1 text-left font-normal" /><th className="pb-1 text-right font-semibold">Dia 15</th><th className="pb-1 text-right font-semibold">Dia 30</th></tr></thead>
        <tbody>
          <tr className="border-t border-line"><td className="py-1.5 text-muted">Entra</td><td className="py-1.5 text-right">{brl(t.in15)}</td><td className="py-1.5 text-right">{brl(t.in30)}</td></tr>
          <tr className="border-t border-line"><td className="py-1.5 text-muted">Contas</td><td className="py-1.5 text-right">{brl(t.bills15)}</td><td className="py-1.5 text-right">{brl(t.bills30)}</td></tr>
          <tr className="border-t border-line"><td className="py-1.5 text-muted">Falta pagar</td><td className="py-1.5 text-right">{done(t.open15, t.bills15)}</td><td className="py-1.5 text-right">{done(t.open30, t.bills30)}</td></tr>
          <tr className="border-t border-line font-semibold"><td className="py-1.5">Sobra</td><td className={`py-1.5 text-right ${neg(t.left15)}`}>{brl(t.left15)}</td><td className={`py-1.5 text-right ${neg(t.left30)}`}>{brl(t.left30)}</td></tr>
        </tbody>
      </table>
      <p className="text-xs text-faint">Total de contas {brl(t.bills)} · já pago {brl(t.paid)}</p>
    </section>
  );
}
