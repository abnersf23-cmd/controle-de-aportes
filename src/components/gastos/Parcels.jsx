import { useState } from 'react';
import { Field } from '@/components/ui/Bits';
import { fixedEnd, parcelNumber } from '@/db/expenses';
import { addMonths } from '@/lib/dates';
import { monthLabel } from '@/lib/finance';

// Mostra "3/10" numa conta parcelada ou "∞" numa conta fixa sem fim; clique para definir as parcelas.
export function ParcelChip({ f, month, onClick }) {
  if (!f) return null;
  const label = f.parcels ? `${parcelNumber(f, month)}/${f.parcels}` : '∞';
  const title = f.parcels ? `Parcela ${label} · termina em ${monthLabel(fixedEnd(f))}` : 'Sem fim · clique para definir parcelas';
  return (
    <button onClick={() => onClick(f)} className="chip shrink-0 bg-surface2 text-muted hover:text-ink" title={title} aria-label={title}>
      {label}
    </button>
  );
}

export function ParcelForm({ f, month, onSave, onCancel }) {
  const [parcels, setParcels] = useState(f.parcels ? String(f.parcels) : '');
  const [current, setCurrent] = useState(String(f.parcels ? parcelNumber(f, month) : 1));
  const total = Number(parcels) || 0,
    now = Number(current) || 1;
  return (
    <form
      className="space-y-4"
      onSubmit={e => {
        e.preventDefault();
        onSave({ parcels: total, current: now });
      }}
    >
      <Field label="Total de parcelas" hint="Deixe vazio se a conta não tem fim.">
        <input type="number" min="1" step="1" value={parcels} onChange={e => setParcels(e.target.value)} className="field" placeholder="Ex.: 10" autoFocus />
      </Field>
      {total > 0 && (
        <Field label={`Em ${monthLabel(month)} é a parcela nº`}>
          <input type="number" min="1" max={total} step="1" value={current} onChange={e => setCurrent(e.target.value)} className="field" />
        </Field>
      )}
      {total > 0 && now >= 1 && now <= total && (
        <p className="rounded-xl bg-surface2 p-3 text-sm">
          Última parcela em <strong>{monthLabel(addMonths(month, total - now))}</strong>. Faltam {total - now + 1} parcela{total - now + 1 > 1 ? 's' : ''},
          contando esta.
        </p>
      )}
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="btn-secondary">
          Cancelar
        </button>
        <button className="btn-primary">Salvar</button>
      </div>
    </form>
  );
}
