import { useState } from 'react';
import { Minus, Plus } from 'lucide-react';
import { Field } from '@/components/ui/Bits';
import { today } from '@/lib/dates';
import { brl, round, stockQuantity } from '@/lib/finance';

// Compra ou venda de um FII/ação. Com cotação disponível, o valor é sugerido automaticamente.
export default function StockTradeForm({ stocks, stock, quotes = {}, mode = 'buy', onSave, onCancel }) {
  const [form, setForm] = useState({ stock_id: stock?.id || stocks?.[0]?.id || '', quantity: 1, amount: '', date: today(), note: '', touched: false });
  const selected = stock || stocks.find(s => s.id === form.stock_id);
  const price = selected ? quotes[selected.ticker]?.price : null;
  const available = selected ? stockQuantity(selected) : 0;
  const unit = selected?.type === 'fii' ? 'cotas' : 'ações';
  const suggested = price != null && form.quantity > 0 ? String(round(form.quantity * price)) : '';
  const amount = form.touched ? form.amount : suggested;
  const setQty = q => setForm(f => ({ ...f, quantity: Math.max(0, Number(q) || 0) }));
  const sell = mode === 'sell';
  return (
    <form onSubmit={e => { e.preventDefault(); onSave({ stock_id: selected.id, quantity: form.quantity, amount, date: form.date, note: form.note }); }} className="grid grid-cols-2 gap-3">
      {!stock && <Field label="Ativo" className="col-span-2"><select value={form.stock_id} onChange={e => setForm(f => ({ ...f, stock_id: e.target.value }))} className="field">{stocks.map(s => <option key={s.id} value={s.id}>{s.ticker} · {s.type === 'fii' ? 'FII' : 'Ação'}</option>)}</select></Field>}
      <div className="col-span-2">
        <span className="label">Quantidade ({unit}){sell && <span className="font-normal text-faint"> · você tem {available.toLocaleString('pt-BR')}</span>}</span>
        <div className="mt-1 flex items-center gap-2">
          <div className="flex flex-1 items-center rounded-xl border border-line bg-surface2 p-1">
            <button type="button" onClick={() => setQty(form.quantity - 1)} className="btn-ghost p-2"><Minus size={16} /></button>
            <input type="number" min="0" value={form.quantity} onChange={e => setQty(e.target.value)} className="min-w-0 flex-1 bg-transparent text-center text-lg font-semibold outline-none" />
            <button type="button" onClick={() => setQty(form.quantity + 1)} className="btn-ghost p-2"><Plus size={16} /></button>
          </div>
          {(sell ? [[available, 'Tudo']] : [[5, '+5'], [10, '+10']]).map(([n, l]) => <button key={l} type="button" onClick={() => setQty(sell ? n : form.quantity + n)} className="btn-secondary px-3">{l}</button>)}
        </div>
      </div>
      <Field label={sell ? 'Valor recebido (R$)' : 'Valor pago (R$)'} hint={price != null ? `Cotação atual: ${brl(price)}` : 'Sem cotação: digite o valor.'}>
        <input required type="number" min="0.01" step="0.01" value={amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value, touched: true }))} className="field" />
      </Field>
      <Field label="Data"><input required type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className="field" /></Field>
      <Field label="Observação" className="col-span-2"><input value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} className="field" placeholder="Opcional" /></Field>
      <div className="col-span-2 flex justify-end gap-2"><button type="button" onClick={onCancel} className="btn-secondary">Cancelar</button><button disabled={!form.quantity} className={sell ? 'btn-danger' : 'btn-primary'}>{sell ? 'Registrar venda' : 'Registrar compra'}</button></div>
    </form>
  );
}
