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
  const cushion = Math.min(left, Math.max(left * num(keepPct) / 100, num(keepMin)));
  const contribution = Math.max(0, Math.floor((left - cushion) / 10) * 10);
  return { leftover: left, keep: round(left - contribution), contribution };
}

// Gasto médio por mês: média do total de contas dos últimos `last` meses (até `upTo`) que têm contas.
export function averageMonthlyBills(records, upTo, last = 6) {
  const months = records.filter(r => r.month <= upTo && monthBills(r) > 0).sort((a, b) => b.month.localeCompare(a.month)).slice(0, last);
  if (!months.length) return { average: 0, months: 0 };
  return { average: round(months.reduce((s, r) => s + monthBills(r), 0) / months.length), months: months.length };
}

// Situação da reserva: quantos meses de gastos ela cobre e quanto falta para a meta.
export function reserveStatus(balance, average, targetMonths, monthlyIn = 0) {
  const target = round(average * targetMonths);
  const missing = round(Math.max(0, target - balance));
  return {
    target, missing,
    covered: average > 0 ? Math.floor((balance / average) * 10) / 10 : 0,
    progress: target > 0 ? Math.min(100, (balance / target) * 100) : 0,
    monthsToGoal: missing > 0 && monthlyIn > 0 ? Math.ceil(missing / monthlyIn) : missing > 0 ? null : 0
  };
}
