import { useState } from 'react';
import { Pencil, Plus, Scale, Trash2 } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import useExpenses from '@/hooks/useExpenses';
import useSetting from '@/hooks/useSetting';
import { newId } from '@/db/database';
import { brl, monthKey } from '@/lib/finance';
import { netWorth, parcelDebts } from '@/lib/networth';

// Patrimônio líquido: o que você tem investido menos o que ainda deve.
// As parcelas vêm sozinhas dos Gastos mensais; as outras dívidas você digita (cartão, empréstimo…).
export default function NetWorthCard({ assets }) {
  const { records, fixed } = useExpenses();
  const [manual, saveManual] = useSetting('debts', { list: [] });
  const [editing, setEditing] = useState(false);
  const month = monthKey();
  const parcels = parcelDebts(fixed, records.find(r => r.month === month), month);
  const others = (manual?.list || []).filter(d => Number(d.amount) > 0).map(d => ({ ...d, amount: Number(d.amount) }));
  const nw = netWorth(assets, [...parcels, ...others]);

  return (
    <section className="card space-y-3 p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-info/10 text-info"><Scale size={20} /></div>
          <div><h2 className="font-bold">Patrimônio líquido</h2><p className="text-sm text-muted">Investimentos menos dívidas</p></div>
        </div>
        <button onClick={() => setEditing(true)} className="btn-ghost" aria-label="Editar outras dívidas" title="Outras dívidas"><Pencil size={16} /></button>
      </div>
      <p className={`text-3xl font-bold ${nw.net < 0 ? 'text-bad' : ''}`}>{brl(nw.net)}</p>
      <div className="space-y-1.5 text-sm">
        <div className="flex justify-between"><span className="text-muted">Investido</span><strong>{brl(nw.assets)}</strong></div>
        {parcels.map(d => <div key={d.id} className="flex justify-between"><span className="text-muted">− {d.name} <span className="text-xs text-faint">({d.left} × {brl(d.parcel)})</span></span><span className="text-bad">{brl(d.amount)}</span></div>)}
        {others.map(d => <div key={d.id} className="flex justify-between"><span className="text-muted">− {d.name || 'Dívida'}</span><span className="text-bad">{brl(d.amount)}</span></div>)}
        {!parcels.length && !others.length && <p className="text-xs text-faint">Nenhuma dívida: parcelas com 📌 nos Gastos mensais entram sozinhas. Outras (cartão, empréstimo) você adiciona no lápis.</p>}
      </div>
      <Modal open={editing} title="Outras dívidas" subtitle="O saldo que falta pagar de cada uma" onClose={() => setEditing(false)}>
        <DebtsForm list={manual?.list || []} onCancel={() => setEditing(false)} onSave={async list => { await saveManual({ list }); setEditing(false); }} />
      </Modal>
    </section>
  );
}

function DebtsForm({ list, onSave, onCancel }) {
  const [rows, setRows] = useState(list.length ? list : [{ id: newId(), name: '', amount: '' }]);
  const set = (id, patch) => setRows(r => r.map(x => (x.id === id ? { ...x, ...patch } : x)));
  return (
    <form className="space-y-3" onSubmit={e => { e.preventDefault(); onSave(rows.filter(r => String(r.name).trim() || Number(r.amount) > 0)); }}>
      {rows.map(r => <div key={r.id} className="flex gap-2">
        <input value={r.name} onChange={e => set(r.id, { name: e.target.value })} placeholder="Ex.: Cartão" className="field mt-0" aria-label="Nome da dívida" />
        <input type="number" min="0" step="0.01" value={r.amount} onChange={e => set(r.id, { amount: e.target.value })} placeholder="Saldo (R$)" className="field mt-0 w-36" aria-label="Saldo devedor" />
        <button type="button" onClick={() => setRows(x => x.filter(y => y.id !== r.id))} className="btn-ghost p-2 hover:text-bad" aria-label="Remover dívida"><Trash2 size={16} /></button>
      </div>)}
      <button type="button" onClick={() => setRows(x => [...x, { id: newId(), name: '', amount: '' }])} className="btn-ghost"><Plus size={16} /> Adicionar dívida</button>
      <div className="flex justify-end gap-2"><button type="button" onClick={onCancel} className="btn-secondary">Cancelar</button><button className="btn-primary">Salvar</button></div>
    </form>
  );
}
