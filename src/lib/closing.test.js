import { describe, expect, it } from 'vitest';
import { monthClosing } from './closing';

const buckets = [{ id: 'c', name: 'Cofrinho', percentage: 100, base_rate: 0, created_date: '2026-01-01', rate_history: [{ rate: 0, start_date: '2026-01-01' }] }];
const expenses = [
  { month: '2026-09', items: [{ name: 'Netflix', vale: 40, pagamento: 0 }, { name: 'Faculdade', pagamento: 400 }] },
  { month: '2026-10', income_15: 1000, income_30: 2000, items: [{ name: 'Netflix', vale: 60, pagamento: 0, paid_15: true }, { name: 'Faculdade', pagamento: 400 }] }
];
const records = [{ month: '2026-09', allocations: [{ bucket_id: 'c', amount: 500 }] }, { month: '2026-10', allocations: [{ bucket_id: 'c', amount: 300 }] }];
const withdrawals = [{ bucket_id: 'c', amount: 50, date: '2026-10-12' }];
const now = new Date(2026, 10, 15);

describe('fechamento do mês', () => {
  const c = monthClosing({ month: '2026-10', expenses, budgets: { assinaturas: 50 }, buckets, records, withdrawals, monthly: 600, now });
  it('resume a planilha e compara com o mês anterior', () => {
    expect(c.sheet).toMatchObject({ income: 3000, bills: 460, leftover: 2540, unpaid: 400, prevBills: 440, billsDelta: 20, savingsRate: 10 });
    const netflix = c.categories.find(x => x.id === 'assinaturas');
    expect(netflix).toMatchObject({ value: 60, prev: 40, delta: 20, level: 'over' });
    expect(c.over.map(x => x.id)).toEqual(['assinaturas']);
  });
  it('patrimônio do início ao fim do mês, separando aporte, saque e rendimento', () => {
    expect(c.patrimony).toMatchObject({ start: 500, end: 750, change: 250, earned: 0 });
    expect(c.contributed).toBe(300);
    expect(c.withdrawn).toBe(50);
    expect(c.closed).toBe(true);
  });
  it('previsto x realizado usa o plano mensal', () => {
    expect(c.plan).toMatchObject({ planned: 600, actual: 300, missing: 300 });
  });
  it('mês sem planilha não quebra', () => {
    const empty = monthClosing({ month: '2026-12', now });
    expect(empty.sheet).toMatchObject({ income: 0, bills: 0, savingsRate: null });
    expect(empty.closed).toBe(false);
  });
});
