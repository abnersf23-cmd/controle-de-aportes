// Totais da planilha de Gastos mensais (dia 15 = vale, dia 30 = pagamento). Função pura,
// usada pela tela e pelos testes.
import { round } from './finance';

const num = v => Number(v) || 0;

export function sheetTotals(data = {}) {
  const items = data.items || [];
  const sum = (key, skipPaid) => round(items.reduce((s, i) => s + (skipPaid && i[skipPaid] ? 0 : num(i[key])), 0));
  const bills15 = sum('vale'),
    bills30 = sum('pagamento');
  const in15 = num(data.income_15),
    in30 = num(data.income_30);
  const income = round(in15 + in30),
    bills = round(bills15 + bills30);
  const open15 = sum('vale', 'paid_15'),
    open30 = sum('pagamento', 'paid_30');
  return {
    in15,
    in30,
    income,
    bills15,
    bills30,
    bills,
    left15: round(in15 - bills15),
    left30: round(in30 - bills30),
    leftover: round(income - bills),
    open15,
    open30,
    paid: round(bills - open15 - open30),
    committed: income > 0 ? Math.round((bills / income) * 100) : null
  };
}
