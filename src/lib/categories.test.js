import { describe, expect, it } from 'vitest';
import { categoryOf, guessCategory, learnedCategories, totalsByCategory } from './categories';

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
});
