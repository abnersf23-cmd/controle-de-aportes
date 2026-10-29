import { describe, expect, it } from 'vitest';
import { sheetTotals } from './sheet';
import { searchItems } from './search';

describe('totais da planilha de gastos', () => {
  it('soma entradas, contas, o que falta pagar e o que sobra', () => {
    const t = sheetTotals({ income_15: '1000', income_30: 2000, items: [
      { vale: 300, pagamento: 0, paid_15: true },
      { vale: '100', pagamento: 900 }
    ] });
    expect(t).toMatchObject({ income: 3000, bills15: 400, bills30: 900, bills: 1300, left15: 600, left30: 1100, leftover: 1700, open15: 100, open30: 900, paid: 300, committed: 43 });
  });
  it('sem entradas, o % comprometido fica vazio', () => {
    expect(sheetTotals({ items: [] }).committed).toBeNull();
  });
});

describe('busca rápida (Ctrl+K)', () => {
  const items = [
    { group: 'Abas', label: 'Gastos mensais' },
    { group: 'Abas', label: 'Projeção', keywords: 'futuro crescimento' },
    { group: 'Simuladores', label: 'Aposentadoria' },
    { group: 'Contas', label: 'Mãe', hint: 'Gastos mensais' }
  ];
  it('ignora acento e maiúscula', () => {
    expect(searchItems(items, 'MAE').map(i => i.label)).toEqual(['Mãe']);
    expect(searchItems(items, 'projecao')[0].label).toBe('Projeção');
  });
  it('acha por palavra-chave e põe quem começa com o texto primeiro', () => {
    expect(searchItems(items, 'futuro')[0].label).toBe('Projeção');
    expect(searchItems(items, 'gastos').map(i => i.label)).toEqual(['Gastos mensais', 'Mãe']);
  });
  it('sem texto, mostra as abas', () => {
    expect(searchItems(items, '')).toHaveLength(2);
  });
});
