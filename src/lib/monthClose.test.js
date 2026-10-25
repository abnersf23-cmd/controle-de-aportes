// Fechamento do mês em Gastos mensais, no horário de Brasília.
process.env.TZ = 'America/Sao_Paulo';
import { describe, expect, it } from 'vitest';
import { expenseSummary, isArchived, pendingReports, reportCsv, reportHtml } from './monthClose';

const set = { month: '2026-09', income_15: 1000, income_30: 2000, items: [{ name: 'Internet', vale: 100, pagamento: 0 }, { name: 'Aluguel', vale: 0, pagamento: 1500 }, { name: '', vale: 0, pagamento: 0 }] };
const out = { month: '2026-10', income_15: 1000, items: [{ name: 'Internet', vale: 100 }] };
const records = [set, out];
const at = (y, m, d, h = 9) => new Date(y, m - 1, d, h);

describe('relatório pendente', () => {
  it('em 1º de outubro, setembro (com dados) precisa de relatório; outubro não', () => {
    expect(pendingReports(records, {}, at(2026, 10, 1))).toEqual(['2026-09']);
  });
  it('depois de gerado, não gera de novo (não repete)', () => {
    expect(pendingReports(records, { '2026-09': { reportAt: 'x' } }, at(2026, 10, 1))).toEqual([]);
  });
  it('às 22h do dia 30/09 ainda é setembro: nada pendente', () => {
    expect(pendingReports(records, {}, new Date('2026-10-01T01:30:00Z'))).toEqual([]);
  });
  it('mês sem nenhuma conta nem entrada não gera relatório', () => {
    expect(pendingReports([{ month: '2026-09', items: [{ name: '' }] }], {}, at(2026, 10, 1))).toEqual([]);
  });
});

describe('ocultar o mês anterior', () => {
  const closed = { '2026-09': { reportAt: 'x' } };
  it('no dia 1 setembro ainda aparece, mesmo com relatório salvo', () => {
    expect(isArchived('2026-09', { records, closed, now: at(2026, 10, 1, 23) })).toBe(false);
  });
  it('no dia 2 setembro some', () => {
    expect(isArchived('2026-09', { records, closed, now: at(2026, 10, 2, 0) })).toBe(true);
  });
  it('se o app só abrir no dia 5, também some (com o relatório já salvo)', () => {
    expect(isArchived('2026-09', { records, closed, now: at(2026, 10, 5) })).toBe(true);
  });
  it('trava: com dados e SEM relatório, continua visível', () => {
    expect(isArchived('2026-09', { records, closed: {}, now: at(2026, 10, 5) })).toBe(false);
  });
  it('o mês atual e os próximos nunca somem', () => {
    expect(isArchived('2026-10', { records, closed, now: at(2026, 10, 5) })).toBe(false);
    expect(isArchived('2026-11', { records, closed, now: at(2026, 10, 5) })).toBe(false);
  });
  it('mês anterior vazio some no dia 2 (não há o que relatar)', () => {
    expect(isArchived('2026-09', { records: [], closed: {}, now: at(2026, 10, 2) })).toBe(true);
  });
});

describe('conteúdo do relatório', () => {
  it('resumo bate com a tela', () => {
    const s = expenseSummary(set);
    expect(s.items).toHaveLength(2);
    expect([s.totalVale, s.totalPag, s.total, s.income, s.resta15, s.resta30, s.resta, s.comprometido]).toEqual([100, 1500, 1600, 3000, 900, 500, 1400, 53]);
  });
  it('CSV com ";" e vírgula decimal, pronto para o Excel', () => {
    const lines = reportCsv(set).replace('﻿', '').split('\r\n');
    expect(lines[0]).toBe('Conta;Dia 15 (vale);Dia 30 (pagamento);Total');
    expect(lines).toContain('Aluguel;0,00;1500,00;1500,00');
    expect(lines).toContain('O que sobra;900,00;500,00;1400,00');
  });
  it('HTML escapa o nome da conta (não deixa injetar tags)', () => {
    const html = reportHtml({ month: '2026-09', items: [{ name: '<script>x</script>', vale: 1 }] });
    expect(html).toContain('&lt;script&gt;');
    expect(html).not.toContain('<script>');
    expect(html).toContain('Gastos de Setembro de 2026');
  });
});
