// Histórico do patrimônio: de onde você saiu e como chegou até aqui. Funções puras.
//
// Existem dois jeitos de saber quanto você tinha num mês que já passou:
//
// 1) RECALCULAR a partir dos lançamentos. Sempre funciona, até para meses antigos,
//    mas tem dois limites:
//    - FIIs e ações entram pelo valor aportado (o app não sabe o preço de mercado da época);
//    - se você editar ou apagar um lançamento antigo, o passado "muda" junto.
//
// 2) A FOTO DO MÊS (snapshot). O app guarda sozinho o patrimônio que está na tela, total e
//    ativo por ativo, com FIIs e ações a preço de mercado. A foto do mês atual vai sendo
//    atualizada enquanto o mês corre; quando o mês acaba, a última foto fica CONGELADA.
//
// O gráfico usa a foto quando ela existe e o recálculo quando não existe (meses de antes
// desta função existir). Assim o histórico nunca fica vazio e, daqui para frente, fica fiel.
import { bucketBalance, round, stockMarketValue, stockTotalAsOf, withdrawalBrl } from './finance';

export const SNAPSHOT_KEY = 'patrimonyHistory';
export const MILESTONE_TARGETS = [10000, 100000, 500000, 1000000];
export const TOTAL = 'total';
export const ALL_STOCKS = 'stocks'; // todos os FIIs e ações juntos

// Diz se um ativo entra na seleção: o total, o grupo de FIIs e ações ou um ativo só.
const inSelection = (selection, id) => selection === TOTAL || (selection === ALL_STOCKS ? id.startsWith('stock:') : id === selection);

const num = v => Number(v) || 0;
const stockId = s => `stock:${s.id}`;
const monthIdx = m => {
  const [y, mo] = m.split('-').map(Number);
  return y * 12 + mo - 1;
};
const fromIdx = i => `${Math.floor(i / 12)}-${String((i % 12) + 1).padStart(2, '0')}`;
const monthEnd = m => {
  const [y, mo] = m.split('-').map(Number);
  return new Date(y, mo, 0, 23, 59, 59);
};

// Meses de `from` até `to`, inclusive: ['2026-09', '2026-10', '2026-11'].
export function monthRange(from, to) {
  if (!from || !to || from > to) return [];
  const out = [];
  for (let i = monthIdx(from); i <= monthIdx(to); i++) out.push(fromIdx(i));
  return out;
}

// Os ativos que dá para escolher no gráfico: cada bucket de renda fixa e cada FII/ação.
// O bucket "FIIs e Ações" fica de fora porque os ativos dele aparecem um por um.
// Com `events`, só entram os ativos que já tiveram algum lançamento (os que têm história).
export function assetList(buckets = [], stocks = [], events = null) {
  const used = events && new Set(events.map(e => e.asset));
  return [
    ...buckets.filter(b => b.kind !== 'stocks').map(b => ({ id: b.id, name: b.name, icon: b.icon || '💰', color: b.color, kind: 'bucket' })),
    ...stocks.map(s => ({ id: stockId(s), name: s.ticker, icon: '📈', color: s.color, kind: 'stock' }))
  ].filter(a => !used || used.has(a.id));
}

// Todos os lançamentos que mexem no dinheiro investido, já com o ativo e o tipo:
// mensal (aporte do mês), avulso, compra/venda de FII/ação, saque/gasto.
// amount tem sinal: entrada positiva, saída negativa.
export function contributionEvents({ buckets = [], records = [], extras = [], withdrawals = [], stocks = [] } = {}) {
  const fixed = new Set(buckets.filter(b => b.kind !== 'stocks').map(b => b.id));
  const nameOf = id => buckets.find(b => b.id === id)?.name;
  const ev = [
    ...records.flatMap(r =>
      (r.allocations || [])
        .filter(a => fixed.has(a.bucket_id))
        .map(a => ({ date: `${r.month}-01`, asset: a.bucket_id, name: a.bucket_name || nameOf(a.bucket_id), type: 'mensal', amount: num(a.amount) }))
    ),
    ...extras
      .filter(e => fixed.has(e.bucket_id))
      .map(e => ({ date: e.date, asset: e.bucket_id, name: e.bucket_name || nameOf(e.bucket_id), type: 'avulso', amount: num(e.amount), note: e.note || '' })),
    ...withdrawals
      .filter(w => fixed.has(w.bucket_id))
      .map(w => ({
        date: w.date,
        asset: w.bucket_id,
        name: w.bucket_name || nameOf(w.bucket_id),
        type: 'saque',
        amount: -num(withdrawalBrl(w)),
        note: w.note || ''
      })),
    ...stocks.flatMap(s =>
      (s.contributions || []).map(c => ({
        date: c.date,
        asset: stockId(s),
        name: s.ticker,
        type: c.kind === 'sell' ? 'venda' : 'compra',
        amount: (c.kind === 'sell' ? -1 : 1) * num(c.amount),
        note: c.note || ''
      }))
    )
  ];
  return ev
    .filter(e => e.date && e.amount)
    .map(e => ({ ...e, month: e.date.slice(0, 7), amount: round(e.amount) }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

// Recalcula o saldo de cada ativo no fim de cada mês, a partir dos lançamentos.
// Devolve { [mes]: { [ativo]: saldo } }. O mês atual é calculado até hoje.
export function computedBalances(months, { buckets = [], records = [], extras = [], withdrawals = [], stocks = [] } = {}, now = new Date()) {
  const fixed = buckets.filter(b => b.kind !== 'stocks');
  return Object.fromEntries(
    months.map(m => {
      const end = monthEnd(m);
      const asOf = end > now ? now : end;
      const row = {};
      fixed.forEach(b => (row[b.id] = round(bucketBalance(b, records, extras, withdrawals, asOf).balance)));
      stocks.forEach(s => (row[stockId(s)] = stockTotalAsOf([s], asOf)));
      return [m, row];
    })
  );
}

// Patrimônio de AGORA para a foto, ativo por ativo: renda fixa com rendimento e FIIs/ações a
// preço de mercado. Ativo sem cotação salva entra pelo valor aportado (melhor que zero).
// Devolve { balance, invested, assets: { [ativo]: { balance, invested } } }.
export function currentSnapshot(data = {}, now = new Date()) {
  const { buckets = [], records = [], extras = [], withdrawals = [], stocks = [], quotes = {} } = data;
  const events = contributionEvents(data);
  const assets = {};
  buckets.filter(b => b.kind !== 'stocks').forEach(b => (assets[b.id] = { balance: round(bucketBalance(b, records, extras, withdrawals, now).balance) }));
  stocks.forEach(s => (assets[stockId(s)] = { balance: stockMarketValue(s, quotes[s.ticker]) ?? stockTotalAsOf([s], now) }));
  Object.keys(assets).forEach(id => (assets[id].invested = round(events.filter(e => e.asset === id).reduce((s, e) => s + e.amount, 0))));
  const sum = key => round(Object.values(assets).reduce((s, a) => s + a[key], 0));
  return { balance: sum('balance'), invested: sum('invested'), assets };
}

// Grava (ou atualiza) a foto do mês. Regras:
//  - mês atual: sempre atualiza com o valor mais recente;
//  - mês que já passou: só grava se ainda não existir foto (nunca reescreve o passado);
//  - devolve o MESMO objeto quando nada mudou, para quem chama saber que não precisa salvar.
export function upsertSnapshot(history = {}, month, currentMonth, snap, at) {
  const old = history[month];
  if (old && month < currentMonth) return history;
  if (old && JSON.stringify({ ...old, at: undefined }) === JSON.stringify({ ...snap, at: undefined })) return history;
  return { ...history, [month]: { ...snap, at } };
}

// Monta a linha do tempo de um ativo, do grupo de FIIs e ações (asset = 'stocks') ou do total (asset = 'total').
// Cada ponto: { month, balance, invested, gain, flow, events, source }.
//  - balance: quanto valia no fim do mês (foto, se houver; senão recálculo);
//  - invested: quanto saiu do seu bolso até ali (aportes − saques/vendas);
//  - gain: balance − invested = o que o dinheiro rendeu sozinho;
//  - flow: o que entrou/saiu NAQUELE mês; events: os lançamentos do mês.
export function buildTimeline({ months = [], computed = {}, events = [], snapshots = {}, asset = TOTAL } = {}) {
  const mine = events.filter(e => inSelection(asset, e.asset));
  const pick = (map = {}) => {
    const ids = Object.keys(map).filter(id => inSelection(asset, id));
    return ids.length ? ids.map(id => map[id]) : null;
  };
  const all = [...new Set([...months, ...Object.keys(snapshots)])].sort();
  let invested = 0;
  return all.map(month => {
    const evs = mine.filter(e => e.month === month);
    const flow = round(evs.reduce((s, e) => s + e.amount, 0));
    invested = round(invested + flow);
    const snap = snapshots[month];
    // Na foto, o total já está pronto; para um ativo ou um grupo, soma os ativos da foto.
    const snapParts = snap && (asset === TOTAL ? [snap] : pick(snap.assets));
    const calcParts = pick(computed[month]) || [];
    const fromSnap = !!snapParts;
    const balance = round(fromSnap ? snapParts.reduce((s, a) => s + num(a.balance), 0) : calcParts.reduce((s, v) => s + num(v), 0));
    return { month, balance, invested, gain: round(balance - invested), flow, events: evs, source: fromSnap ? 'foto' : 'calculado' };
  });
}

// Corta os meses do começo em que o ativo ainda não existia (saldo e aportes zerados).
export function trimEmptyStart(points = []) {
  const i = points.findIndex(p => p.balance || p.invested || p.events.length);
  return i < 0 ? [] : points.slice(i);
}

// Primeiro mês em que cada marco foi alcançado (null = ainda não chegou).
export function milestonesReached(points = [], targets = MILESTONE_TARGETS) {
  return targets.map(target => ({ target, month: points.find(p => p.balance >= target)?.month || null }));
}

// Próximo marco ainda não alcançado, quanto falta e o progresso em %.
export function nextMilestone(balance, targets = MILESTONE_TARGETS) {
  const target = targets.find(t => num(balance) < t);
  return target ? { target, missing: round(target - num(balance)), progress: round(Math.max(0, Math.min(100, (num(balance) / target) * 100))) } : null;
}

// Resumo "de onde eu saí": primeiro mês, hoje, quanto cresceu, quanto foi aporte e quanto foi rendimento.
export function timelineSummary(points = []) {
  if (!points.length) return null;
  const first = points[0],
    last = points[points.length - 1];
  const growth = round(last.balance - first.balance);
  return {
    from: first.month,
    to: last.month,
    start: first.balance,
    now: last.balance,
    growth,
    growthPct: first.balance > 0 ? round((growth / first.balance) * 100) : null,
    invested: last.invested,
    gain: last.gain,
    count: points.reduce((s, p) => s + p.events.length, 0)
  };
}
