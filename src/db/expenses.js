import { db, newId, stamp } from './database';
import { addMonths } from '@/lib/dates';

const norm = s => String(s || '').trim().toLowerCase();

// Cópia de uma conta para outro mês: id novo e ainda não paga.
export const freshCopy = ({ paid_15, paid_30, ...item }) => ({ ...item, id: newId() });

// Copia as contas de um mês para vários meses, como "duplicar aba" no Excel.
// mode 'merge': mantém o que já existe e só adiciona as contas que faltam (pelo nome).
// mode 'replace': o mês de destino fica igual ao de origem.
export async function duplicateExpenses(source, targets, { incomes = true, mode = 'merge' } = {}) {
  const items = (source.items || []).filter(i => String(i.name || '').trim());
  await db.transaction('rw', db.expenses, async () => {
    for (const month of targets) {
      const existing = await db.expenses.where('month').equals(month).first();
      const copies = list => list.map(freshCopy);
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

// ---------- Contas fixas (pin) ----------
// Fixar (📌) uma linha cria uma conta fixa ({ name, vale, pagamento, start: 'AAAA-MM' })
// que vira uma linha em cada mês a partir de `start`. O mês guarda em `fixed_applied`
// quais contas fixas já recebeu: assim, se você apagar a linha num mês, ela não volta.

// Aceita também o formato antigo ({ day: 15 | 30, value }).
const fixedValues = f => ({ vale: Number(f.vale ?? (f.day === 15 ? f.value : 0)) || 0, pagamento: Number(f.pagamento ?? (f.day === 30 ? f.value : 0)) || 0 });
const toItem = f => ({ id: newId(), name: f.name, ...fixedValues(f), fixed_id: f.id });
const keepPaid = i => ({ ...(i.paid_15 ? { paid_15: true } : {}), ...(i.paid_30 ? { paid_30: true } : {}) });

// Parcelas: `first` é o mês da parcela 1 e `parcels` o total. Sem `parcels`, a conta não tem fim.
export const fixedEnd = f => (f?.parcels ? addMonths(f.first, f.parcels - 1) : null);
export const parcelNumber = (f, month) => {
  const [y1, m1] = f.first.split('-').map(Number), [y2, m2] = month.split('-').map(Number);
  return (y2 - y1) * 12 + (m2 - m1) + 1;
};
const activeIn = (f, month) => f.start <= month && (!f.parcels || month <= fixedEnd(f));

// Função pura: devolve o mês com as contas fixas que faltam, ou null se nada muda.
export function applyFixed(fixed, month, record) {
  const applied = record?.fixed_applied || [];
  const pending = fixed.filter(f => activeIn(f, month) && !applied.includes(f.id));
  if (!pending.length) return null;
  const items = record?.items || [];
  const names = new Set(items.map(i => norm(i.name)));
  // Se o mês já tem uma conta com o mesmo nome, só marca como aplicada (não duplica).
  const added = pending.filter(f => !names.has(norm(f.name))).map(toItem);
  return { ...record, items: [...items.filter(i => String(i.name || '').trim()), ...added], fixed_applied: [...applied, ...pending.map(f => f.id)] };
}

const later = month => db.expenses.where('month').above(month).toArray();

// Fixa a linha `item` do mês `month`: ela passa a se repetir de `month` em diante.
export async function pinItem(month, item) {
  const f = { id: newId(), created_date: stamp(), name: String(item.name || '').trim(), vale: Number(item.vale) || 0, pagamento: Number(item.pagamento) || 0, start: month };
  if (!f.name) throw new Error('Dê um nome para a conta antes de fixar.');
  if (!f.vale && !f.pagamento) throw new Error('Coloque o valor da conta antes de fixar.');
  await db.transaction('rw', db.fixed, db.expenses, async () => {
    await db.fixed.add(f);
    const cur = await db.expenses.where('month').equals(month).first();
    if (cur) await db.expenses.update(cur.id, { items: (cur.items || []).map(i => (i.id === item.id ? { ...i, fixed_id: f.id } : i)), fixed_applied: [...(cur.fixed_applied || []), f.id] });
    for (const r of await later(month)) {
      const next = applyFixed([f], r.month, r);
      if (next) await db.expenses.update(r.id, { items: next.items, fixed_applied: next.fixed_applied });
    }
  });
  return f.id;
}

// Linha fixada foi editada: o novo nome/valor vale para este mês e os seguintes.
export async function updatePinned(month, item) {
  const f = await db.fixed.get(item.fixed_id);
  if (!f) return;
  const next = { ...f, name: String(item.name || '').trim() || f.name, vale: Number(item.vale) || 0, pagamento: Number(item.pagamento) || 0 };
  const old = fixedValues(f);
  if (next.name === f.name && next.vale === old.vale && next.pagamento === old.pagamento && f.vale !== undefined) return;
  await db.transaction('rw', db.fixed, db.expenses, async () => {
    await db.fixed.put(next);
    for (const r of await later(month)) {
      if (!(r.items || []).some(i => i.fixed_id === f.id)) continue;
      await db.expenses.update(r.id, { items: r.items.map(i => (i.fixed_id === f.id ? { ...toItem(next), id: i.id, ...keepPaid(i) } : i)) });
    }
  });
}

// Tira o pin: a linha fica neste mês (sem pin) e sai dos meses seguintes.
export async function unpinItem(month, fixedId) {
  await db.transaction('rw', db.fixed, db.expenses, async () => {
    await db.fixed.delete(fixedId);
    const cur = await db.expenses.where('month').equals(month).first();
    if (cur) await db.expenses.update(cur.id, { items: (cur.items || []).map(({ fixed_id, ...i }) => (fixed_id === fixedId ? i : { ...i, ...(fixed_id ? { fixed_id } : {}) })) });
    for (const r of await later(month)) {
      await db.expenses.update(r.id, { items: (r.items || []).filter(i => i.fixed_id !== fixedId), fixed_applied: (r.fixed_applied || []).filter(x => x !== fixedId) });
    }
  });
}

// Define quantas parcelas a conta fixa tem. `current` é o número da parcela em `month`.
// Sem `parcels`, volta a ser uma conta sem fim. Depois da última parcela, a linha sai dos meses seguintes.
export async function setParcels(fixedId, month, { parcels, current = 1 }) {
  const total = Math.floor(Number(parcels)) || 0, now = Math.floor(Number(current)) || 1;
  if (total && (now < 1 || now > total)) throw new Error(`A parcela deste mês precisa estar entre 1 e ${total}.`);
  await db.transaction('rw', db.fixed, db.expenses, async () => {
    const f = await db.fixed.get(fixedId);
    if (!f) throw new Error('Conta fixa não encontrada.');
    const { parcels: _p, first: _f, ...rest } = f;
    const next = total ? { ...rest, parcels: total, first: addMonths(month, 1 - now) } : rest;
    await db.fixed.put(next);
    const end = fixedEnd(next);
    if (end) for (const r of await db.expenses.where('month').above(end).toArray()) {
      if ((r.items || []).some(i => i.fixed_id === fixedId)) await db.expenses.update(r.id, { items: r.items.filter(i => i.fixed_id !== fixedId) });
    }
  });
}
