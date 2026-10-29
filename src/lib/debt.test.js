import { describe, expect, it } from 'vitest';
import { daysOf, investNet, irRate, simulateAnticipation } from './debt';

describe('antecipar parcelas x investir', () => {
  it('IR regressivo da renda fixa', () => {
    expect(irRate(90)).toBe(22.5);
    expect(irRate(300)).toBe(20);
    expect(irRate(500)).toBe(17.5);
    expect(irRate(800)).toBe(15);
  });
  it('desconto da antecipação = parcelas − valor presente', () => {
    // 2 parcelas de R$ 100, juros de 10% a.m.: 100/1,1 + 100/1,21 = 90,91 + 82,64
    const s = simulateAnticipation({ parcel: 100, remaining: 2, debtRate: 10, investRate: 0 });
    expect(s.cost).toBe(173.55);
    expect(s.discount).toBe(26.45);
    expect(s.better).toBe('antecipar');
  });
  it('sem juros no contrato, antecipar não dá desconto e investir ganha', () => {
    const s = simulateAnticipation({ parcel: 200, remaining: 10, debtRate: 0, investRate: 12 });
    expect(s.discount).toBe(0);
    expect(s.better).toBe('investir');
  });
  it('mesma taxa dos dois lados e sem IR: empate', () => {
    const annual = (Math.pow(1.02, 12) - 1) * 100; // 2% a.m.
    const s = simulateAnticipation({ parcel: 300, remaining: 12, debtRate: 2, investRate: annual, taxFree: true });
    expect(Math.abs(s.advantage)).toBeLessThan(0.05);
  });
  it('com o IR, o investimento precisa render mais que a dívida para valer a pena', () => {
    const annual = (Math.pow(1.02, 12) - 1) * 100;
    expect(simulateAnticipation({ parcel: 300, remaining: 12, debtRate: 2, investRate: annual }).better).toBe('antecipar');
  });
  it('antecipa só as últimas `count` parcelas', () => {
    const s = simulateAnticipation({ parcel: 100, remaining: 10, count: 3, debtRate: 3, investRate: 10 });
    expect(s.count).toBe(3);
    expect(s.nominal).toBe(300);
    expect(s.cost).toBeLessThan(300);
  });
  it('daysOf conta dias corridos: 6 meses = 183, 1 ano = 365, 2 anos = 731', () => {
    expect([6, 12, 24].map(daysOf)).toEqual([183, 365, 731]);
  });
  it('investNet desconta IR só do ganho', () => {
    expect(investNet(1000, 0, 12)).toBe(1000);
    expect(investNet(1000, 12, 12, true)).toBeCloseTo(1120, 5);
    // 12 meses = 365 dias: já cai na faixa de 17,5% (com "× 30" dava 360 dias e 20%, errado).
    expect(investNet(1000, 12, 12)).toBeCloseTo(1000 + 120 * 0.825, 5);
  });
});
