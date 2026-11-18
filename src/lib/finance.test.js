// Testes automáticos dos cálculos. Rode com: npm test
import { describe, expect, it } from 'vitest';
import {
  milestones,
  projectionData,
  realRate,
  bucketContributions,
  bucketBalance,
  dollarRealBalance,
  effectiveRate,
  goalProjection,
  realBalance,
  rebalanceForAdd,
  rebalanceForDelete,
  rebalanceForEdit,
  stockInvested,
  stockQuantity,
  stockDividendsReceived,
  round,
  splitZeroBuckets,
  totalBalance,
  stockCost,
  stockCostAsOf,
  rateHistoryAfterEdit,
  withdrawalOverdraft
} from './finance';

describe('taxa efetiva', () => {
  it('Selic usa a taxa base', () => expect(effectiveRate({ rate_type: 'selic', base_rate: 14.25 })).toBe(14.25));
  it('CDI aplica o percentual', () => expect(effectiveRate({ rate_type: 'cdi', base_rate: 13.9, cdi_percentage: 121 })).toBe(16.82));
  it('Fed desconta a taxa de gestão', () => expect(effectiveRate({ rate_type: 'fed', base_rate: 3.75, management_fee: 0.4 })).toBe(3.35));
});

describe('saldo com juros compostos diários', () => {
  const bucket = { rate_history: [{ rate: 10, start_date: '2025-01-01' }] };
  it('R$ 1.000 a 10% a.a. por 365 dias', () => {
    const r = realBalance(bucket, [{ date: '2025-01-01', amount: 1000 }], '2026-01-01');
    expect(r.balance).toBe(round(1000 * Math.pow(1 + 0.1 / 365, 365)));
    expect(r.contributed).toBe(1000);
  });
  it('saque reduz o saldo na data em que acontece', () => {
    const r = realBalance(
      bucket,
      [
        { date: '2025-01-01', amount: 1000 },
        { date: '2025-01-01', amount: -400 }
      ],
      '2025-01-01'
    );
    expect(r.balance).toBe(600);
  });
  it('mudança de taxa só vale a partir da data', () => {
    const b = {
      rate_history: [
        { rate: 0, start_date: '2025-01-01' },
        { rate: 36.5, start_date: '2025-01-11' }
      ]
    };
    const r = realBalance(b, [{ date: '2025-01-01', amount: 100 }], '2025-01-12');
    expect(r.balance).toBe(round(100 * 1.001)); // 10 dias a 0% + 1 dia a 0,1%/dia
  });
  it('saques em bucket de dólar viram reais pela cotação', () => {
    const c = bucketContributions('d', [], [], [{ bucket_id: 'd', date: '2025-02-01', amount: 10, dollar_rate: 5 }]);
    expect(c[0].amount).toBe(-50);
  });
});

describe('bucket em dólar', () => {
  it('separa rendimento e variação cambial', () => {
    const b = { rate_history: [{ rate: 0, start_date: '2025-01-01' }] };
    const r = dollarRealBalance(b, [{ date: '2025-01-01', amount: 500, dollar_rate: 5 }], 5.5, '2025-06-01');
    expect(r.usdBalance).toBe(100);
    expect(r.balance).toBe(550);
    expect(r.exchange).toBe(50);
    expect(r.yield).toBe(0);
  });
});

describe('rebalanceamento', () => {
  const buckets = [
    { id: 'a', percentage: 40, protected: true },
    { id: 'b', percentage: 30 },
    { id: 'c', percentage: 30 }
  ];
  const sum = list => round(list.reduce((s, b) => s + b.percentage, 0));
  it('novo bucket sai só dos não protegidos e soma continua 100', () => {
    const out = rebalanceForAdd(buckets, 10);
    expect(out.find(b => b.id === 'a').percentage).toBe(40);
    expect(sum(out) + 10).toBe(100);
  });
  it('excluir redistribui e soma 100', () => expect(sum(rebalanceForDelete(buckets, buckets[2]))).toBe(100));
  it('editar um percentual reajusta os outros e não mexe no protegido', () => {
    const out = rebalanceForEdit(buckets, 'b', 50);
    expect(out.find(b => b.id === 'a')).toBeUndefined();
    expect(out.find(b => b.id === 'c').percentage).toBe(10);
    expect(round(sum(out) + 50 + 40)).toBe(100);
  });
  it('editar recusa um % que não cabe ao lado do protegido', () => {
    expect(() => rebalanceForEdit(buckets, 'b', 70)).toThrow();
  });
  it('excluir quando os que ficam estão em 0% divide em partes iguais (sem NaN)', () => {
    const list = [
      { id: 'a', percentage: 60, protected: true },
      { id: 'b', percentage: 0 },
      { id: 'c', percentage: 0 },
      { id: 'd', percentage: 40 }
    ];
    const out = rebalanceForDelete(list, list[3]);
    expect(out.find(b => b.id === 'b').percentage).toBe(20);
    expect(out.find(b => b.id === 'c').percentage).toBe(20);
    expect(sum(out)).toBe(100);
  });
});

describe('correções da auditoria de 18/11', () => {
  const cx = { id: 'cx', rate_type: 'custom', base_rate: 14, rate_history: [{ rate: 14, start_date: '2026-01-01' }] };
  it('aporte de hoje não rende antes de virar o dia, mesmo depois do meio-dia', () => {
    const c = [{ date: '2026-11-18', amount: 1000 }];
    expect(realBalance(cx, c, new Date(2026, 10, 18, 11, 0)).balance).toBe(1000);
    expect(realBalance(cx, c, new Date(2026, 10, 18, 13, 0)).balance).toBe(1000);
    expect(realBalance(cx, c, new Date(2026, 10, 18, 23, 59)).balance).toBe(1000);
    expect(realBalance(cx, c, new Date(2026, 10, 19, 0, 1)).balance).toBe(1000.38);
  });
  it('venda com lucro não some do patrimônio', () => {
    const stocks = [
      {
        id: 's',
        contributions: [
          { kind: 'buy', amount: 1000, quantity: 10, date: '2026-10-01' },
          { kind: 'sell', amount: 1500, quantity: 10, date: '2026-10-10' }
        ]
      }
    ];
    const extras = [{ bucket_id: 'cx', amount: 1500, date: '2026-10-10' }];
    expect(round(totalBalance([cx], [], extras, [], new Date(2026, 9, 10), stocks))).toBe(1500);
  });
  it('venda parcial deixa no patrimônio o custo das cotas que sobraram', () => {
    const s = {
      contributions: [
        { kind: 'buy', amount: 1000, quantity: 10, date: '2026-10-01' },
        { kind: 'sell', amount: 750, quantity: 5, date: '2026-10-10' }
      ]
    };
    expect(stockCost([s])).toBe(500);
    expect(stockCostAsOf([s], new Date(2026, 9, 5))).toBe(1000);
  });
  it('bucket em dólar sem cotação atual usa a cotação do lançamento, não 1', () => {
    const fed = { id: 'us', rate_type: 'fed', rate_history: [{ rate: 0, start_date: '2026-01-01' }] };
    const extras = [{ bucket_id: 'us', amount: 5400, dollar_rate: 5.4, date: '2026-11-01' }];
    expect(bucketBalance(fed, [], extras, [], new Date(2026, 10, 18)).balance).toBe(5400);
  });
});

describe('ações e FIIs', () => {
  const stock = {
    contributions: [
      { kind: 'buy', date: '2025-01-01', quantity: 10, amount: 100 },
      { kind: 'buy', date: '2025-02-01', quantity: 10, amount: 120 },
      { kind: 'sell', date: '2025-03-01', quantity: 5, amount: 70 }
    ]
  };
  it('quantidade considera vendas', () => expect(stockQuantity(stock)).toBe(15));
  it('custo usa preço médio', () => expect(stockInvested(stock)).toBe(165)); // 220 - 5 × 11
  it('dividendos usam as cotas que você tinha na data', () => {
    expect(
      stockDividendsReceived(stock, [
        { date: '2025-01-15', amount: 0.1 },
        { date: '2025-03-15', amount: 0.1 }
      ])
    ).toBe(2.5);
  });
});

describe('meta', () => {
  it('sem juros: 1000 por mês para 10.000 leva 10 meses', () => expect(goalProjection(0, 1000, 0, 10000)).toBe(10));
  it('meta já batida retorna 0', () => expect(goalProjection(500, 0, 0, 100)).toBe(0));
});

describe('buckets zerados na tela inicial', () => {
  const zerado = { b: { id: 'a', percentage: 10 }, bal: { balance: 0 } };
  const semPct = { b: { id: 'b', percentage: 0 }, bal: { balance: 0 } };
  const comSaldo = { b: { id: 'c', percentage: 0 }, bal: { balance: 150 } };
  const ids = list => list.map(i => i.b.id);
  it('oculta quem tem saldo zero', () => {
    const r = splitZeroBuckets([zerado, semPct, comSaldo]);
    expect(ids(r.visible)).toEqual(['c']);
    expect(ids(r.hidden)).toEqual(['a', 'b']);
  });
  it('volta a aparecer quando recebe valor', () => {
    expect(ids(splitZeroBuckets([{ ...zerado, bal: { balance: 0.01 } }]).visible)).toEqual(['a']);
  });
  it('aparece ao distribuir um aporte se tiver percentual', () => {
    const r = splitZeroBuckets([zerado, semPct], 1000);
    expect(ids(r.visible)).toEqual(['a']);
    expect(ids(r.hidden)).toEqual(['b']);
  });
});

describe('projeção com inflação e metas', () => {
  it('taxa real pela equação de Fisher (não é só subtrair)', () => {
    expect(round(realRate(14, 4.5))).toBe(9.09);
    expect(realRate(5, 5)).toBe(0);
  });
  it('projeção começa do saldo atual e aceita taxa no lugar da cadastrada', () => {
    const buckets = [{ id: 'a', name: 'A', percentage: 100, base_rate: 0 }];
    const rows = projectionData(buckets, 100, 2, { start: { a: 1000 } });
    expect(rows[1].Total).toBe(1200);
    const withRate = projectionData(buckets, 0, 12, { start: { a: 1000 }, rates: { a: 12 } });
    expect(withRate[11].Total).toBe(1120);
  });
  it('total em valor de hoje desconta a inflação', () => {
    const rows = projectionData([{ id: 'a', name: 'A', percentage: 100, base_rate: 10 }], 0, 12, { start: { a: 1000 }, inflation: 10 });
    expect(rows[11].Total).toBe(1100);
    expect(rows[11]['Total em valor de hoje']).toBe(1000);
  });
  it('metas: sem juros e sem inflação, R$600/mês leva 17 meses para R$10 mil', () => {
    const [m10] = milestones(0, 600, 0, 0);
    expect(m10).toMatchObject({ target: 10000, months: 17, monthsReal: 17 });
  });
  it('metas: com inflação, a meta em poder de compra de hoje demora mais', () => {
    const m = milestones(0, 600, 10, 5, [100000])[0];
    expect(m.monthsReal).toBeGreaterThan(m.months);
  });
  it('taxa mudada pelo Editar vale a partir de hoje, não para o passado', () => {
    const tesouro = {
      rate_type: 'selic',
      base_rate: 13.75,
      rate_history: [
        { rate: 14, start_date: '2026-08-31' },
        { rate: 13.75, start_date: '2026-10-29' }
      ]
    };
    const next = rateHistoryAfterEdit(tesouro, { rate_type: 'selic', base_rate: 15 }, '2026-11-18');
    expect(next).toEqual([
      { rate: 14, start_date: '2026-08-31' },
      { rate: 13.75, start_date: '2026-10-29' },
      { rate: 15, start_date: '2026-11-18' }
    ]);
    expect(rateHistoryAfterEdit(tesouro, { rate_type: 'selic', base_rate: 13.75 }, '2026-11-18')).toBeNull();
  });
  it('saque maior que o saldo é recusado; dentro do saldo passa', () => {
    const cx = { id: 'cx', name: 'Caixa', rate_type: 'custom', rate_history: [{ rate: 14, start_date: '2026-01-01' }] };
    const data = { extras: [{ bucket_id: 'cx', amount: 100, date: '2026-01-01' }] };
    expect(withdrawalOverdraft(cx, { amount: 500, date: '2026-02-01' }, data)).toMatch(/maior que o saldo/);
    expect(withdrawalOverdraft(cx, { amount: 100, date: '2026-02-01' }, data)).toBeNull();
  });
});

// Bug de 2026-11: o "Aportei" só guardava o mês e o rendimento contava desde o dia 01.
describe('aporte mensal rende a partir do dia real', () => {
  const bucket = { id: 'b1', rate_type: 'custom', base_rate: 14, rate_history: [{ rate: 14, start_date: '2026-01-01' }] };
  const comData = [{ month: '2026-11', allocations: [{ bucket_id: 'b1', amount: 1000, date: '2026-11-18' }] }];
  const semData = [{ month: '2026-11', allocations: [{ bucket_id: 'b1', amount: 1000 }] }];

  it('no dia do aporte o rendimento é zero', () => {
    expect(bucketBalance(bucket, comData, [], [], '2026-11-18')).toEqual({ balance: 1000, contributed: 1000, yield: 0 });
  });
  it('rende só os dias depois do aporte (12 dias até 30/11)', () => {
    const esperado = Math.round(1000 * Math.pow(1 + 0.14 / 365, 12) * 100) / 100;
    expect(bucketBalance(bucket, comData, [], [], '2026-11-30').balance).toBe(esperado);
  });
  it('antes do dia do aporte ele ainda não aparece no saldo', () => {
    expect(bucketBalance(bucket, comData, [], [], '2026-11-10').balance).toBe(0);
  });
  it('aportes antigos sem dia continuam no dia 01 (sem mudar saldos já lançados)', () => {
    expect(bucketContributions('b1', semData)[0].date).toBe('2026-11-01');
    expect(bucketBalance(bucket, semData, [], [], '2026-11-18').balance).toBe(1006.54);
  });
});
