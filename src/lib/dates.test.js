// Testes do bug de fuso horário herdado do Base44.
// Rodam fingindo que o computador está no horário de Brasília (UTC-3).
process.env.TZ = 'America/Sao_Paulo';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { monthKey, today, toDateKey } from './dates';
import { toDate, totalBalance, realBalance, dateLabel } from './finance';

afterEach(() => vi.useRealTimers());

describe('data local (fuso de Brasília)', () => {
  it('às 22h do dia 31/10, "hoje" ainda é 31/10 e o mês ainda é outubro', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-01T01:30:00Z')); // = 31/10 22:30 em Brasília
    expect(today()).toBe('2026-10-31');
    expect(monthKey()).toBe('2026-10');
    // O jeito antigo (UTC) errava:
    expect(new Date().toISOString().slice(0, 7)).toBe('2026-11');
  });
  it('toDate("2026-10-01") é meia-noite LOCAL, não 21h do dia anterior', () => {
    const d = toDate('2026-10-01');
    expect([d.getFullYear(), d.getMonth(), d.getDate(), d.getHours()]).toEqual([2026, 9, 1, 0]);
    expect(toDateKey(d)).toBe('2026-10-01');
    expect(dateLabel('2026-10-01')).toBe('01/10/2026');
  });
  it('aporte de 1º de outubro NÃO entra no saldo de 30 de setembro', () => {
    const buckets = [{ id: 'b', rate_history: [{ rate: 0, start_date: '2026-09-01' }] }];
    const records = [{ month: '2026-10', allocations: [{ bucket_id: 'b', amount: 100 }] }];
    const fimDeSetembro = new Date(2026, 8, 30, 23, 59, 59);
    expect(totalBalance(buckets, records, [], [], fimDeSetembro)).toBe(0);
    expect(totalBalance(buckets, records, [], [], new Date(2026, 9, 1, 12))).toBe(100);
  });
  it('juros de um dia continuam contando 1 dia certinho', () => {
    const b = { rate_history: [{ rate: 36.5, start_date: '2026-10-01' }] };
    expect(realBalance(b, [{ date: '2026-10-01', amount: 1000 }], toDate('2026-10-02')).balance).toBe(1001);
  });
});
