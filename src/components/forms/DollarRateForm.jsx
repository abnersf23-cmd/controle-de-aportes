import { useState } from 'react';
import DollarInput from './DollarInput';

export default function DollarRateForm({ currentRate, onSave, onCancel, submitLabel = 'Salvar cotação', hint }) {
  const [rate, setRate] = useState(currentRate ? String(currentRate) : '');
  return (
    <form onSubmit={e => { e.preventDefault(); onSave(Number(rate)); }} className="space-y-3">
      <DollarInput value={rate} onChange={setRate} />
      {hint && <p className="text-xs text-muted">{hint}</p>}
      <div className="flex justify-end gap-2"><button type="button" onClick={onCancel} className="btn-secondary">Cancelar</button><button className="btn-primary">{submitLabel}</button></div>
    </form>
  );
}
