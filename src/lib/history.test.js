// Testes da linha do tempo do patrimônio. Rode com: npm test
import { describe, expect, it } from 'vitest';
import {
  ALL_STOCKS,
  TOTAL,
  assetList,
  buildTimeline,
  computedBalances,
  contributionEvents,
  currentSnapshot,
  milestonesReached,
  monthRange,
  nextMilestone,
  timelineSummary,
  trimEmptyStart,
  upsertSnapshot
} from './history';

// Bucket com taxa zero: o saldo é exatamente o que entrou, fica fácil conferir as contas.
const cofrinho = { id: 'b1', name: 'Cofrinho', kind: 'normal', rate_history: [{ rate: 0, start_date: '2026-01-01' }] };
const rv = { id: 'b2', name: 'FIIs e Ações', kind: 'stocks' };
const mxrf = {
  id: 's1',
  ticker: 'MXRF11',
  contributions: [
    { id: 'c1', date: '2026-02-10', amount: 100, quantity: 10 },
    { id: 'c2', date: '2026-03-10', amount: 50, quantity: 5 }
  ]
};
const data = {
  buckets: [cofrinho, rv],
  records: [
    // A alocação do bucket de ações NÃO pode contar: as ações já contam pelas compras.
    {
      month: '2026-01',
      allocations: [
        { bucket_id: 'b1', bucket_name: 'Cofrinho', amount: 270 },
        { bucket_id: 'b2', amount: 120 }
      ]
    },
    { month: '2026-03', allocations: [{ bucket_id: 'b1', bucket_name: 'Cofrinho', amount: 270 }] }
  ],
  extras: [{ bucket_id: 'b1', bucket_name: 'Cofrinho', date: '2026-02-15', amount: 200, note: 'bônus' }],
  withdrawals: [{ bucket_id: 'b1', bucket_name: 'Cofrinho', date: '2026-03-20', amount: 40 }],
  stocks: [mxrf]
};

describe('meses', () => {
  it('lista os meses de um até o outro, virando o ano', () => expect(monthRange('2025-11', '2026-02')).toEqual(['2025-11', '2025-12', '2026-01', '2026-02']));
  it('intervalo vazio quando falta o começo', () => expect(monthRange(undefined, '2026-02')).toEqual([]));
});

describe('lançamentos da linha do tempo', () => {
  const ev = contributionEvents(data);
  it('junta mensal, avulso, compra e saque em ordem de data', () =>
    expect(ev.map(e => `${e.date} ${e.type} ${e.amount}`)).toEqual([
      '2026-01-01 mensal 270',
      '2026-02-10 compra 100',
      '2026-02-15 avulso 200',
      '2026-03-01 mensal 270',
      '2026-03-10 compra 50',
      '2026-03-20 saque -40'
    ]));
  it('ignora o aporte mensal do bucket de ações (senão contaria duas vezes)', () => expect(ev.some(e => e.asset === 'b2')).toBe(false));
  it('venda de ação entra negativa', () => {
    const sold = contributionEvents({ stocks: [{ id: 's9', ticker: 'X', contributions: [{ date: '2026-01-05', amount: 80, kind: 'sell' }] }] });
    expect(sold[0]).toMatchObject({ type: 'venda', amount: -80, asset: 'stock:s9' });
  });
  it('lista só os ativos que já têm lançamento', () => {
    const extra = { id: 'b3', name: 'Tesouro', kind: 'normal' };
    expect(assetList([cofrinho, rv, extra], [mxrf], ev).map(a => a.id)).toEqual(['b1', 'stock:s1']);
  });
});

describe('linha do tempo recalculada', () => {
  const months = monthRange('2026-01', '2026-03');
  const events = contributionEvents(data);
  const computed = computedBalances(months, data, new Date(2026, 5, 1));
  it('saldo do ativo no fim de cada mês', () => {
    expect(computed['2026-02']).toEqual({ b1: 470, 'stock:s1': 100 });
    expect(computed['2026-03']).toEqual({ b1: 700, 'stock:s1': 150 });
  });
  it('total: quanto tinha, quanto saiu do bolso e o fluxo de cada mês', () => {
    const t = buildTimeline({ months, computed, events, asset: TOTAL });
    expect(t.map(p => [p.month, p.balance, p.invested, p.flow])).toEqual([
      ['2026-01', 270, 270, 270],
      ['2026-02', 570, 570, 300],
      ['2026-03', 850, 850, 280]
    ]);
    expect(t.every(p => p.source === 'calculado')).toBe(true);
  });
  it('um ativo só (MXRF11) começa no mês da primeira compra', () => {
    const t = trimEmptyStart(buildTimeline({ months, computed, events, asset: 'stock:s1' }));
    expect(t.map(p => [p.month, p.balance, p.invested, p.events.length])).toEqual([
      ['2026-02', 100, 100, 1],
      ['2026-03', 150, 150, 1]
    ]);
  });
  it('a foto do mês vence o recálculo (ações a preço de mercado)', () => {
    const snapshots = { '2026-03': { balance: 900, invested: 850, assets: { b1: { balance: 700 }, 'stock:s1': { balance: 200 } } } };
    const total = buildTimeline({ months, computed, events, snapshots, asset: TOTAL });
    expect(total[2]).toMatchObject({ balance: 900, invested: 850, gain: 50, source: 'foto' });
    const stock = buildTimeline({ months, computed, events, snapshots, asset: 'stock:s1' });
    expect(stock[2]).toMatchObject({ balance: 200, invested: 150, gain: 50, source: 'foto' });
    const group = buildTimeline({ months, computed, events, snapshots, asset: ALL_STOCKS });
    expect(group[2].balance).toBe(200);
  });
});

describe('foto do mês', () => {
  it('usa o preço de mercado quando há cotação', () => {
    const snap = currentSnapshot({ ...data, quotes: { MXRF11: { price: 11 } } }, new Date(2026, 5, 1));
    expect(snap.assets['stock:s1']).toEqual({ balance: 165, invested: 150 });
    expect(snap.balance).toBe(700 + 165);
    expect(snap.invested).toBe(850);
  });
  it('sem cotação, a ação entra pelo valor aportado', () => expect(currentSnapshot(data, new Date(2026, 5, 1)).assets['stock:s1'].balance).toBe(150));
  it('mês atual é atualizado', () => {
    const h = upsertSnapshot({ '2026-11': { balance: 1, invested: 1 } }, '2026-11', '2026-11', { balance: 2, invested: 1 }, 'x');
    expect(h['2026-11'].balance).toBe(2);
  });
  it('mês que já passou fica congelado', () => {
    const old = { '2026-10': { balance: 1, invested: 1 } };
    expect(upsertSnapshot(old, '2026-10', '2026-11', { balance: 5, invested: 5 }, 'x')).toBe(old);
  });
  it('não regrava quando nada mudou (devolve o mesmo objeto)', () => {
    const h = { '2026-11': { balance: 2, invested: 1, at: 'antes' } };
    expect(upsertSnapshot(h, '2026-11', '2026-11', { balance: 2, invested: 1 }, 'depois')).toBe(h);
  });
});

describe('marcos e resumo', () => {
  const pts = [
    { month: '2026-01', balance: 5000, invested: 5000, gain: 0, events: [{}] },
    { month: '2026-06', balance: 12000, invested: 11000, gain: 1000, events: [{}, {}] }
  ];
  it('mês em que cada marco foi alcançado', () =>
    expect(milestonesReached(pts)).toEqual([
      { target: 10000, month: '2026-06' },
      { target: 100000, month: null },
      { target: 500000, month: null },
      { target: 1000000, month: null }
    ]));
  it('próximo marco e quanto falta', () => expect(nextMilestone(12000)).toEqual({ target: 100000, missing: 88000, progress: 12 }));
  it('depois de R$ 1 milhão não há próximo marco', () => expect(nextMilestone(1000000)).toBeNull());
  it('resumo de onde saiu até onde chegou', () =>
    expect(timelineSummary(pts)).toMatchObject({
      from: '2026-01',
      start: 5000,
      now: 12000,
      growth: 7000,
      growthPct: 140,
      invested: 11000,
      gain: 1000,
      count: 3
    }));
});
