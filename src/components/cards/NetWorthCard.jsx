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
  const parcels = parcelDebts(
    fixed,
    records.find(r => r.month === month),
    month
  );
  const others = (manual?.list || []).filter(d => Number(d.amount) > 0).map(d => ({ ...d, amount: Number(d.amount) }));
  const nw = netWorth(assets, [...parcels, ...others]);

  return (
    <section className="card space-y-3 p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-info/10 text-info">
            <Scale size={20} />
          </div>
          <div>
            <h2 className="font-bold">Patrimônio líquido</h2>
            <p className="text-sm text-muted">Quanto é seu de verdade, tirando as dívidas</p>
          </div>
        </div>
        <button onClick={() => setEditing(true)} className="btn-ghost" aria-label="Editar outras dívidas" title="Outras dívidas">
          <Pencil size={16} />
        </button>
      </div>
      <p className={`text-3xl font-bold ${nw.net < 0 ? 'text-bad' : ''}`}>{brl(nw.net)}</p>
      {/* A conta de cabeça, em uma linha: o que você tem − o que deve = o que é seu de verdade. */}
      <div className="space-y-1 rounded-xl bg-surface2 p-3 text-sm">
        <div className="flex justify-between">
          <span className="text-muted">Você tem investido</span>
          <strong>{brl(nw.assets)}</strong>
        </div>
        <div className="flex justify-between">
          <span className="text-muted">− Você ainda deve</span>
          <strong className={nw.owed > 0 ? 'text-bad' : 'text-muted'}>{brl(nw.owed)}</strong>
        </div>
        <div className="flex justify-between border-t border-line pt-1">
          <span className="font-semibold">= É seu de verdade</span>
          <strong>{brl(nw.net)}</strong>
        </div>
      </div>
      <p className="text-sm text-muted">
        {nw.owed > 0
          ? `É diferente do total da carteira (${brl(nw.assets)}) porque desconta os ${brl(nw.owed)} que você ainda vai pagar. Se você quitasse tudo hoje, sobraria este valor.`
          : 'Igual ao total da carteira, porque você não tem dívidas cadastradas.'}
      </p>
      {(parcels.length > 0 || others.length > 0) && (
        <details className="text-sm">
          <summary className="cursor-pointer font-semibold text-muted hover:text-ink">O que entra em &quot;você deve&quot;</summary>
          <div className="mt-2 space-y-1.5">
            {parcels.map(d => (
              <div key={d.id} className="flex justify-between">
                <span className="text-muted">
                  {d.name}{' '}
                  <span className="text-xs text-faint">
                    (faltam {d.left} × {brl(d.parcel)})
                  </span>
                </span>
                <span className="text-bad">{brl(d.amount)}</span>
              </div>
            ))}
            {others.map(d => (
              <div key={d.id} className="flex justify-between">
                <span className="text-muted">{d.name || 'Dívida'}</span>
                <span className="text-bad">{brl(d.amount)}</span>
              </div>
            ))}
          </div>
        </details>
      )}
      <p className="text-xs text-faint">Parcelas marcadas com 📌 nos Gastos mensais entram sozinhas. Cartão ou empréstimo você adiciona no lápis.</p>
      <Modal open={editing} title="Outras dívidas" subtitle="O saldo que falta pagar de cada uma" onClose={() => setEditing(false)}>
        <DebtsForm
          list={manual?.list || []}
          onCancel={() => setEditing(false)}
          onSave={async list => {
            await saveManual({ list });
            setEditing(false);
          }}
        />
      </Modal>
    </section>
  );
}

function DebtsForm({ list, onSave, onCancel }) {
  const [rows, setRows] = useState(list.length ? list : [{ id: newId(), name: '', amount: '' }]);
  const set = (id, patch) => setRows(r => r.map(x => (x.id === id ? { ...x, ...patch } : x)));
  return (
    <form
      className="space-y-3"
      onSubmit={e => {
        e.preventDefault();
        onSave(rows.filter(r => String(r.name).trim() || Number(r.amount) > 0));
      }}
    >
      {rows.map(r => (
        <div key={r.id} className="flex gap-2">
          <input
            value={r.name}
            onChange={e => set(r.id, { name: e.target.value })}
            placeholder="Ex.: Cartão"
            className="field mt-0"
            aria-label="Nome da dívida"
          />
          <input
            type="number"
            min="0"
            step="0.01"
            value={r.amount}
            onChange={e => set(r.id, { amount: e.target.value })}
            placeholder="Saldo (R$)"
            className="field mt-0 w-36"
            aria-label="Saldo devedor"
          />
          <button type="button" onClick={() => setRows(x => x.filter(y => y.id !== r.id))} className="btn-ghost p-2 hover:text-bad" aria-label="Remover dívida">
            <Trash2 size={16} />
          </button>
        </div>
      ))}
      <button type="button" onClick={() => setRows(x => [...x, { id: newId(), name: '', amount: '' }])} className="btn-ghost">
        <Plus size={16} /> Adicionar dívida
      </button>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="btn-secondary">
          Cancelar
        </button>
        <button className="btn-primary">Salvar</button>
      </div>
    </form>
  );
}
