import { describe, expect, it } from 'vitest';
import { budgetStatus, categoryOf, guessCategory, learnedCategories, totalsByCategory } from './categories';

describe('categorias', () => {
  it('sugere pela palavra-chave, sem ligar para acento ou maiúscula', () => {
    expect(guessCategory('MÃE')).toBe('familia');
    expect(guessCategory('RAÇÃO')).toBe('pet');
    expect(guessCategory('SUPLEMENTAÇÃO')).toBe('saude');
    expect(guessCategory('INTERNET DESKTOP')).toBe('assinaturas');
    expect(guessCategory('PAN')).toBe('dividas');
    expect(guessCategory('Panificadora')).toBeNull();
    expect(guessCategory('Lucas')).toBeNull();
  });
  it('aprende a escolha mais recente pelo nome e ela vale nos outros meses', () => {
    const records = [
      { month: '2026-11', items: [{ name: 'Lucas', category: 'devolucoes' }] },
      { month: '2026-10', items: [{ name: 'lucas', category: 'outros' }] }
    ];
    const learned = learnedCategories(records);
    expect(categoryOf({ name: 'LUCAS' }, learned)).toBe('devolucoes');
    expect(categoryOf({ name: 'Lucas', category: 'familia' }, learned)).toBe('familia');
    expect(categoryOf({ name: 'Algo novo' }, learned)).toBe('outros');
  });
  it('soma por categoria e ordena do maior para o menor', () => {
    const out = totalsByCategory([{ name: 'Mãe', vale: 50, pagamento: 110 }, { name: 'Pai', vale: 110, pagamento: 0 }, { name: 'Ração', vale: 0, pagamento: 108 }, { name: 'Vazio', vale: 0, pagamento: 0 }]);
    expect(out.map(c => [c.id, c.value])).toEqual([['familia', 270], ['pet', 108]]);
    expect(Math.round(out[0].pct)).toBe(71);
  });
  it('orçamento: avisa a partir de 80% e quando passa do limite', () => {
    const totals = [{ id: 'assinaturas', value: 160 }, { id: 'pet', value: 80 }, { id: 'estudos', value: 10 }, { id: 'outros', value: 50 }];
    const st = budgetStatus(totals, { assinaturas: 150, pet: 100, estudos: 100, saude: 200 });
    const by = id => st.find(c => c.id === id);
    expect(by('assinaturas')).toMatchObject({ level: 'over', left: -10 });
    expect(by('pet').level).toBe('warn');
    expect(by('estudos').level).toBe('ok');
    expect(by('saude')).toMatchObject({ value: 0, level: 'ok' });
    expect(by('outros').level).toBeNull();
    expect(st[0].id).toBe('assinaturas');
  });
});
