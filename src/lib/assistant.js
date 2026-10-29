// Assistente de aporte e reserva de emergência.
// Funções puras (sem banco nem tela) para ficarem fáceis de testar.
import { round } from './finance';

export const ASSISTANT_DEFAULTS = { keepPct: 20, keepMin: 100, reserveMonths: 6, reserveBuckets: null };

const num = v => Number(v) || 0;
export const monthBills = r => round((r?.items || []).reduce((s, i) => s + num(i.vale) + num(i.pagamento), 0));
// Sobra do mês na planilha: (entrada dia 15 − contas do dia 15) + (entrada dia 30 − contas do dia 30).
export const monthLeftover = r => round(num(r?.income_15) + num(r?.income_30) - monthBills(r));

// Quanto aportar da sobra, deixando um colchão na conta corrente:
// colchão = o maior entre `keepPct`% da sobra e `keepMin` reais. O aporte é arredondado para baixo de 10 em 10.
export function suggestContribution(leftover, { keepPct, keepMin } = ASSISTANT_DEFAULTS) {
  const left = round(num(leftover));
  if (left <= 0) return { leftover: left, keep: Math.max(0, left), contribution: 0 };
  const cushion = Math.min(left, Math.max((left * num(keepPct)) / 100, num(keepMin)));
  const contribution = Math.max(0, Math.floor((left - cushion) / 10) * 10);
  return { leftover: left, keep: round(left - contribution), contribution };
}

// Gasto médio por mês: média do total de contas dos últimos `last` meses (até `upTo`) que têm contas.
export function averageMonthlyBills(records, upTo, last = 6) {
  const months = records
    .filter(r => r.month <= upTo && monthBills(r) > 0)
    .sort((a, b) => b.month.localeCompare(a.month))
    .slice(0, last);
  if (!months.length) return { average: 0, months: 0 };
  return { average: round(months.reduce((s, r) => s + monthBills(r), 0) / months.length), months: months.length };
}

// Situação da reserva: quantos meses de gastos ela cobre e quanto falta para a meta.
export function reserveStatus(balance, average, targetMonths, monthlyIn = 0) {
  const target = round(average * targetMonths);
  const missing = round(Math.max(0, target - balance));
  return {
    target,
    missing,
    covered: average > 0 ? Math.floor((balance / average) * 10) / 10 : 0,
    progress: target > 0 ? Math.min(100, (balance / target) * 100) : 0,
    monthsToGoal: missing > 0 && monthlyIn > 0 ? Math.ceil(missing / monthlyIn) : missing > 0 ? null : 0
  };
}

// Saldo projetado do mês, quinzena a quinzena: o que entra, o que sai e com quanto você fica
// depois de cada dia de pagamento. `unpaid` = contas daquele dia ainda sem o ✓.
// `day` = dia de hoje; `next` aponta o próximo dia de pagamento (15 ou 30), ou null se o mês já fechou.
export function monthCashflow(r, day = 1) {
  const items = r?.items || [];
  const sum = (key, onlyUnpaid) => round(items.reduce((s, i) => s + (onlyUnpaid && i[onlyUnpaid] ? 0 : num(i[key])), 0));
  const in15 = num(r?.income_15),
    in30 = num(r?.income_30);
  const b15 = sum('vale'),
    b30 = sum('pagamento');
  const after15 = round(in15 - b15);
  const steps = [
    { day: 15, income: in15, bills: b15, unpaid: sum('vale', 'paid_15'), balance: after15 },
    { day: 30, income: in30, bills: b30, unpaid: sum('pagamento', 'paid_30'), balance: round(after15 + in30 - b30) }
  ];
  const next = steps.find(s => day <= s.day && (s.unpaid > 0 || day < s.day)) || null;
  return { steps, end: steps[1].balance, unpaid: round(steps[0].unpaid + steps[1].unpaid), next, negative: steps.filter(s => s.balance < 0).map(s => s.day) };
}
