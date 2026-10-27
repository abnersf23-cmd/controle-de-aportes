import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from './database';
import { applyFixed, duplicateExpenses, fixedEnd, parcelNumber, pinItem, setParcels, unpinItem, updatePinned } from './expenses';

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
  it('a cópia chega no mês novo como não paga', async () => {
    await duplicateExpenses({ items: [{ id: 'a', name: 'Internet', vale: 100, pagamento: 0, paid_15: true }] }, ['2026-11']);
    const [item] = (await db.expenses.where('month').equals('2026-11').first()).items;
    expect(item.paid_15).toBeUndefined();
    expect(item.id).not.toBe('a');
  });
  it('substituir deixa igual à origem', async () => {
    await db.expenses.add({ id: 'x', month: '2026-11', items: [{ id: 'y', name: 'Mãe', vale: 50, pagamento: 0 }] });
    await duplicateExpenses(source, ['2026-11'], { mode: 'replace' });
    expect((await db.expenses.get('x')).items.map(i => i.name)).toEqual(['Internet', 'Faculdade']);
  });
});

describe('contas fixas', () => {
  const celular = { id: 'f1', name: 'Celular', day: 30, value: 50, start: '2026-10' };
  beforeEach(async () => { await db.expenses.clear(); await db.fixed.clear(); });

  it('adiciona a linha no dia certo só a partir do mês de início', () => {
    expect(applyFixed([celular], '2026-09', null)).toBeNull();
    const out = applyFixed([celular], '2026-11', { items: [{ id: 'a', name: 'Internet', vale: 100, pagamento: 0 }] });
    expect(out.items.map(i => [i.name, i.vale, i.pagamento])).toEqual([['Internet', 100, 0], ['Celular', 0, 50]]);
    expect(out.fixed_applied).toEqual(['f1']);
  });
  it('não volta depois que você apaga a linha no mês, e não duplica nome igual', () => {
    expect(applyFixed([celular], '2026-11', { items: [], fixed_applied: ['f1'] })).toBeNull();
    const out = applyFixed([celular], '2026-11', { items: [{ id: 'a', name: 'celular', vale: 0, pagamento: 45 }] });
    expect(out.items).toHaveLength(1);
    expect(out.fixed_applied).toEqual(['f1']);
  });
  it('aceita o formato antigo (dia + valor)', () => {
    const out = applyFixed([{ id: 'old', name: 'NUCELL', day: 30, value: 50, start: '2026-10' }], '2026-12', { items: [] });
    expect(out.items[0]).toMatchObject({ vale: 0, pagamento: 50, fixed_id: 'old' });
  });
  it('fixar repete a linha nos meses seguintes, editar atualiza e tirar o pin remove dos seguintes', async () => {
    const nucell = { id: 'n', name: 'NUCELL', vale: 0, pagamento: 50 };
    await db.expenses.bulkAdd([{ id: 'set', month: '2026-09', items: [] }, { id: 'out', month: '2026-10', items: [nucell] }, { id: 'nov', month: '2026-11', items: [] }]);
    const fid = await pinItem('2026-10', nucell);
    expect((await db.expenses.get('set')).items).toEqual([]);
    expect((await db.expenses.get('out')).items[0].fixed_id).toBe(fid);
    expect((await db.expenses.get('nov')).items[0]).toMatchObject({ name: 'NUCELL', pagamento: 50, fixed_id: fid });
    expect(applyFixed(await db.fixed.toArray(), '2027-05', null).items[0].pagamento).toBe(50);

    await db.expenses.update('nov', { items: [{ ...(await db.expenses.get('nov')).items[0], paid_30: true }] });
    await updatePinned('2026-10', { ...nucell, fixed_id: fid, pagamento: 60 });
    expect((await db.expenses.get('nov')).items[0]).toMatchObject({ pagamento: 60, paid_30: true });
    expect((await db.fixed.get(fid)).pagamento).toBe(60);

    await unpinItem('2026-10', fid);
    expect((await db.expenses.get('out')).items[0].fixed_id).toBeUndefined();
    expect((await db.expenses.get('out')).items).toHaveLength(1);
    expect((await db.expenses.get('nov')).items).toEqual([]);
    expect(await db.fixed.count()).toBe(0);
  });
  it('não fixa linha sem nome ou sem valor', async () => {
    await expect(pinItem('2026-10', { id: 'a', name: '', vale: 0, pagamento: 50 })).rejects.toThrow();
    await expect(pinItem('2026-10', { id: 'a', name: 'X', vale: 0, pagamento: 0 })).rejects.toThrow();
  });
  it('parcelas: a conta para de aparecer depois da última', async () => {
    const pan = { id: 'p', name: 'PAN', vale: 0, pagamento: 96 };
    await db.expenses.bulkAdd([{ id: 'jan', month: '2027-01', items: [pan] }, { id: 'mar', month: '2027-03', items: [] }, { id: 'abr', month: '2027-04', items: [] }]);
    const fid = await pinItem('2027-01', pan);
    expect((await db.expenses.get('abr')).items).toHaveLength(1);
    await setParcels(fid, '2027-01', { parcels: 10, current: 8 }); // jan = 8/10 → termina em mar
    const f = await db.fixed.get(fid);
    expect(fixedEnd(f)).toBe('2027-03');
    expect(parcelNumber(f, '2027-03')).toBe(10);
    expect((await db.expenses.get('mar')).items).toHaveLength(1);
    expect((await db.expenses.get('abr')).items).toEqual([]);
    expect(applyFixed([f], '2027-05', null)).toBeNull();
    await setParcels(fid, '2027-01', { parcels: 0 });
    expect(fixedEnd(await db.fixed.get(fid))).toBeNull();
    await expect(setParcels(fid, '2027-01', { parcels: 3, current: 5 })).rejects.toThrow();
  });
});
