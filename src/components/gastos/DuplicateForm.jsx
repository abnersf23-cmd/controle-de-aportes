import { useMemo, useState } from 'react';
import { addMonths } from '@/lib/dates';
import { brl, monthLabel } from '@/lib/finance';

// Modal "Duplicar mês": escolhe os meses de destino e se junta ou substitui o que já existe lá.
export default function DuplicateForm({ month, source, records, onSave, onCancel }) {
  const options = useMemo(() => Array.from({ length: 12 }, (_, i) => addMonths(month, i + 1)), [month]);
  const [targets, setTargets] = useState([options[0]]);
  const [incomes, setIncomes] = useState(true);
  const [mode, setMode] = useState('merge');
  const toggle = m => setTargets(t => (t.includes(m) ? t.filter(x => x !== m) : [...t, m].sort()));
  const withData = targets.filter(m => records.some(r => r.month === m && (r.items || []).some(i => i.name)));
  const count = source.items.filter(i => i.name.trim()).length;
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">
        {count} conta{count > 1 ? 's' : ''} ({brl(source.items.reduce((s, i) => s + i.vale + i.pagamento, 0))}) serão copiadas para os meses escolhidos.
      </p>
      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <span className="label">Para quais meses?</span>
          <span className="flex gap-2 text-xs font-semibold">
            <button onClick={() => setTargets(options.slice(0, 3))} className="text-accent">
              Próximos 3
            </button>
            <button onClick={() => setTargets(options.slice(0, 6))} className="text-accent">
              6
            </button>
            <button onClick={() => setTargets(options)} className="text-accent">
              12
            </button>
            <button onClick={() => setTargets([])} className="text-muted">
              Limpar
            </button>
          </span>
        </div>
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
          {options.map(m => {
            const on = targets.includes(m),
              has = records.some(r => r.month === m && (r.items || []).some(i => i.name));
            return (
              <button
                key={m}
                type="button"
                onClick={() => toggle(m)}
                className={`rounded-xl border px-2 py-2 text-xs font-semibold transition ${on ? 'border-accent bg-accent/15 text-accent' : 'border-line text-muted hover:text-ink'}`}
              >
                {monthLabel(m)}
                {has && <span className="block text-[10px] font-normal text-warn">já tem contas</span>}
              </button>
            );
          })}
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={incomes} onChange={e => setIncomes(e.target.checked)} className="h-4 w-4 accent-[rgb(var(--accent))]" /> Copiar também
        as entradas do dia 15 e do dia 30
      </label>
      {withData.length > 0 && (
        <div className="space-y-2 rounded-xl border border-warn/30 bg-warn/10 p-3 text-sm">
          <p className="font-semibold text-warn">
            {withData.length} {withData.length > 1 ? 'meses escolhidos já têm' : 'mês escolhido já tem'} contas. O que fazer?
          </p>
          <label className="flex items-start gap-2">
            <input type="radio" checked={mode === 'merge'} onChange={() => setMode('merge')} className="mt-0.5" />
            <span>
              <strong>Juntar</strong> <span className="text-muted">— mantém o que já está lá e adiciona só as contas que faltam (pelo nome).</span>
            </span>
          </label>
          <label className="flex items-start gap-2">
            <input type="radio" checked={mode === 'replace'} onChange={() => setMode('replace')} className="mt-0.5" />
            <span>
              <strong>Substituir</strong> <span className="text-muted">— apaga as contas desses meses e deixa igual a {monthLabel(month)}.</span>
            </span>
          </label>
        </div>
      )}
      <div className="flex justify-end gap-2">
        <button onClick={onCancel} className="btn-secondary">
          Cancelar
        </button>
        <button disabled={!targets.length} onClick={() => onSave(targets, { incomes, mode })} className="btn-primary">
          Duplicar para {targets.length} {targets.length === 1 ? 'mês' : 'meses'}
        </button>
      </div>
    </div>
  );
}
