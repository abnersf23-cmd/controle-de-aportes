import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { Field } from '@/components/ui/Bits';
import DollarInput from './DollarInput';
import { today } from '@/lib/dates';
import { brl, dateLabel } from '@/lib/finance';

// Aporte avulso (fora da divisão mensal) em um bucket.
export default function ExtraForm({ bucket, extras = [], onDelete, onSave, onCancel }) {
  const isDollar = bucket.rate_type === 'fed';
  const [form, setForm] = useState({ amount: '', date: today(), note: '', dollar_rate: isDollar ? String(bucket.last_dollar_rate || bucket.current_dollar_rate || '') : '' });
  const set = (k, v) => setForm(c => ({ ...c, [k]: v }));
  const previous = extras.filter(e => e.bucket_id === bucket.id).slice(0, 5);
  return (
    <form onSubmit={e => { e.preventDefault(); onSave(form); }} className="grid grid-cols-2 gap-3">
      <Field label="Valor (R$)"><input required autoFocus type="number" min="0.01" step="0.01" value={form.amount} onChange={e => set('amount', e.target.value)} className="field" /></Field>
      <Field label="Data"><input required type="date" value={form.date} onChange={e => set('date', e.target.value)} className="field" /></Field>
      {isDollar && <div className="col-span-2"><DollarInput value={form.dollar_rate} onChange={v => set('dollar_rate', v)} />{Number(form.dollar_rate) > 0 && Number(form.amount) > 0 && <p className="mt-1 text-xs text-muted">≈ US$ {(Number(form.amount) / Number(form.dollar_rate)).toFixed(2)}</p>}</div>}
      <Field label="Observação" className="col-span-2"><input value={form.note} onChange={e => set('note', e.target.value)} className="field" placeholder="Opcional" /></Field>
      <div className="col-span-2 flex justify-end gap-2"><button type="button" onClick={onCancel} className="btn-secondary">Cancelar</button><button className="btn-primary">Adicionar aporte</button></div>
      {previous.length > 0 && <div className="col-span-2 space-y-1 border-t border-line pt-3">
        <p className="text-xs font-semibold text-muted">Últimos aportes avulsos</p>
        {previous.map(e => <div key={e.id} className="flex items-center justify-between gap-2 rounded-lg bg-surface2 px-3 py-2 text-sm">
          <span>{brl(e.amount)} <span className="text-muted">· {dateLabel(e.date)}{e.note ? ` · ${e.note}` : ''}</span></span>
          <button type="button" onClick={() => onDelete(e)} className="text-faint hover:text-bad" aria-label="Excluir aporte"><Trash2 size={15} /></button>
        </div>)}
      </div>}
    </form>
  );
}
