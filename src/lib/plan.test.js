import { describe, expect, it } from 'vitest';
import { contributionPlan } from './plan';

const buckets = [
  { id: 'c', name: 'Cofrinho', percentage: 45 },
  { id: 't', name: 'Tesouro', percentage: 35 },
  { id: 's', name: 'FIIs e Ações', percentage: 20, kind: 'stocks' }
];

describe('previsto x realizado', () => {
  it('divide o aporte planejado pelos percentuais (R$600 → 270 / 210 / 120)', () => {
    const { rows, planned } = contributionPlan(buckets, {}, '2026-10', 600);
    expect(rows.map(r => r.planned)).toEqual([270, 210, 120]);
    expect(planned).toBe(600);
  });
  it('soma aporte marcado e avulsos do mês; ignora outros meses', () => {
    const records = [
      { month: '2026-10', allocations: [{ bucket_id: 'c', amount: 200 }] },
      { month: '2026-09', allocations: [{ bucket_id: 't', amount: 999 }] }
    ];
    const extras = [
      { bucket_id: 'c', amount: 50, date: '2026-10-20' },
      { bucket_id: 't', amount: 100, date: '2026-11-01' }
    ];
    const { rows, missing } = contributionPlan(buckets, { records, extras }, '2026-10', 600);
    expect(rows[0]).toMatchObject({ actual: 250, diff: -20 });
    expect(rows[1].actual).toBe(0);
    expect(missing).toBe(20 + 210 + 120);
  });
  it('FIIs e Ações: usa as compras do mês (menos vendas) quando existem', () => {
    const stocks = [
      {
        contributions: [
          { kind: 'buy', amount: 150, date: '2026-10-05' },
          { kind: 'sell', amount: 20, date: '2026-10-06' }
        ]
      }
    ];
    const records = [{ month: '2026-10', allocations: [{ bucket_id: 's', amount: 120 }] }];
    const { rows } = contributionPlan(buckets, { records, stocks }, '2026-10', 600);
    expect(rows[2]).toMatchObject({ actual: 130, diff: 10 });
  });
});
