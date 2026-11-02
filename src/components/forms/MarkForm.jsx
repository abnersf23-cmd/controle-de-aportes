import { useState } from 'react';
import { Field } from '@/components/ui/Bits';
import DollarInput from './DollarInput';
import { brl } from '@/lib/finance';

// Confirma o aporte do mês em um bucket. O valor vem preenchido com a divisão sugerida,
// mas dá para corrigir (ex.: R$ 271 em vez de R$ 270): o que vale é o que você aportou de verdade.
export default function MarkForm({ bucket, suggested, onSave, onCancel }) {
  const isDollar = bucket.rate_type === 'fed';
  const [amount, setAmount] = useState(String(suggested));
  const [rate, setRate] = useState(isDollar ? String(bucket.last_dollar_rate || bucket.current_dollar_rate || '') : '');
  const value = Number(amount) || 0;
  const diff = Math.round((value - suggested) * 100) / 100;
  return (
    <form
      onSubmit={e => {
        e.preventDefault();
        onSave({ amount: value, dollarRate: isDollar ? Number(rate) : undefined });
      }}
      className="space-y-3"
    >
      <Field label="Quanto você aportou (R$)" hint={`Divisão sugerida: ${brl(suggested)}`}>
        <input required autoFocus type="number" min="0.01" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} className="field" />
      </Field>
      {diff !== 0 && value > 0 && (
        <p className={`text-xs ${diff > 0 ? 'text-good' : 'text-warn'}`}>
          {diff > 0 ? `${brl(diff)} a mais` : `${brl(-diff)} a menos`} que a divisão. O previsto x realizado conta o valor que você digitou.
        </p>
      )}
      {isDollar && (
        <>
          <DollarInput value={rate} onChange={setRate} label="Cotação usada na compra (R$)" />
          {Number(rate) > 0 && value > 0 && <p className="text-xs text-muted">≈ US$ {(value / Number(rate)).toFixed(2)}</p>}
        </>
      )}
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="btn-secondary">
          Cancelar
        </button>
        <button className="btn-primary">Confirmar {value > 0 ? brl(value) : ''}</button>
      </div>
    </form>
  );
}
