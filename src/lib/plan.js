// Previsto x realizado dos aportes do mês. Funções puras.
import { round, stockMonthTotal } from './finance';

export const PLAN_DEFAULTS = { monthly: 600 };

const inMonth = (date, month) => String(date || '').slice(0, 7) === month;

// Para cada bucket: quanto deveria entrar (aporte planejado × % do bucket) e quanto entrou.
// "Entrou" = aporte do mês marcado no bucket + aportes avulsos com data no mês.
// No bucket de FIIs e Ações, valem as compras registradas no mês (menos vendas), que mostram
// o que de fato foi investido; se não houver compras, vale o aporte marcado.
export function contributionPlan(buckets = [], { records = [], extras = [], stocks = [] } = {}, month, monthly = 0) {
  const record = records.find(r => r.month === month);
  const rows = buckets
    .filter(b => Number(b.percentage) > 0)
    .map(b => {
      const marked = (record?.allocations || []).filter(a => a.bucket_id === b.id).reduce((s, a) => s + (Number(a.amount) || 0), 0);
      const avulsos = extras.filter(e => e.bucket_id === b.id && inMonth(e.date, month)).reduce((s, e) => s + (Number(e.amount) || 0), 0);
      const bought = b.kind === 'stocks' ? stockMonthTotal(stocks, month) : 0;
      const actual = round(b.kind === 'stocks' && bought > 0 ? bought + avulsos : marked + avulsos);
      const planned = round(((Number(monthly) || 0) * Number(b.percentage)) / 100);
      const diff = round(actual - planned);
      return {
        id: b.id,
        name: b.name,
        icon: b.icon,
        color: b.color,
        percentage: Number(b.percentage),
        planned,
        actual,
        diff,
        progress: planned > 0 ? Math.min(100, (actual / planned) * 100) : 0
      };
    });
  const planned = round(rows.reduce((s, r) => s + r.planned, 0));
  const actual = round(rows.reduce((s, r) => s + r.actual, 0));
  return { rows, planned, actual, diff: round(actual - planned), missing: round(rows.reduce((s, r) => s + Math.max(0, -r.diff), 0)) };
}
