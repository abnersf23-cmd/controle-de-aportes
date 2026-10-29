// Ponte entre o banco local e as telas.
// useLiveQuery "observa" o banco: quando algo é gravado, as telas atualizam sozinhas,
// sem precisar recarregar os dados manualmente como no app original.
import { useCallback, useEffect, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, newId, stamp } from '@/db/database';
import { colors, round, effectiveRate, rateHistory, stockQuantity, bucketCategory, rebalanceForAdd, rebalanceForDelete, rebalanceForEdit } from '@/lib/finance';
import { monthKey, today } from '@/lib/dates';
import { fetchQuotes } from '@/services/quotes';

const byDateDesc = (a, b) => String(b.date).localeCompare(String(a.date));

export default function useFinanceData() {
  const buckets = useLiveQuery(() => db.buckets.orderBy('created_date').toArray(), []);
  const records = useLiveQuery(() => db.records.orderBy('month').reverse().toArray(), []);
  const extras = useLiveQuery(async () => (await db.extras.toArray()).sort(byDateDesc), []);
  const withdrawals = useLiveQuery(async () => (await db.withdrawals.toArray()).sort(byDateDesc), []);
  const goals = useLiveQuery(() => db.goals.toArray(), []);
  const stocks = useLiveQuery(() => db.stocks.orderBy('ticker').toArray(), []);
  const quotes = useLiveQuery(async () => (await db.settings.get('quotes'))?.value || {}, []);
  const quotesUpdatedAt = useLiveQuery(async () => (await db.settings.get('quotesUpdatedAt'))?.value || null, []);
  const [quotesLoading, setQuotesLoading] = useState(false);
  const lastQuotesAt = useRef(0);

  const loading = [buckets, records, extras, withdrawals, goals, stocks, quotes].some(x => x === undefined);

  // ---------- Cotações automáticas: ao abrir, a cada 5 min e ao voltar para a aba ----------
  const refreshQuotes = useCallback(async () => {
    const tickers = (await db.stocks.toArray()).map(s => s.ticker);
    if (!tickers.length) return null;
    setQuotesLoading(true);
    try {
      const res = await fetchQuotes(tickers);
      lastQuotesAt.current = Date.now();
      return res;
    } finally {
      setQuotesLoading(false);
    }
  }, []);
  const tickersKey = (stocks || []).map(s => s.ticker).join(',');
  useEffect(() => {
    if (!tickersKey) return;
    refreshQuotes();
    const id = setInterval(refreshQuotes, 5 * 60 * 1000);
    const onVisible = () => {
      if (document.visibilityState === 'visible' && Date.now() - lastQuotesAt.current > 2 * 60 * 1000) refreshQuotes();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [tickersKey, refreshQuotes]);

  // ---------- Buckets ----------
  const getBuckets = () => db.buckets.orderBy('created_date').toArray();
  const putPercentages = list => Promise.all(list.map(b => db.buckets.update(b.id, { percentage: b.percentage })));

  const addBucket = data =>
    db.transaction('rw', db.buckets, async () => {
      const all = await getBuckets();
      const adjusted = rebalanceForAdd(all, Number(data.percentage));
      await putPercentages(adjusted.filter(b => !b.protected));
      const start = data.start_date || today();
      const payload = {
        id: newId(),
        created_date: stamp(),
        name: data.name,
        category: data.category || bucketCategory(data.name),
        icon: data.icon,
        kind: 'normal',
        color: data.color || colors[all.length % colors.length],
        percentage: Number(data.percentage),
        protected: false,
        rate_type: data.rate_type || 'custom',
        base_rate: Number(data.base_rate || 0),
        management_fee: Number(data.management_fee ?? 0.4),
        cdi_percentage: Number(data.cdi_percentage ?? 100),
        rate_updated_date: today()
      };
      payload.rate_history = [{ rate: effectiveRate(payload), start_date: start }];
      if (payload.rate_type === 'fed')
        Object.assign(payload, {
          current_dollar_rate: Number(data.current_dollar_rate) || 5.4,
          dollar_rate_updated_date: today(),
          last_dollar_rate: Number(data.current_dollar_rate) || 5.4
        });
      await db.buckets.add(payload);
    });

  const updateBucket = (id, data) =>
    db.transaction('rw', db.buckets, async () => {
      const all = await getBuckets();
      const current = all.find(x => x.id === id);
      const out = { ...data };
      if (data.percentage !== undefined && round(Number(data.percentage)) !== round(Number(current.percentage))) {
        await putPercentages(rebalanceForEdit(all, id, round(Number(data.percentage))));
        out.percentage = round(Number(data.percentage));
      }
      if (data.rate_type || data.base_rate !== undefined || data.management_fee !== undefined || data.cdi_percentage !== undefined) {
        const eff = effectiveRate({ ...current, ...data });
        const history = rateHistory(current);
        const last = history[history.length - 1];
        out.rate_history = [...history.slice(0, -1), { ...last, rate: eff }];
        if (data.base_rate !== undefined && Number(data.base_rate) !== Number(current.base_rate)) out.rate_updated_date = today();
      }
      await db.buckets.update(id, out);
    });

  const removeBucket = bucket =>
    db.transaction('rw', db.buckets, async () => {
      if (bucket.protected) throw new Error('Defina outro bucket como protegido antes de excluir este.');
      const adjusted = rebalanceForDelete(await getBuckets(), bucket);
      await putPercentages(adjusted.filter(b => !b.protected));
      await db.buckets.delete(bucket.id);
    });

  const setProtected = async id => {
    const all = await getBuckets();
    await Promise.all(all.map(b => db.buckets.update(b.id, { protected: b.id === id })));
  };
  const savePercentages = async values => {
    const all = await getBuckets();
    await Promise.all(all.map(b => db.buckets.update(b.id, { percentage: round(Number(values[b.id])) })));
  };

  // Nova taxa a partir de uma data: entra no histórico, então o passado continua com a taxa antiga.
  const updateRate = async (id, { base_rate, date }) => {
    const current = await db.buckets.get(id);
    const eff = effectiveRate({ ...current, base_rate: Number(base_rate) });
    const start = date || today();
    const history = [...rateHistory(current).filter(h => h.start_date !== start), { rate: eff, start_date: start }].sort((a, b) =>
      a.start_date.localeCompare(b.start_date)
    );
    await db.buckets.update(id, { base_rate: Number(base_rate), rate_history: history, rate_updated_date: today() });
  };
  const updateDollarRate = (id, rate) => db.buckets.update(id, { current_dollar_rate: Number(rate), dollar_rate_updated_date: today() });

  // ---------- Aporte mensal ----------
  const mark = async (bucket, total, dollarRate) => {
    if (!total) throw new Error('Informe quanto sobrou neste mês.');
    const month = monthKey();
    const item = {
      bucket_id: bucket.id,
      bucket_name: bucket.name,
      color: bucket.color,
      percentage: bucket.percentage,
      amount: round((total * bucket.percentage) / 100)
    };
    if (bucket.rate_type === 'fed' && dollarRate) {
      item.dollar_rate = Number(dollarRate);
      await db.buckets.update(bucket.id, { last_dollar_rate: Number(dollarRate) });
    }
    const current = await db.records.where('month').equals(month).first();
    if (current)
      await db.records.update(current.id, { planned_total: total, allocations: [...current.allocations.filter(a => a.bucket_id !== bucket.id), item] });
    else await db.records.add({ id: newId(), created_date: stamp(), month, planned_total: total, allocations: [item] });
  };
  const unmark = async bucketId => {
    const current = await db.records.where('month').equals(monthKey()).first();
    if (!current) return;
    const allocations = current.allocations.filter(a => a.bucket_id !== bucketId);
    if (allocations.length) await db.records.update(current.id, { allocations });
    else await db.records.delete(current.id);
  };

  // ---------- Aportes avulsos e saques ----------
  const addExtraContribution = async data => {
    const bucket = await db.buckets.get(data.bucket_id);
    if (!bucket) throw new Error('Selecione um bucket.');
    const payload = {
      id: newId(),
      created_date: stamp(),
      bucket_id: bucket.id,
      bucket_name: bucket.name,
      amount: round(Number(data.amount)),
      date: data.date,
      note: data.note || ''
    };
    if (bucket.rate_type === 'fed' && data.dollar_rate) {
      payload.dollar_rate = Number(data.dollar_rate);
      await db.buckets.update(bucket.id, { last_dollar_rate: Number(data.dollar_rate) });
    }
    await db.extras.add(payload);
  };
  const deleteExtraContribution = id => db.extras.delete(id);

  const addWithdrawal = async data => {
    const bucket = await db.buckets.get(data.bucket_id);
    if (!bucket) throw new Error('Selecione um bucket.');
    const payload = {
      id: newId(),
      created_date: stamp(),
      bucket_id: bucket.id,
      bucket_name: bucket.name,
      amount: round(Number(data.amount)),
      date: data.date,
      type: data.type || 'gasto',
      category: data.category || 'outros',
      note: data.note || ''
    };
    if (bucket.rate_type === 'fed' && data.dollar_rate) payload.dollar_rate = Number(data.dollar_rate);
    await db.withdrawals.add(payload);
  };
  const deleteWithdrawal = id => db.withdrawals.delete(id);
  const restore = (table, row) => db[table].put(row); // usado pelo "Desfazer"

  // ---------- Meta ----------
  const saveGoal = async amount => {
    const first = (await db.goals.toArray())[0];
    if (first) await db.goals.update(first.id, { target_amount: Number(amount) });
    else await db.goals.add({ id: newId(), name: 'Meta de patrimônio', target_amount: Number(amount) });
  };

  // ---------- Ações e FIIs ----------
  const addTrade = async (stockId, item) => {
    const stock = await db.stocks.get(stockId);
    if (!stock) throw new Error('Selecione um ativo.');
    await db.stocks.update(stockId, { contributions: [...(stock.contributions || []), { id: newId(), ...item }] });
  };
  const addStockContribution = data => {
    if (!Number(data.quantity)) throw new Error('Informe a quantidade.');
    return addTrade(data.stock_id, {
      kind: 'buy',
      amount: round(Number(data.amount)),
      quantity: Number(data.quantity),
      date: data.date,
      note: data.note || ''
    });
  };
  const sellStock = async data => {
    const stock = await db.stocks.get(data.stock_id);
    const quantity = Number(data.quantity) || 0;
    const available = stockQuantity(stock);
    if (quantity <= 0) throw new Error('Informe quantas cotas foram vendidas.');
    if (quantity > available) throw new Error(`Você tem apenas ${available.toLocaleString('pt-BR')} cotas desse ativo.`);
    await addTrade(data.stock_id, { kind: 'sell', amount: round(Number(data.amount)), quantity, date: data.date, note: data.note || 'Venda' });
  };
  const deleteStockContribution = async (stockId, contributionId) => {
    const stock = await db.stocks.get(stockId);
    if (stock) await db.stocks.update(stockId, { contributions: (stock.contributions || []).filter(c => c.id !== contributionId) });
  };
  const addStock = async data => {
    const ticker = String(data.ticker || '')
      .trim()
      .toUpperCase();
    if (!ticker) throw new Error('Informe o ticker do ativo.');
    if (await db.stocks.where('ticker').equals(ticker).count()) throw new Error('Este ativo já está na lista.');
    const palette = ['#3B82F6', '#F59E0B', '#8B5CF6', '#EC4899', '#10B981', '#06B6D4', '#EF4444', '#84CC16', '#F97316', '#6366F1'];
    const count = await db.stocks.count();
    await db.stocks.add({
      id: newId(),
      created_date: stamp(),
      ticker,
      name: data.name || '',
      type: data.type || 'acao',
      color: palette[count % palette.length],
      dividend_months: (data.dividend_months || []).map(Number).sort((a, b) => a - b),
      contributions: []
    });
  };
  const updateStock = (id, data) => db.stocks.update(id, data);
  const removeStock = async stock => {
    if ((stock.contributions || []).length) throw new Error('Exclua as operações deste ativo antes de removê-lo.');
    await db.stocks.delete(stock.id);
  };

  return {
    loading,
    buckets: buckets || [],
    records: records || [],
    extras: extras || [],
    withdrawals: withdrawals || [],
    goals: goals || [],
    stocks: stocks || [],
    quotes: quotes || {},
    quotesLoading,
    quotesUpdatedAt,
    refreshQuotes,
    addBucket,
    updateBucket,
    removeBucket,
    setProtected,
    savePercentages,
    updateRate,
    updateDollarRate,
    mark,
    unmark,
    addExtraContribution,
    deleteExtraContribution,
    addWithdrawal,
    deleteWithdrawal,
    restore,
    saveGoal,
    addStockContribution,
    sellStock,
    deleteStockContribution,
    addStock,
    updateStock,
    removeStock
  };
}
