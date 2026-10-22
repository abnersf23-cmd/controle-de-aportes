import { db, newId, stamp } from './database';

const norm = s => String(s || '').trim().toLowerCase();

// Copia as contas de um mês para vários meses, como "duplicar aba" no Excel.
// mode 'merge': mantém o que já existe e só adiciona as contas que faltam (pelo nome).
// mode 'replace': o mês de destino fica igual ao de origem.
export async function duplicateExpenses(source, targets, { incomes = true, mode = 'merge' } = {}) {
  const items = (source.items || []).filter(i => String(i.name || '').trim());
  await db.transaction('rw', db.expenses, async () => {
    for (const month of targets) {
      const existing = await db.expenses.where('month').equals(month).first();
      const copies = list => list.map(i => ({ ...i, id: newId() }));
      let next;
      if (!existing || mode === 'replace') {
        next = { items: copies(items) };
      } else {
        const names = new Set((existing.items || []).map(i => norm(i.name)));
        next = { items: [...(existing.items || []).filter(i => String(i.name || '').trim()), ...copies(items.filter(i => !names.has(norm(i.name))))] };
      }
      if (incomes || !existing) {
        next.income_15 = incomes ? source.income_15 : existing?.income_15 ?? 0;
        next.income_30 = incomes ? source.income_30 : existing?.income_30 ?? 0;
      }
      if (existing) await db.expenses.update(existing.id, next);
      else await db.expenses.add({ id: newId(), created_date: stamp(), month, ...next });
    }
  });
}
