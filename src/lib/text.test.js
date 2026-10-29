import { describe, expect, it } from 'vitest';
import { nameKey } from './text';

describe('nameKey', () => {
  it('ignora acento, maiúscula e espaços extras', () => {
    expect(nameKey('MÃE')).toBe(nameKey('Mae'));
    expect(nameKey('  Cartão   de crédito ')).toBe('cartao de credito');
    expect(nameKey(null)).toBe('');
  });
  it('nomes diferentes continuam diferentes', () => {
    expect(nameKey('Pai')).not.toBe(nameKey('Mãe'));
  });
});
