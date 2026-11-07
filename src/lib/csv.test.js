import { describe, expect, it } from 'vitest';
import { safeCell, toCsv } from './csv';

describe('CSV sem injeção de fórmula', () => {
  it('neutraliza texto que o Excel leria como fórmula', () => {
    expect(safeCell('=HYPERLINK("http://site.mau","clique")')).toBe('\'=HYPERLINK("http://site.mau","clique")');
    expect(safeCell('+cmd')).toBe("'+cmd");
    expect(safeCell('@SUM(A1)')).toBe("'@SUM(A1)");
    expect(safeCell('-2+3')).toBe("'-2+3");
  });
  it('não mexe em números nem em texto comum', () => {
    expect(safeCell(-12.5)).toBe(-12.5);
    expect(safeCell('-12,50')).toBe('-12,50');
    expect(safeCell('Mercado')).toBe('Mercado');
  });
  it('aplica a proteção no arquivo gerado', () => {
    const csv = toCsv(['Nome', 'Valor'], [['=1+1', 10]]);
    expect(csv).toContain("'=1+1;10");
  });
});
