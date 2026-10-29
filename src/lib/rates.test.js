import { describe, expect, it } from 'vitest';
import { parseSgs, rateSuggestions, ratesStale } from './rates';

describe('taxas do Banco Central', () => {
  it('lê a resposta da API SGS (último ponto, data no formato do app)', () => {
    expect(parseSgs([{ data: '01/10/2026', valor: '14.90' }, { data: '28/10/2026', valor: '15.00' }])).toEqual({ value: 15, date: '2026-10-28' });
    expect(parseSgs([{ data: '30/09/2026', valor: '4,56' }])).toEqual({ value: 4.56, date: '2026-09-30' });
  });
  it('recusa resposta estranha em vez de gravar número errado', () => {
    expect(() => parseSgs([])).toThrow();
    expect(() => parseSgs({ erro: 'x' })).toThrow();
    expect(() => parseSgs([{ data: '28/10/2026', valor: '' }])).toThrow();
  });
  it('sugere atualizar só os buckets Selic/CDI com taxa diferente', () => {
    const buckets = [
      { id: '1', rate_type: 'selic', base_rate: 14.25 },
      { id: '2', rate_type: 'cdi', base_rate: 14.9 },
      { id: '3', rate_type: 'custom', base_rate: 5 },
      { id: '4', rate_type: 'fed', base_rate: 3.75 }
    ];
    const rates = { selic: { value: 15, date: '2026-10-28' }, cdi: { value: 14.9, date: '2026-10-27' } };
    const s = rateSuggestions(buckets, rates);
    expect(s).toHaveLength(1);
    expect(s[0]).toMatchObject({ from: 14.25, to: 15, label: 'Selic (meta)' });
  });
  it('busca de novo depois de 12 horas', () => {
    expect(ratesStale(null)).toBe(true);
    expect(ratesStale({ fetched_at: 0 }, 13 * 3600 * 1000)).toBe(true);
    expect(ratesStale({ fetched_at: 0 }, 3600 * 1000)).toBe(false);
  });
});
