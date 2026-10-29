import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Printer } from 'lucide-react';
import { Empty, PageHeader } from '@/components/ui/Bits';
import useExpenses from '@/hooks/useExpenses';
import useSetting from '@/hooks/useSetting';
import { applyFixed } from '@/db/expenses';
import { learnedCategories } from '@/lib/categories';
import { monthClosing } from '@/lib/closing';
import { PLAN_DEFAULTS } from '@/lib/plan';
import { addMonths, monthKey } from '@/lib/dates';
import { brl, dateLabel, monthLabel, withdrawalBrl } from '@/lib/finance';

const signed = v => `${v > 0 ? '+' : ''}${brl(v)}`;
const tone = (v, goodWhenUp = true) => (v === 0 ? 'text-muted' : v > 0 === goodWhenUp ? 'text-good' : 'text-bad');

// Fechamento do mês: um resumo para conferir (e imprimir ou salvar em PDF) depois que o mês acaba.
export default function Fechamento({ data }) {
  const { buckets, records, extras, withdrawals, stocks } = data;
  const { records: sheets, fixed, loading } = useExpenses();
  const [budgets] = useSetting('budgets', {});
  const [plan] = useSetting('contributionPlan', PLAN_DEFAULTS);
  const [month, setMonth] = useState(monthKey());
  const c = useMemo(() => {
    if (loading || !budgets || !plan) return null;
    // Contas com 📌 contam mesmo num mês que você ainda não abriu na planilha.
    const raw = sheets.find(r => r.month === month);
    const filled = applyFixed(fixed, month, raw) || raw;
    const expenses = [...sheets.filter(r => r.month !== month), ...(filled ? [{ ...filled, month }] : [])];
    return monthClosing({ month, expenses, learned: learnedCategories(sheets), budgets, buckets, records, extras, withdrawals, stocks, monthly: plan.monthly });
  }, [loading, budgets, plan, sheets, fixed, month, buckets, records, extras, withdrawals, stocks]);
  if (!c) return null;

  const { sheet, patrimony: p } = c;
  const top = c.categories.filter(x => x.value > 0)[0];
  const highlights = [
    c.plan.planned > 0 &&
      `Você aportou ${brl(c.plan.actual)} de ${brl(c.plan.planned)} planejados${c.plan.missing > 0 ? ` (faltaram ${brl(c.plan.missing)})` : ' 🎉'}.`,
    sheet.bills > 0 &&
      `As contas somaram ${brl(sheet.bills)}${sheet.prevBills > 0 ? `, ${sheet.billsDelta === 0 ? 'igual ao' : `${signed(sheet.billsDelta)} em relação ao`} mês anterior` : ''}.`,
    sheet.savingsRate != null && `Taxa de poupança: ${sheet.savingsRate.toLocaleString('pt-BR')}% das entradas viraram aporte.`,
    top && `Maior categoria: ${top.label} (${brl(top.value)}).`,
    c.over.length > 0 && `Passou do orçamento em: ${c.over.map(x => `${x.label} (${signed(-x.left)})`).join(', ')}.`,
    `Patrimônio: de ${brl(p.start)} para ${brl(p.end)} (${signed(p.change)}), com ${brl(p.earned)} de rendimento.`,
    sheet.unpaid > 0 && `${brl(sheet.unpaid)} em contas ainda sem o ✓ de pago.`
  ].filter(Boolean);
  const hasData = sheet.bills > 0 || sheet.income > 0 || c.plan.actual > 0 || c.withdrawn > 0;

  return (
    <div className="space-y-5">
      <PageHeader
        title={`Fechamento de ${monthLabel(month)}`}
        subtitle={c.closed ? 'Resumo do mês que passou, comparado com o anterior.' : 'O mês ainda não acabou: os números são parciais.'}
      >
        <div className="flex items-center gap-1 print:hidden">
          <button className="btn-ghost" onClick={() => setMonth(m => addMonths(m, -1))} aria-label="Mês anterior">
            <ChevronLeft size={18} />
          </button>
          <button className="btn-ghost" onClick={() => setMonth(m => addMonths(m, 1))} disabled={month >= monthKey()} aria-label="Próximo mês">
            <ChevronRight size={18} />
          </button>
          <button className="btn-secondary" onClick={() => window.print()}>
            <Printer size={16} /> Imprimir / PDF
          </button>
        </div>
      </PageHeader>

      {!hasData ? (
        <Empty>Nada registrado em {monthLabel(month)}.</Empty>
      ) : (
        <>
          <section className="card p-5">
            <h2 className="mb-2 font-bold">Resumo</h2>
            <ul className="list-disc space-y-1 pl-5 text-sm">
              {highlights.map(h => (
                <li key={h}>{h}</li>
              ))}
            </ul>
          </section>

          <div className="grid gap-4 lg:grid-cols-2">
            <section className="card p-5">
              <h2 className="mb-3 font-bold">Planilha de gastos</h2>
              <dl className="space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted">Entradas (dia 15 + dia 30)</dt>
                  <dd className="font-semibold">{brl(sheet.income)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted">Contas</dt>
                  <dd className="font-semibold">− {brl(sheet.bills)}</dd>
                </div>
                <div className="flex justify-between border-t border-line pt-1.5">
                  <dt className="text-muted">Sobra</dt>
                  <dd className={`font-bold ${sheet.leftover < 0 ? 'text-bad' : 'text-good'}`}>{brl(sheet.leftover)}</dd>
                </div>
              </dl>
            </section>
            <section className="card p-5">
              <h2 className="mb-3 font-bold">Patrimônio</h2>
              <dl className="space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted">Fim de {monthLabel(c.prevMonth)}</dt>
                  <dd className="font-semibold">{brl(p.start)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted">+ Aportes</dt>
                  <dd className="font-semibold">{brl(c.contributed)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted">− Saques e gastos dos investimentos</dt>
                  <dd className="font-semibold">{brl(c.withdrawn)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted">+ Rendimento</dt>
                  <dd className={`font-semibold ${tone(p.earned)}`}>{brl(p.earned)}</dd>
                </div>
                <div className="flex justify-between border-t border-line pt-1.5">
                  <dt className="text-muted">{c.closed ? `Fim de ${monthLabel(month)}` : 'Hoje'}</dt>
                  <dd className="font-bold">
                    {brl(p.end)}{' '}
                    <span className={`text-xs ${tone(p.change)}`}>
                      {p.changePct != null && `(${p.changePct > 0 ? '+' : ''}${p.changePct.toLocaleString('pt-BR')}%)`}
                    </span>
                  </dd>
                </div>
              </dl>
            </section>
          </div>

          {c.categories.length > 0 && (
            <section className="card overflow-x-auto p-5">
              <h2 className="mb-3 font-bold">Gastos por categoria</h2>
              <table className="w-full min-w-[520px] text-sm">
                <thead>
                  <tr className="text-left text-xs text-muted">
                    <th className="pb-1">Categoria</th>
                    <th className="pb-1 text-right">{monthLabel(month)}</th>
                    <th className="pb-1 text-right">Mês anterior</th>
                    <th className="pb-1 text-right">Diferença</th>
                    <th className="pb-1 text-right">Orçamento</th>
                  </tr>
                </thead>
                <tbody>
                  {c.categories.map(x => (
                    <tr key={x.id} className="border-t border-line">
                      <td className="py-1.5">
                        <span className="mr-2 inline-block h-2.5 w-2.5 rounded-full" style={{ background: x.color }} />
                        {x.label}
                      </td>
                      <td className="py-1.5 text-right font-semibold">{brl(x.value)}</td>
                      <td className="py-1.5 text-right text-muted">{brl(x.prev)}</td>
                      <td className={`py-1.5 text-right ${tone(x.delta, false)}`}>{signed(x.delta)}</td>
                      <td className={`py-1.5 text-right ${x.level === 'over' ? 'text-bad' : x.level === 'warn' ? 'text-warn' : 'text-muted'}`}>
                        {x.limit > 0 ? `${Math.round(x.ratio * 100)}% de ${brl(x.limit)}` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}

          <section className="card overflow-x-auto p-5">
            <h2 className="mb-3 font-bold">Aportes: previsto x realizado</h2>
            <table className="w-full min-w-[420px] text-sm">
              <thead>
                <tr className="text-left text-xs text-muted">
                  <th className="pb-1">Bucket</th>
                  <th className="pb-1 text-right">Previsto</th>
                  <th className="pb-1 text-right">Entrou</th>
                  <th className="pb-1 text-right">Diferença</th>
                </tr>
              </thead>
              <tbody>
                {c.plan.rows.map(r => (
                  <tr key={r.id} className="border-t border-line">
                    <td className="py-1.5">
                      {r.icon} {r.name}
                    </td>
                    <td className="py-1.5 text-right">{brl(r.planned)}</td>
                    <td className="py-1.5 text-right font-semibold">{brl(r.actual)}</td>
                    <td className={`py-1.5 text-right ${tone(r.diff)}`}>{signed(r.diff)}</td>
                  </tr>
                ))}
                <tr className="border-t border-line font-bold">
                  <td className="py-1.5">Total</td>
                  <td className="py-1.5 text-right">{brl(c.plan.planned)}</td>
                  <td className="py-1.5 text-right">{brl(c.plan.actual)}</td>
                  <td className={`py-1.5 text-right ${tone(c.plan.diff)}`}>{signed(c.plan.diff)}</td>
                </tr>
              </tbody>
            </table>
          </section>

          {c.withdrawals.length > 0 && (
            <section className="card p-5">
              <h2 className="mb-3 font-bold">Saques e gastos tirados dos investimentos</h2>
              <ul className="space-y-1 text-sm">
                {c.withdrawals.map(w => (
                  <li key={w.id} className="flex justify-between gap-2">
                    <span className="text-muted">
                      {dateLabel(w.date)} · {w.bucket_name}
                      {w.note ? ` · ${w.note}` : ''}
                    </span>
                    <strong>{brl(withdrawalBrl(w))}</strong>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}
