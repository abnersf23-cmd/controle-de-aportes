import { describe, expect, it } from 'vitest';
import { averageMonthlyBills, monthCashflow, monthLeftover, reserveStatus, suggestContribution } from './assistant';

describe('assistente de aporte', () => {
  it('calcula a sobra do mês pela planilha', () => {
    expect(monthLeftover({ income_15: 1203.6, income_30: 770, items: [{ vale: 708, pagamento: 0 }, { vale: 0, pagamento: 660.49 }] })).toBe(605.11);
  });
  it('deixa 20% (mínimo R$ 100) na conta e arredonda o aporte para baixo de 10 em 10', () => {
    expect(suggestContribution(605.11)).toEqual({ leftover: 605.11, keep: 125.11, contribution: 480 });
    expect(suggestContribution(300)).toEqual({ leftover: 300, keep: 100, contribution: 200 });
    expect(suggestContribution(1416.85, { keepPct: 30, keepMin: 100 }).contribution).toBe(990);
  });
  it('não sugere aporte quando a sobra é pequena ou negativa', () => {
    expect(suggestContribution(80).contribution).toBe(0);
    expect(suggestContribution(-50)).toEqual({ leftover: -50, keep: 0, contribution: 0 });
  });
});

describe('reserva de emergência', () => {
  const records = [
    { month: '2026-09', items: [] },
    { month: '2026-10', items: [{ vale: 700, pagamento: 300 }] },
    { month: '2026-11', items: [{ vale: 500, pagamento: 300 }] },
    { month: '2026-12', items: [{ vale: 9999, pagamento: 0 }] }
  ];
  it('faz a média só dos meses com contas, até o mês informado', () => {
    expect(averageMonthlyBills(records, '2026-11')).toEqual({ average: 900, months: 2 });
  });
  it('diz quantos meses a reserva cobre e quanto falta', () => {
    expect(reserveStatus(1800, 900, 6, 300)).toMatchObject({ target: 5400, missing: 3600, covered: 2, monthsToGoal: 12 });
    expect(reserveStatus(6000, 900, 6).monthsToGoal).toBe(0);
  });
  it('saldo projetado: quinzena a quinzena, com o que falta pagar', () => {
    const r = { income_15: 1000, income_30: 2000, items: [{ vale: 1200, paid_15: true }, { pagamento: 500 }, { pagamento: 300, paid_30: true }] };
    const cf = monthCashflow(r, 20);
    expect(cf.steps.map(s => s.balance)).toEqual([-200, 1000]);
    expect(cf.end).toBe(1000);
    expect(cf.unpaid).toBe(500);
    expect(cf.negative).toEqual([15]);
    expect(cf.next).toMatchObject({ day: 30, unpaid: 500 });
    expect(monthCashflow({ ...r, items: r.items.map(i => ({ ...i, paid_30: true })) }, 31).next).toBeNull();
  });
});
