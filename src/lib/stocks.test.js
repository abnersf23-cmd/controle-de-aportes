import { describe, expect, it } from 'vitest';
import { dividendYield } from './stocks';

const mxrf = { contributions: [{ kind: 'buy', date: '2025-06-10', quantity: 100, amount: 1000 }] };
// Um provento de R$ 0,10 por mês, de dez/2024 a fev/2026 (só os 12 últimos contam em 20/02/2026).
const monthly = Array.from({ length: 15 }, (_, i) => ({ date: new Date(2024, 11 + i, 15).toISOString().slice(0, 10), amount: 0.1 }));

describe('dividend yield por ativo', () => {
  it('DY usa a cotação de hoje e YoC usa o preço médio', () => {
    // 12 proventos de R$ 0,10 nos últimos 12 meses = R$ 1,20 por cota
    const r = dividendYield(mxrf, { price: 9.6, dividends: monthly }, new Date(2026, 1, 20));
    expect(r.perShare12m).toBe(1.2);
    expect(r.dy).toBe(12.5);
    expect(r.yoc).toBe(12);
    expect(r.monthlyNow).toBe(10);
  });
  it('sem proventos ou sem cotação devolve vazio em vez de 0%', () => {
    expect(dividendYield(mxrf, { price: 9.6, dividends: [] }).dy).toBeNull();
    expect(dividendYield(mxrf, null).yoc).toBeNull();
  });
});
