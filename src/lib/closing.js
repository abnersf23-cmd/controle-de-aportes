// Fechamento do mês: junta planilha de gastos, aportes, saques e patrimônio de um mês
// e compara com o mês anterior. Função pura: recebe os dados, devolve números.
import { round, stockMonthTotal, totalBalance, withdrawalBrl } from './finance';
import { budgetStatus, totalsByCategory } from './categories';
import { monthBills, monthLeftover } from './assistant';
import { contributionPlan } from './plan';
import { addMonths } from './dates';

const inMonth = (date, month) => String(date || '').slice(0, 7) === month;
const num = v => Number(v) || 0;
// Último instante do mês; se o mês ainda não acabou, "agora".
const monthEnd = (month, now = new Date()) => {
  const [y, m] = month.split('-').map(Number);
  const end = new Date(y, m, 0, 23, 59, 59);
  return end > now ? now : end;
};

export function monthClosing({
  month,
  expenses = [],
  learned = {},
  budgets = {},
  buckets = [],
  records = [],
  extras = [],
  withdrawals = [],
  stocks = [],
  monthly = 0,
  now = new Date()
}) {
  const prevMonth = addMonths(month, -1);
  const sheet = expenses.find(r => r.month === month) || null;
  const prevSheet = expenses.find(r => r.month === prevMonth) || null;
  const items = sheet?.items || [];

  // Planilha de gastos
  const income = round(num(sheet?.income_15) + num(sheet?.income_30));
  const bills = monthBills(sheet);
  const unpaid = round(items.reduce((s, i) => s + (i.paid_15 ? 0 : num(i.vale)) + (i.paid_30 ? 0 : num(i.pagamento)), 0));
  const prevTotals = Object.fromEntries(totalsByCategory(prevSheet?.items || [], learned).map(c => [c.id, c.value]));
  const categories = budgetStatus(totalsByCategory(items, learned), budgets).map(c => ({
    ...c,
    prev: prevTotals[c.id] || 0,
    delta: round(c.value - (prevTotals[c.id] || 0))
  }));

  // Aportes e saques
  const plan = contributionPlan(buckets, { records, extras, stocks }, month, monthly);
  const fixedIds = new Set(buckets.filter(b => b.kind !== 'stocks').map(b => b.id));
  const record = records.find(r => r.month === month);
  const contributed = round(
    (record?.allocations || []).filter(a => fixedIds.has(a.bucket_id)).reduce((s, a) => s + num(a.amount), 0) +
      extras.filter(e => fixedIds.has(e.bucket_id) && inMonth(e.date, month)).reduce((s, e) => s + num(e.amount), 0) +
      stockMonthTotal(stocks, month)
  );
  const outs = withdrawals.filter(w => inMonth(w.date, month));
  const withdrawn = round(outs.reduce((s, w) => s + withdrawalBrl(w), 0));

  // Patrimônio: fim do mês anterior → fim deste mês. O que não veio de aporte nem de saque é rendimento.
  const start = round(totalBalance(buckets, records, extras, withdrawals, monthEnd(prevMonth, now), stocks));
  const end = round(totalBalance(buckets, records, extras, withdrawals, monthEnd(month, now), stocks));
  const change = round(end - start);
  const earned = round(change - contributed + withdrawn);

  return {
    month,
    prevMonth,
    closed: monthEnd(month, now) < now,
    sheet: {
      income,
      bills,
      leftover: monthLeftover(sheet),
      unpaid,
      prevBills: monthBills(prevSheet),
      billsDelta: round(bills - monthBills(prevSheet)),
      savingsRate: income > 0 ? round((plan.actual / income) * 100) : null
    },
    categories,
    over: categories.filter(c => c.level === 'over'),
    plan,
    contributed,
    withdrawn,
    withdrawals: outs,
    patrimony: { start, end, change, earned, changePct: start > 0 ? round((change / start) * 100) : null }
  };
}
