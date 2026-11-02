// Testes das categorias livres de saques e gastos. Rode com: npm test
import { describe, expect, it } from 'vitest';
import { DEFAULT_WITHDRAWAL_CATEGORIES, cleanCategory, matchCategory, withdrawalCategories } from './withdrawalCategories';

describe('categorias de saque', () => {
  it('sem saques, só as padrão', () => expect(withdrawalCategories([])).toEqual(DEFAULT_WITHDRAWAL_CATEGORIES));
  it('junta as criadas por você, mais usadas primeiro, sem repetir', () =>
    expect(withdrawalCategories([{ category: 'carro' }, { category: 'presente' }, { category: 'Carro ' }, { category: 'LAZER' }])).toEqual([
      ...DEFAULT_WITHDRAWAL_CATEGORIES,
      'carro',
      'presente'
    ]));
  it('limpa espaços e maiúsculas; vazio vira outros', () => {
    expect(cleanCategory('  Viagem   de férias ')).toBe('viagem de férias');
    expect(cleanCategory('   ')).toBe('outros');
  });
  it('reaproveita a categoria existente mesmo sem acento', () => {
    expect(matchCategory('Alimentacao', DEFAULT_WITHDRAWAL_CATEGORIES)).toBe('alimentação');
    expect(matchCategory('Pet', DEFAULT_WITHDRAWAL_CATEGORIES)).toBe('pet');
  });
});
