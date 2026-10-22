import { useState } from 'react';
import { Field } from '@/components/ui/Bits';
import DollarInput from './DollarInput';
import { today } from '@/lib/dates';
import { brl } from '@/lib/finance';

export const WITHDRAWAL_CATEGORIES = ['outros', 'emergência', 'lazer', 'investimento', 'moradia', 'alimentação'];

export default function WithdrawalForm({ bucket, buckets, onSave, onCancel }) {
  const [form, setForm] = useState({ bucket_id: bucket?.id || buckets?.find(b => b.kind !== 'stocks')?.id || '', date: today(), amount: '', type: 'gasto', category: 'outros', note: '', dollar_rate: '' });
  const set = (k, v) => setForm(c => ({ ...c, [k]: v }));
  const current = bucket || buckets?.find(b => b.id === form.bucket_id);
  const isDollar = current?.rate_type === 'fed';
  const dollarRate = form.dollar_rate || (isDollar ? String(current.current_dollar_rate || current.last_dollar_rate || '') : '');
  return (
    <form onSubmit={e => { e.preventDefault(); onSave({ ...form, bucket_id: current.id, dollar_rate: isDollar ? dollarRate : '' }); }} className="grid grid-cols-2 gap-3">
      {!bucket && <Field label="De qual bucket saiu?" className="col-span-2">
        <select value={form.bucket_id} onChange={e => set('bucket_id', e.target.value)} className="field">{buckets.filter(b => b.kind !== 'stocks').map(b => <option key={b.id} value={b.id}>{b.icon} {b.name}</option>)}</select>
      </Field>}
      <div className="col-span-2 grid grid-cols-2 gap-2">
        {[['gasto', 'Gasto do dia a dia'], ['saque', 'Saque de investimento']].map(([v, l]) => <button type="button" key={v} onClick={() => set('type', v)} className={`rounded-xl border p-2.5 text-sm font-semibold transition ${form.type === v ? 'border-accent bg-accent/10 text-accent' : 'border-line text-muted hover:text-ink'}`}>{l}</button>)}
      </div>
      <Field label={`Valor (${isDollar ? 'US$' : 'R$'})`}><input required autoFocus type="number" min="0.01" step="0.01" value={form.amount} onChange={e => set('amount', e.target.value)} className="field" /></Field>
      <Field label="Data"><input required type="date" value={form.date} onChange={e => set('date', e.target.value)} className="field" /></Field>
      {isDollar && <div className="col-span-2"><DollarInput label="Cotação do dólar no dia (R$/US$)" value={dollarRate} onChange={v => set('dollar_rate', v)} /><p className="mt-1 text-xs text-muted">Equivale a {brl(Number(form.amount) * Number(dollarRate || 0))}</p></div>}
      <Field label="Categoria">
        <select value={form.category} onChange={e => set('category', e.target.value)} className="field">{WITHDRAWAL_CATEGORIES.map(c => <option key={c} value={c}>{c[0].toUpperCase() + c.slice(1)}</option>)}</select>
      </Field>
      <Field label="Observação"><input value={form.note} onChange={e => set('note', e.target.value)} placeholder="Opcional" className="field" /></Field>
      <div className="col-span-2 flex justify-end gap-2"><button type="button" onClick={onCancel} className="btn-secondary">Cancelar</button><button className="btn-primary">Registrar</button></div>
    </form>
  );
}
