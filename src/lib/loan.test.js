import { describe, expect, it } from 'vitest';
import { effectiveMonthlyRate, estimateIof, pricePayment, simulateConsigned } from './loan';
import { interestSavings } from './debt';
import { round } from './finance';

describe('consignado', () => {
  it('tabela Price: R$ 10.000 a 2% ao mês em 12 vezes dá R$ 945,60', () => {
    expect(round(pricePayment(10000, 2, 12))).toBe(945.6);
    expect(pricePayment(1200, 0, 12)).toBe(100);
  });
  it('CET de um empréstimo sem custos extras é a própria taxa', () => {
    expect(round(effectiveMonthlyRate(10000, pricePayment(10000, 2, 12), 12))).toBe(2);
  });
  it('IOF estimado: 0,38% + 0,0082% ao dia, até 365 dias', () => {
    expect(estimateIof(10000, 6)).toBe(185.6); // 0,38% + 180 dias × 0,0082% = 1,856%
    expect(estimateIof(10000, 48)).toBe(337.3); // limite de 365 dias
  });
  it('avisa quando a parcela passa da margem de 35% do salário', () => {
    const s = simulateConsigned({ amount: 10000, rate: 1.8, months: 24, salary: 1200, fees: 0 });
    expect(s.margin).toBe(420);
    expect(s.fits).toBe(false);
    expect(simulateConsigned({ amount: 5000, rate: 1.8, months: 24, salary: 3000, fees: 0 }).fits).toBe(true);
  });
  it('compara com a dívida atual mais cara e mostra a economia', () => {
    const s = simulateConsigned({ amount: 5000, rate: 1.8, months: 12, salary: 3000, fees: 0, currentRate: 8 });
    expect(s.savings).toBeGreaterThan(2000);
    expect(s.cetMonthly).toBe(1.8);
  });
});

describe('economia de juros', () => {
  it('quitar tudo economiza mais que antecipar só algumas', () => {
    const r = interestSavings({ parcel: 100, remaining: 2, count: 1, debtRate: 10 });
    expect(r.anticipate).toBe(17.36); // a última: 100 − 100/1,21
    expect(r.payoff).toBe(26.45);
    expect(r.totalLeft).toBe(200);
  });
});
