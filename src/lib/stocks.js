// Dividend yield (DY) e yield on cost (YoC) de cada FII/ação. Funções puras.
//
// - DY: proventos por cota dos últimos 12 meses ÷ cotação de hoje. Diz quanto o ativo paga
//   para quem compra hoje.
// - YoC: os mesmos proventos ÷ o SEU preço médio. Diz quanto ele paga sobre o que você pagou.
// Os proventos vêm da cotação do Yahoo (lista de { date, amount } por cota).
import { round, stockAveragePrice, stockDividendsReceived, stockQuantity, toDate } from './finance';

export function dividendYield(stock, quote, asOf = new Date()) {
  const end = toDate(asOf),
    start = new Date(end.getFullYear() - 1, end.getMonth(), end.getDate());
  const events = (quote?.dividends || []).filter(ev => {
    const d = toDate(ev.date);
    return d > start && d <= end;
  });
  const perShare = events.reduce((s, ev) => s + (Number(ev.amount) || 0), 0);
  const avg = stockAveragePrice(stock),
    qty = stockQuantity(stock);
  return {
    perShare12m: round(perShare * 10000) / 10000,
    dy: quote?.price > 0 && events.length ? round((perShare / quote.price) * 100) : null,
    yoc: avg > 0 && events.length ? round((perShare / avg) * 100) : null,
    received12m: stockDividendsReceived(stock, events),
    monthlyNow: qty > 0 && events.length ? round((perShare * qty) / 12) : null
  };
}
