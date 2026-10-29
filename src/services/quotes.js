// Cotações de ações/FIIs (Yahoo Finance) e do dólar (AwesomeAPI).
// As chamadas passam pelo proxy do Vite (vite.config.js). O que sai do computador
// é só o ticker ou o par USD-BRL: nenhum valor seu é enviado.
import { db } from '@/db/database';
import { toDateKey } from '@/lib/dates';

const cleanTicker = t =>
  String(t)
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');

async function fetchOne(ticker) {
  try {
    const res = await fetch(`/api/yahoo/v8/finance/chart/${ticker}.SA?range=2y&interval=1mo&events=div`);
    if (!res.ok) return { ticker, error: `HTTP ${res.status}` };
    const json = await res.json();
    const result = json?.chart?.result?.[0];
    if (!result) return { ticker, error: 'sem dados' };
    const meta = result.meta || {};
    const dividends = Object.values(result.events?.dividends || {})
      .map(d => ({ date: toDateKey(new Date(Number(d.date) * 1000)), amount: Number(d.amount) || 0 }))
      .sort((a, b) => a.date.localeCompare(b.date));
    return { ticker, price: Number(meta.regularMarketPrice) || null, previousClose: Number(meta.chartPreviousClose || meta.previousClose) || null, dividends };
  } catch (e) {
    return { ticker, error: String(e?.message || e) };
  }
}

// Busca várias cotações. As que falharem mantêm o último valor salvo (modo offline).
export async function fetchQuotes(tickers) {
  const list = [...new Set(tickers.map(cleanTicker))].filter(Boolean).slice(0, 40);
  const results = await Promise.all(list.map(fetchOne));
  const cached = (await db.settings.get('quotes'))?.value || {};
  const next = { ...cached };
  let ok = 0;
  for (const q of results)
    if (!q.error && q.price != null) {
      next[q.ticker] = { ...q, fetched_at: Date.now() };
      ok++;
    }
  await db.settings.put({ key: 'quotes', value: next });
  if (ok) await db.settings.put({ key: 'quotesUpdatedAt', value: Date.now() });
  return { quotes: next, ok, failed: results.filter(q => q.error).map(q => q.ticker) };
}

// Cotação comercial do dólar (compra) — https://docs.awesomeapi.com.br
export async function fetchDollarRate() {
  const res = await fetch('/api/dolar');
  if (!res.ok) throw new Error(`Não foi possível buscar o dólar (HTTP ${res.status}).`);
  const json = await res.json();
  const rate = Number(json?.USDBRL?.bid);
  if (!rate) throw new Error('Resposta inesperada da cotação do dólar.');
  return Math.round(rate * 100) / 100;
}
