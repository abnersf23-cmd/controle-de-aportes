// Toda a matemática financeira do app.
// Portado do app original no Base44 (src/lib/finance.js) mantendo as mesmas fórmulas,
// para que os saldos batam com os que você já via. Funções puras: recebem dados e
// devolvem resultados, sem acessar banco nem tela, o que facilita testar.
import { monthKey as localMonthKey, today as localToday } from './dates';

// Converte datas do app para Date no fuso LOCAL.
// "2026-10-01" com new Date() vira meia-noite em UTC = 21h do dia 30/09 no Brasil,
// o que jogava um aporte de outubro para dentro do saldo de setembro.
// Aqui, datas só com dia (AAAA-MM-DD) viram meia-noite no horário do computador.
export function toDate(value) {
  if (value instanceof Date) return value;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value ?? ''));
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : new Date(value);
}
const byDate = key => (a, b) => toDate(a[key]) - toDate(b[key]);
const DAY = 86400000;
// Dias entre duas datas, sem erro no horário de verão (arredonda a diferença).
const daysBetween = (a, b) => Math.round((b - a) / DAY);

export const brl = (value = 0) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value) || 0);
export const usd = (value = 0) => `US$ ${Number(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
export const pct = value => `${Number(value || 0).toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%`;
export const monthKey = () => localMonthKey();
export const dateLabel = d => (d ? toDate(String(d).slice(0, 10)).toLocaleDateString('pt-BR') : '—');
export const monthLabel = month => {
  const [year, value] = month.split('-');
  const text = new Date(Number(year), Number(value) - 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  return text.charAt(0).toUpperCase() + text.slice(1);
};
export const round = value => Math.round((value + Number.EPSILON) * 100) / 100;
export const daysSince = date => {
  if (!date) return null;
  return Math.floor((Date.now() - toDate(date).getTime()) / DAY);
};
export const colors = ['#8B5CF6', '#F97316', '#EC4899', '#06B6D4', '#6366F1', '#84CC16'];

export function bucketCategory(name = '') {
  const value = String(name).toLowerCase();
  if (/caixa/.test(value)) return 'Caixa';
  if (/tesouro|selic|prefixado|ipca/.test(value)) return 'Tesouro Direto';
  if (/d[oó]lar|dolar|wise|rende|euro|estrangeir/.test(value)) return 'Moeda Estrangeira';
  if (/cofrinho|picpay|nubank|inter/.test(value)) return 'Cofrinhos';
  return 'Outros';
}

// Valor em R$ de um saque/gasto: em buckets de dólar o valor é guardado em US$.
export const withdrawalBrl = w => (w.dollar_rate != null ? Number(w.amount) * Number(w.dollar_rate) : Number(w.amount));

// ---------- Rebalanceamento de percentuais ----------
const closeToTarget = (items, target) => {
  const rounded = items.map(item => ({ ...item, percentage: round(item.percentage) }));
  const difference = round(target - rounded.reduce((sum, item) => sum + item.percentage, 0));
  return rounded.map((item, index) => (index === rounded.length - 1 ? { ...item, percentage: round(item.percentage + difference) } : item));
};
export function rebalanceForAdd(buckets, percentage) {
  const editable = buckets.filter(bucket => !bucket.protected);
  const total = editable.reduce((sum, bucket) => sum + bucket.percentage, 0);
  if (percentage <= 0 || percentage >= total) throw new Error('O percentual deve ser menor que o total disponível nos buckets não protegidos.');
  const adjusted = closeToTarget(editable.map(bucket => ({ ...bucket, percentage: bucket.percentage * (total - percentage) / total })), total - percentage);
  return buckets.map(bucket => (bucket.protected ? bucket : adjusted.find(item => item.id === bucket.id)));
}
export function rebalanceForDelete(buckets, removed) {
  const remaining = buckets.filter(bucket => bucket.id !== removed.id);
  const editable = remaining.filter(bucket => !bucket.protected);
  const total = editable.reduce((sum, bucket) => sum + bucket.percentage, 0);
  if (!editable.length) throw new Error('Mantenha ao menos um bucket não protegido.');
  const adjusted = closeToTarget(editable.map(bucket => ({ ...bucket, percentage: bucket.percentage + removed.percentage * bucket.percentage / total })), total + removed.percentage);
  return remaining.map(bucket => (bucket.protected ? bucket : adjusted.find(item => item.id === bucket.id)));
}
// Muda o % de um bucket e redistribui a diferença proporcionalmente entre os outros.
export function rebalanceForEdit(buckets, id, target) {
  const others = buckets.filter(b => b.id !== id);
  if (target <= 0 || target >= 100 || !others.length) throw new Error('Informe um percentual entre 0 e 100 e mantenha outros buckets para redistribuir.');
  const remainder = round(100 - target);
  const othersTotal = others.reduce((s, b) => s + Number(b.percentage), 0);
  const adjusted = others.map(b => ({ id: b.id, percentage: round(othersTotal > 0 ? Number(b.percentage) * remainder / othersTotal : remainder / others.length) }));
  adjusted[adjusted.length - 1].percentage = round(adjusted[adjusted.length - 1].percentage + round(remainder - adjusted.reduce((s, b) => s + b.percentage, 0)));
  return adjusted;
}

// ---------- Taxas ----------
export function effectiveRate(bucket = {}) {
  const type = bucket.rate_type || 'custom';
  const base = Number(bucket.base_rate || 0);
  if (type === 'fed') return round(Math.max(0, base - Number(bucket.management_fee ?? 0.4)));
  if (type === 'cdi') return round(base * Number(bucket.cdi_percentage ?? 100) / 100);
  return round(base);
}
export function rateHistory(bucket = {}) {
  const history = Array.isArray(bucket.rate_history) ? bucket.rate_history : [];
  if (history.length) return [...history].sort(byDate('start_date'));
  const start = (bucket.created_date || localToday()).slice(0, 10);
  return [{ rate: effectiveRate(bucket), start_date: start }];
}

// ---------- Saldos dos buckets ----------
// Junta aportes mensais, avulsos e saques (negativos) de um bucket, em ordem de data.
export function bucketContributions(bucketId, records = [], extras = [], withdrawals = []) {
  const monthly = records.flatMap(r => (r.allocations || []).filter(a => a.bucket_id === bucketId).map(a => ({ date: `${r.month}-01`, amount: Number(a.amount) || 0, dollar_rate: a.dollar_rate })));
  const avulsos = extras.filter(e => e.bucket_id === bucketId).map(e => ({ date: e.date, amount: Number(e.amount) || 0, dollar_rate: e.dollar_rate }));
  const saques = withdrawals.filter(w => w.bucket_id === bucketId).map(w => ({ date: w.date, amount: -withdrawalBrl(w), dollar_rate: w.dollar_rate }));
  return [...monthly, ...avulsos, ...saques].sort(byDate('date'));
}

// Juros compostos DIÁRIOS: saldo *= (1 + taxa/100/365) ^ dias, trocando de taxa
// quando o histórico muda e somando cada movimento na sua data.
export function realBalance(bucket, contributions = [], asOf = new Date()) {
  const asOfDate = toDate(asOf);
  const contribs = contributions.filter(c => toDate(c.date) <= asOfDate).map(c => ({ date: toDate(c.date), amount: Number(c.amount) || 0 }));
  const contributed = round(contribs.reduce((sum, c) => sum + c.amount, 0));
  if (!contribs.length) return { balance: 0, contributed: 0, yield: 0 };
  const history = rateHistory(bucket);
  const rateAt = d => { let rate = history[0].rate; for (const h of history) if (toDate(h.start_date) <= d) rate = h.rate; return rate; };
  const events = new Set([asOfDate.getTime()]);
  contribs.forEach(c => events.add(c.date.getTime()));
  history.forEach(h => { const d = toDate(h.start_date); if (d <= asOfDate) events.add(d.getTime()); });
  const sorted = [...events].sort((a, b) => a - b);
  let balance = 0, prev = null;
  for (const t of sorted) {
    const cur = new Date(t);
    if (prev) { const days = daysBetween(prev, cur); if (days > 0) balance *= Math.pow(1 + rateAt(prev) / 100 / 365, days); }
    contribs.filter(c => c.date.getTime() === t).forEach(c => { balance += c.amount; });
    prev = cur;
  }
  return { balance: round(balance), contributed, yield: round(balance - contributed) };
}

function compoundWithHistory(principal, startDate, endDate, history) {
  if (startDate >= endDate || !history.length) return principal;
  let balance = principal;
  const sorted = [...history].sort(byDate('start_date'));
  const points = [startDate];
  for (const h of sorted) { const d = toDate(h.start_date); if (d > startDate && d < endDate) points.push(d); }
  points.push(endDate);
  for (let i = 0; i < points.length - 1; i++) {
    const from = points[i], to = points[i + 1];
    const days = daysBetween(from, to);
    if (days > 0) {
      let rate = sorted[0].rate;
      for (const h of sorted) if (toDate(h.start_date) <= from) rate = h.rate;
      balance *= Math.pow(1 + rate / 100 / 365, days);
    }
  }
  return balance;
}

// Bucket em dólar: cada aporte vira US$ pela cotação do dia, rende em US$,
// e separamos o rendimento do ativo da variação cambial.
export function dollarRealBalance(bucket, contributions = [], currentRate, asOf = new Date()) {
  const asOfDate = toDate(asOf);
  const contribs = contributions.filter(c => toDate(c.date) <= asOfDate);
  const contributed = round(contribs.reduce((s, c) => s + Number(c.amount || 0), 0));
  if (!contribs.length) return { balance: 0, contributed: 0, yield: 0, exchange: 0, usdBalance: 0, usdContributed: 0, usdYield: 0, usdExchange: 0 };
  const history = rateHistory(bucket);
  const rate = Number(currentRate) || contribs[0]?.dollar_rate || 1;
  let usdBalance = 0, usdContributed = 0, yieldBRL = 0, exchangeBRL = 0;
  for (const c of contribs) {
    const entryRate = Number(c.dollar_rate) || rate;
    const usdAmount = Number(c.amount) / entryRate;
    const compoundedUSD = compoundWithHistory(usdAmount, toDate(c.date), asOfDate, history);
    usdBalance += compoundedUSD;
    usdContributed += usdAmount;
    yieldBRL += (compoundedUSD - usdAmount) * entryRate;
    exchangeBRL += compoundedUSD * (rate - entryRate);
  }
  return { balance: round(usdBalance * rate), contributed, yield: round(yieldBRL), exchange: round(exchangeBRL), usdBalance: round(usdBalance), usdContributed: round(usdContributed), usdYield: round(usdBalance - usdContributed), usdExchange: round(exchangeBRL / rate) };
}

export function bucketBalance(bucket, records, extras, withdrawals, asOf = new Date()) {
  const contribs = bucketContributions(bucket.id, records, extras, withdrawals);
  return bucket.rate_type === 'fed' ? dollarRealBalance(bucket, contribs, bucket.current_dollar_rate || 1, asOf) : realBalance(bucket, contribs, asOf);
}

// Separa os buckets da tela inicial em visíveis e ocultos. Um bucket fica oculto
// quando o saldo é zero, a não ser que você esteja distribuindo um aporte (total > 0)
// e ele tenha percentual — aí ele aparece para você poder marcar o aporte nele.
export function splitZeroBuckets(items = [], total = 0) {
  const isZero = ({ bal }) => Math.abs(bal?.balance || 0) < 0.005;
  const keep = item => !isZero(item) || (total > 0 && Number(item.b.percentage) > 0);
  return { visible: items.filter(keep), hidden: items.filter(i => !keep(i)) };
}

// ---------- Projeção ----------
export const monthlyEquivalent = annual => (Math.pow(1 + (Number(annual) || 0) / 100, 1 / 12) - 1) * 100;
// Taxa REAL: quanto o dinheiro cresce acima da inflação (equação de Fisher).
// (1 + nominal) / (1 + inflação) − 1. Ex.: 14% de juros com 4,5% de inflação = 9,09% reais, não 9,5%.
export const realRate = (nominal, inflation = 0) => ((1 + (Number(nominal) || 0) / 100) / (1 + (Number(inflation) || 0) / 100) - 1) * 100;
// Traz um valor do futuro para o poder de compra de hoje.
export const toTodayMoney = (value, inflation, months) => value / Math.pow(1 + (Number(inflation) || 0) / 100, months / 12);

// opções: start = saldo inicial por bucket ({ id: valor }), rates = taxa anual por bucket que
// substitui a taxa cadastrada (ex.: retorno esperado de FIIs e ações), inflation = % a.a. para
// calcular também o total no poder de compra de hoje.
export function projectionData(buckets, monthly, months = 12, { start = {}, rates = {}, inflation = 0 } = {}) {
  const balances = Object.fromEntries(buckets.map(bucket => [bucket.id, Number(start[bucket.id]) || 0]));
  const dollarRate = buckets.find(b => b.rate_type === 'fed')?.current_dollar_rate || 1;
  return Array.from({ length: months }, (_, index) => {
    const row = { month: `Mês ${index + 1}` };
    buckets.forEach(bucket => {
      const mRate = monthlyEquivalent(rates[bucket.id] ?? effectiveRate(bucket));
      balances[bucket.id] = (balances[bucket.id] + monthly * bucket.percentage / 100) * (1 + mRate / 100);
      row[bucket.name] = round(balances[bucket.id]);
      if (bucket.rate_type === 'fed') row[`${bucket.name} (USD)`] = round(balances[bucket.id] / dollarRate);
    });
    row.Total = round(Object.values(balances).reduce((sum, value) => sum + value, 0));
    if (inflation) row['Total em valor de hoje'] = round(toTodayMoney(row.Total, inflation, index + 1));
    return row;
  });
}

// ---------- Ações e FIIs ----------
const signedAmount = c => (c.kind === 'sell' ? -1 : 1) * (Number(c.amount) || 0);
const signedQuantity = c => (c.kind === 'sell' ? -1 : 1) * (Number(c.quantity) || 0);

export function stockNetAmount(stock = {}) {
  return round((stock.contributions || []).reduce((sum, c) => sum + signedAmount(c), 0));
}
export function stockTotal(stocks = []) {
  return round(stocks.reduce((sum, s) => sum + stockNetAmount(s), 0));
}
export function stockTotalAsOf(stocks = [], asOf = new Date()) {
  const d = toDate(asOf);
  return round(stocks.reduce((sum, s) => sum + (s.contributions || []).filter(c => toDate(c.date) <= d).reduce((a, c) => a + signedAmount(c), 0), 0));
}
export function stockMonthTotal(stocks = [], month) {
  return round(stocks.reduce((sum, s) => sum + (s.contributions || []).filter(c => (c.date || '').slice(0, 7) === month).reduce((a, c) => a + signedAmount(c), 0), 0));
}
// Custo da posição atual pelo preço médio (vendas tiram custo proporcional).
export function stockInvested(stock) {
  const items = [...(stock.contributions || [])].sort(byDate('date'));
  let quantity = 0, cost = 0;
  for (const c of items) {
    const qty = Number(c.quantity) || 0, amount = Number(c.amount) || 0;
    if (c.kind === 'sell') {
      const sold = Math.min(qty, quantity);
      cost -= quantity > 0 ? (cost / quantity) * sold : 0;
      quantity -= sold;
    } else { quantity += qty; cost += amount; }
  }
  return round(Math.max(0, cost));
}
export function stockQuantity(stock) {
  return round((stock.contributions || []).reduce((s, c) => s + signedQuantity(c), 0));
}
export function stockAveragePrice(stock) {
  const q = stockQuantity(stock);
  return q > 0 ? round(stockInvested(stock) / q) : 0;
}
export function stockDividendsReceived(stock, dividendEvents = []) {
  const contribs = stock.contributions || [];
  return round(dividendEvents.reduce((sum, ev) => {
    const d = toDate(ev.date);
    const held = contribs.filter(c => c.quantity && toDate(c.date) <= d).reduce((a, c) => a + signedQuantity(c), 0);
    return sum + Math.max(0, held) * (Number(ev.amount) || 0);
  }, 0));
}
export function stockMarketValue(stock, quote) {
  const q = stockQuantity(stock);
  return quote?.price != null && q > 0 ? round(q * quote.price) : null;
}

// ---------- Patrimônio ----------
// Igual ao original: ações entram pelo valor aportado (não pelo valor de mercado).
export function totalBalance(buckets, records, extras, withdrawals, asOf = new Date(), stocks = []) {
  const bucketTotal = buckets.filter(b => b.kind !== 'stocks').reduce((sum, b) => sum + bucketBalance(b, records, extras, withdrawals, asOf).balance, 0);
  return bucketTotal + stockTotalAsOf(stocks, asOf);
}
// Taxa média da carteira, pesada pelo % de cada bucket. `rates` substitui a taxa de algum bucket.
export function weightedAverageRate(buckets = [], rates = {}) {
  const totalPct = buckets.reduce((s, b) => s + Number(b.percentage || 0), 0);
  if (!totalPct) return 0;
  return buckets.reduce((s, b) => s + (rates[b.id] ?? effectiveRate(b)) * Number(b.percentage || 0), 0) / totalPct;
}
export function goalProjection(currentBalance, monthlyContribution, annualRate, target) {
  if (target <= 0 || currentBalance >= target) return 0;
  const mRate = monthlyEquivalent(annualRate) / 100;
  let balance = currentBalance, months = 0;
  while (balance < target && months < 600) {
    balance = balance * (1 + mRate) + (monthlyContribution || 0);
    months++;
  }
  return months >= 600 ? null : months;
}
// Metas de patrimônio: em quantos meses cada valor é atingido.
// months = valor "de nota" (nominal). monthsReal = valor com o poder de compra de hoje: usa a taxa
// real e supõe que o aporte sobe junto com a inflação (assim ele vale o mesmo todo ano).
export const MILESTONES = [10000, 100000, 500000, 1000000];
export function milestones(currentBalance, monthly, annualRate, inflation = 0, targets = MILESTONES) {
  const real = realRate(annualRate, inflation);
  return targets.map(target => ({ target, months: goalProjection(currentBalance, monthly, annualRate, target), monthsReal: goalProjection(currentBalance, monthly, real, target) }));
}

export function patrimonyEvolution(buckets, records, extras, withdrawals, stocks = []) {
  const allDates = [
    ...records.flatMap(r => (r.allocations || []).map(() => `${r.month}-01`)),
    ...extras.map(e => e.date),
    ...withdrawals.map(w => w.date),
    ...stocks.flatMap(s => (s.contributions || []).map(c => c.date))
  ].filter(Boolean).sort();
  if (!allDates.length) return [];
  const start = toDate(`${allDates[0].slice(0, 7)}-01`);
  const now = new Date();
  const points = [];
  let d = new Date(start);
  while (d <= now) {
    const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
    const asOf = monthEnd > now ? now : monthEnd;
    points.push({ month: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, balance: round(totalBalance(buckets, records, extras, withdrawals, asOf, stocks)) });
    d = new Date(d.getFullYear(), d.getMonth() + 1, 1);
  }
  return points;
}
