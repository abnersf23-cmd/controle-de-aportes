import { describe, expect, it } from 'vitest';
import { retirementPlan } from './retirement';
import { compareInvestments } from './compare';

describe('aposentadoria', () => {
  it('regra dos 4%: R$ 3.000 por mês pede R$ 900 mil', () => {
    expect(retirementPlan({ age: 25, retireAge: 55, income: 3000 }).target).toBe(900000);
  });
  it('sem juros, o aporte necessário é a meta dividida pelos meses', () => {
    const p = retirementPlan({ age: 30, retireAge: 40, income: 1000, realRate: 0, withdrawRate: 4 });
    expect(p.target).toBe(300000);
    expect(p.monthlyNeeded).toBe(2500);
  });
  it('com o aporte atual, mostra a renda que dá para ter e a idade em que chega lá', () => {
    const p = retirementPlan({ age: 22, retireAge: 60, income: 3000, current: 10000, monthly: 600, realRate: 5 });
    expect(p.monthlyNeeded).toBeGreaterThan(600);
    expect(p.incomeProjected).toBeLessThan(3000);
    expect(p.ageReached).toBeGreaterThan(60);
  });
});

describe('comparador de investimentos', () => {
  const base = { amount: 10000, months: 24, selic: 15, cdi: 14.9 };
  it('LCI isenta a 90% do CDI vs CDB 100% com IR de 17,5% (2 anos)', () => {
    const rows = compareInvestments({ ...base, months: 24 });
    const cdb = rows.find(r => r.id === 'cdb'),
      lci = rows.find(r => r.id === 'lci');
    expect(cdb.note).toBe('IR de 17,5%');
    expect(lci.tax).toBe(0);
    expect(rows[0].net).toBeGreaterThanOrEqual(rows[rows.length - 1].net);
  });
  it('FII sem valorização não paga IR (só rendimentos isentos)', () => {
    const fii = compareInvestments({ ...base, fiiDy: 10, fiiGrowth: 0 }).find(r => r.id === 'fii');
    expect(fii.tax).toBe(0);
    expect(fii.net).toBe(12100);
  });
  it('custódia da B3 só sobre o que passa de R$ 10 mil', () => {
    expect(compareInvestments({ ...base, amount: 10000 }).find(r => r.id === 'tesouro').rate).toBe(15);
    expect(compareInvestments({ ...base, amount: 20000 }).find(r => r.id === 'tesouro').rate).toBeCloseTo(14.9);
  });
});
