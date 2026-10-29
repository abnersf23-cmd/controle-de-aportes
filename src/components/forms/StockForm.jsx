import { useState } from 'react';
import { Field } from '@/components/ui/Bits';

const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

export default function StockForm({ stock, onSave, onCancel }) {
  const [form, setForm] = useState(
    stock
      ? { ticker: stock.ticker, name: stock.name || '', type: stock.type, color: stock.color, dividend_months: stock.dividend_months || [] }
      : { ticker: '', name: '', type: 'acao', color: '#3B82F6', dividend_months: [] }
  );
  const set = (k, v) => setForm(c => ({ ...c, [k]: v }));
  const toggle = m =>
    set('dividend_months', form.dividend_months.includes(m) ? form.dividend_months.filter(x => x !== m) : [...form.dividend_months, m].sort((a, b) => a - b));
  return (
    <form
      onSubmit={e => {
        e.preventDefault();
        onSave(form);
      }}
      className="grid grid-cols-2 gap-3"
    >
      <Field label="Ticker">
        <input
          required
          disabled={!!stock}
          value={form.ticker}
          onChange={e => set('ticker', e.target.value.toUpperCase())}
          placeholder="Ex.: HGLG11"
          className="field uppercase"
        />
      </Field>
      <Field label="Tipo">
        <select value={form.type} onChange={e => set('type', e.target.value)} className="field">
          <option value="acao">Ação</option>
          <option value="fii">FII</option>
        </select>
      </Field>
      <Field label="Nome (opcional)">
        <input value={form.name} onChange={e => set('name', e.target.value)} className="field" />
      </Field>
      <Field label="Cor">
        <input type="color" value={form.color} onChange={e => set('color', e.target.value)} className="field h-11 p-1" />
      </Field>
      <div className="col-span-2">
        <span className="label">Meses em que costuma pagar dividendos</span>
        <div className="mt-1 grid grid-cols-6 gap-1.5">
          {MONTHS.map((m, i) => (
            <button
              type="button"
              key={m}
              onClick={() => toggle(i + 1)}
              className={`rounded-lg py-1.5 text-xs font-semibold transition ${form.dividend_months.includes(i + 1) ? 'bg-good/20 text-good' : 'bg-surface2 text-muted hover:text-ink'}`}
            >
              {m}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => set('dividend_months', [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])}
          className="mt-1 text-xs font-semibold text-accent"
        >
          Todos os meses
        </button>
      </div>
      <div className="col-span-2 flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="btn-secondary">
          Cancelar
        </button>
        <button className="btn-primary">Salvar ativo</button>
      </div>
    </form>
  );
}
