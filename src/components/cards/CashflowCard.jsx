import { CalendarClock } from 'lucide-react';
import { monthCashflow } from '@/lib/assistant';
import { brl, monthLabel } from '@/lib/finance';

// Saldo projetado até o fim do mês, pela planilha de Gastos mensais (dia 15 e dia 30).
export default function CashflowCard({ assistant, goTo }) {
  const { loading, month, hasMonth, current, suggestion } = assistant;
  if (loading) return null;
  const day = new Date().getDate();
  const cf = monthCashflow(current, day);
  const keep = cf.end - suggestion.contribution;

  return (
    <section className="card space-y-3 p-5">
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-info/10 text-info"><CalendarClock size={20} /></div>
        <div><h2 className="font-bold">Saldo até o fim do mês</h2><p className="text-sm text-muted">Projeção de {monthLabel(month)} pela planilha de gastos</p></div>
      </div>
      {!hasMonth ? <p className="text-sm text-muted">Preencha as entradas e as contas deste mês em <button className="font-semibold text-accent underline" onClick={() => goTo('gastos')}>Gastos mensais</button> para ver a projeção.</p> : <>
        <ol className="space-y-2">
          {cf.steps.map(s => {
            const isNext = cf.next?.day === s.day;
            return (
              <li key={s.day} className={`rounded-xl border p-3 text-sm ${isNext ? 'border-info/40 bg-info/5' : 'border-line'}`}>
                <div className="flex items-center justify-between"><strong>Dia {s.day}{isNext ? ' · próximo' : day > s.day ? ' · já passou' : ''}</strong><strong className={s.balance < 0 ? 'text-bad' : ''}>{brl(s.balance)}</strong></div>
                <p className="mt-0.5 text-xs text-muted">Entra {brl(s.income)} · sai {brl(s.bills)}{s.unpaid > 0 ? ` · falta pagar ${brl(s.unpaid)}` : s.bills > 0 ? ' · tudo pago ✓' : ''}</p>
              </li>
            );
          })}
        </ol>
        <div className="space-y-1 border-t border-line pt-2 text-sm">
          <div className="flex justify-between"><span className="text-muted">Sobra no fim do mês</span><strong className={cf.end < 0 ? 'text-bad' : ''}>{brl(cf.end)}</strong></div>
          <div className="flex justify-between"><span className="text-muted">Aporte sugerido</span><strong>− {brl(suggestion.contribution)}</strong></div>
          <div className="flex justify-between"><span className="text-muted">Fica na conta</span><strong className={keep < 0 ? 'text-bad' : 'text-good'}>{brl(keep)}</strong></div>
        </div>
        {cf.negative.includes(15) && cf.end >= 0 && <p className="rounded-xl bg-warn/10 p-3 text-sm text-warn">As contas do dia 15 passam do vale em {brl(-cf.steps[0].balance)}. Esse valor sai do pagamento do dia 30 (ou do que sobrou do mês passado).</p>}
        {cf.end < 0 && <p className="rounded-xl bg-bad/10 p-3 text-sm text-bad">Pela planilha, o mês fecha no vermelho em {brl(-cf.end)}.</p>}
      </>}
    </section>
  );
}
