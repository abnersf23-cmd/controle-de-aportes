import { useState } from 'react';
import { Field } from '@/components/ui/Bits';
import { today } from '@/lib/dates';
import { dateLabel, effectiveRate, pct, rateHistory } from '@/lib/finance';

// Nova taxa a partir de uma data. O histórico preserva o passado com a taxa antiga.
export default function RateForm({ bucket, onSave, onCancel }) {
  const [form, setForm] = useState({ base_rate: bucket.base_rate ?? '', date: today() });
  const history = rateHistory(bucket);
  return (
    <form onSubmit={e => { e.preventDefault(); onSave(form); }} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Nova taxa base (% a.a.)"><input required autoFocus type="number" step="0.01" value={form.base_rate} onChange={e => setForm(f => ({ ...f, base_rate: e.target.value }))} className="field" /></Field>
        <Field label="Vale a partir de"><input required type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className="field" /></Field>
      </div>
      <p className="rounded-xl bg-surface2 p-3 text-xs text-muted">Taxa efetiva nova: <strong className="text-ink">{pct(effectiveRate({ ...bucket, base_rate: Number(form.base_rate) }))} a.a.</strong></p>
      <div>
        <p className="mb-1 text-xs font-semibold text-muted">Histórico</p>
        <ul className="space-y-1 text-sm">{history.map(h => <li key={h.start_date} className="flex justify-between rounded-lg bg-surface2 px-3 py-1.5"><span>desde {dateLabel(h.start_date)}</span><strong>{pct(h.rate)}</strong></li>)}</ul>
      </div>
      <div className="flex justify-end gap-2"><button type="button" onClick={onCancel} className="btn-secondary">Cancelar</button><button className="btn-primary">Salvar taxa</button></div>
    </form>
  );
}
