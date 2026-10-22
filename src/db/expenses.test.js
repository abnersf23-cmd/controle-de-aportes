import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from './database';
import { duplicateExpenses } from './expenses';

const source = { income_15: 1000, income_30: 800, items: [{ id: 'a', name: 'Internet', vale: 100, pagamento: 0 }, { id: 'b', name: 'Faculdade', vale: 0, pagamento: 200 }, { id: 'c', name: '', vale: 0, pagamento: 0 }] };

describe('duplicar mês', () => {
  beforeEach(() => db.expenses.clear());
  it('cria os meses de destino com as contas (sem linhas vazias)', async () => {
    await duplicateExpenses(source, ['2026-11', '2026-12']);
    const nov = await db.expenses.where('month').equals('2026-11').first();
    expect(nov.items.map(i => i.name)).toEqual(['Internet', 'Faculdade']);
    expect(nov.income_15).toBe(1000);
    expect(await db.expenses.count()).toBe(2);
  });
  it('juntar mantém o que existe e adiciona só o que falta', async () => {
    await db.expenses.add({ id: 'x', month: '2026-11', income_15: 5, income_30: 6, items: [{ id: 'z', name: 'internet', vale: 120, pagamento: 0 }, { id: 'y', name: 'Mãe', vale: 50, pagamento: 0 }] });
    await duplicateExpenses(source, ['2026-11'], { incomes: false, mode: 'merge' });
    const nov = await db.expenses.get('x');
    expect(nov.items.map(i => i.name)).toEqual(['internet', 'Mãe', 'Faculdade']);
    expect(nov.items[0].vale).toBe(120);
    expect(nov.income_15).toBe(5);
  });
  it('substituir deixa igual à origem', async () => {
    await db.expenses.add({ id: 'x', month: '2026-11', items: [{ id: 'y', name: 'Mãe', vale: 50, pagamento: 0 }] });
    await duplicateExpenses(source, ['2026-11'], { mode: 'replace' });
    expect((await db.expenses.get('x')).items.map(i => i.name)).toEqual(['Internet', 'Faculdade']);
  });
});
