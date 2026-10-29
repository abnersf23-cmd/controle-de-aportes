import { useLiveQuery } from 'dexie-react-hooks';
import { db, newId, stamp } from '@/db/database';
import { duplicateExpenses, pinItem, setParcels, unpinItem, updatePinned } from '@/db/expenses';

// Planilha de gastos mensais (quinzena do dia 15 e do dia 30) e contas fixas.
export default function useExpenses() {
  const records = useLiveQuery(() => db.expenses.toArray(), []);
  const fixed = useLiveQuery(() => db.fixed.toArray(), []);
  const save = async (month, data) => {
    const existing = await db.expenses.where('month').equals(month).first();
    if (existing) await db.expenses.update(existing.id, data);
    else await db.expenses.add({ id: newId(), created_date: stamp(), month, ...data });
  };

  const duplicate = duplicateExpenses;
  return {
    records: records || [],
    fixed: fixed || [],
    loading: records === undefined || fixed === undefined,
    save,
    duplicate,
    pinItem,
    unpinItem,
    updatePinned,
    setParcels
  };
}
