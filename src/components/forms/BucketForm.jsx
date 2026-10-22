import { useState } from 'react';
import { Field } from '@/components/ui/Bits';
import { today } from '@/lib/dates';
import { effectiveRate, pct } from '@/lib/finance';

const typeLabels = { selic: 'Taxa Selic (% a.a.)', cdi: 'Taxa CDI (% a.a.)', fed: 'Taxa Fed Funds (% a.a.)', custom: 'Taxa de referência (% a.a.)' };
const ICONS = ['💵', '🏛️', '💲', '📈', '🐷', '🏦', '💰', '🪙', '🏠', '🎯', '📊', '💎'];
export const CATEGORIES = ['Caixa', 'Tesouro Direto', 'Moeda Estrangeira', 'Cofrinhos', 'Outros'];

export default function BucketForm({ bucket, onSave, onCancel, allowPercentage = false, category }) {
  const [form, setForm] = useState(bucket
    ? { name: bucket.name, icon: bucket.icon, color: bucket.color, category: bucket.category || 'Outros', percentage: bucket.percentage, rate_type: bucket.rate_type || 'custom', base_rate: bucket.base_rate ?? '', management_fee: bucket.management_fee ?? 0.4, cdi_percentage: bucket.cdi_percentage ?? 100 }
    : { name: '', icon: '📈', color: '#8B5CF6', category: category || 'Outros', percentage: '', rate_type: 'custom', base_rate: '', management_fee: 0.4, cdi_percentage: 100, start_date: today(), current_dollar_rate: '' });
  const set = (k, v) => setForm(c => ({ ...c, [k]: v }));
  const isStocks = bucket?.kind === 'stocks';
  return (
    <form onSubmit={e => { e.preventDefault(); onSave(form); }} className="grid gap-3 sm:grid-cols-2">
      <Field label="Nome"><input required value={form.name} onChange={e => set('name', e.target.value)} className="field" placeholder="Ex.: Cofrinho Nubank" /></Field>
      <Field label="Categoria">
        <select value={form.category} onChange={e => set('category', e.target.value)} className="field" disabled={isStocks}>
          {(isStocks ? ['Renda variável'] : CATEGORIES).map(c => <option key={c}>{c}</option>)}
        </select>
      </Field>
      <div className="sm:col-span-2">
        <span className="label">Ícone</span>
        <div className="mt-1 flex flex-wrap gap-1.5">
          {ICONS.map(i => <button type="button" key={i} onClick={() => set('icon', i)} className={`h-9 w-9 rounded-lg text-lg transition ${form.icon === i ? 'bg-accent/20 ring-2 ring-accent' : 'bg-surface2 hover:bg-line'}`}>{i}</button>)}
          <input value={form.icon} onChange={e => set('icon', e.target.value)} className="field mt-0 w-16 text-center" aria-label="Outro ícone" />
        </div>
      </div>
      {(!bucket || allowPercentage) && <Field label="Percentual do aporte (%)" hint={bucket ? 'Os outros buckets são reajustados para fechar 100%.' : 'Sai proporcionalmente dos buckets não protegidos.'}><input required type="number" min="0.01" max="99.99" step="0.01" value={form.percentage} onChange={e => set('percentage', e.target.value)} className="field" /></Field>}
      <Field label="Cor"><input type="color" value={form.color} onChange={e => set('color', e.target.value)} className="field h-11 p-1" /></Field>
      {!isStocks && <>
        <Field label="Tipo de taxa">
          <select value={form.rate_type} onChange={e => set('rate_type', e.target.value)} className="field">
            <option value="custom">Personalizada</option><option value="selic">Selic</option><option value="cdi">% do CDI</option><option value="fed">Fed Funds (dólar, ex.: Wise Rende+)</option>
          </select>
        </Field>
        <Field label={typeLabels[form.rate_type]}><input required type="number" step="0.01" value={form.base_rate} onChange={e => set('base_rate', e.target.value)} className="field" /></Field>
        {form.rate_type === 'fed' && <Field label="Taxa de gestão (% a.a.)"><input type="number" step="0.01" value={form.management_fee} onChange={e => set('management_fee', e.target.value)} className="field" /></Field>}
        {form.rate_type === 'cdi' && <Field label="% do CDI"><input type="number" step="0.01" value={form.cdi_percentage} onChange={e => set('cdi_percentage', e.target.value)} className="field" /></Field>}
        {!bucket && form.rate_type === 'fed' && <Field label="Cotação do dólar (R$)"><input type="number" step="0.01" value={form.current_dollar_rate} onChange={e => set('current_dollar_rate', e.target.value)} className="field" placeholder="5,40" /></Field>}
        {!bucket && <Field label="Vigente a partir de"><input required type="date" value={form.start_date} onChange={e => set('start_date', e.target.value)} className="field" /></Field>}
        <p className="rounded-xl bg-surface2 p-3 text-xs text-muted sm:col-span-2">Taxa efetiva: <strong className="text-ink">{pct(effectiveRate({ ...form, base_rate: Number(form.base_rate) }))} a.a.</strong></p>
      </>}
      <div className="flex justify-end gap-2 sm:col-span-2"><button type="button" onClick={onCancel} className="btn-secondary">Cancelar</button><button className="btn-primary">Salvar</button></div>
    </form>
  );
}
