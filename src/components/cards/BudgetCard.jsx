import { useState } from 'react';
import { Pencil } from 'lucide-react';
import useSetting from '@/hooks/useSetting';
import { CATEGORIES, budgetStatus } from '@/lib/categories';
import { brl } from '@/lib/finance';

const barColor = { over: 'bg-bad', warn: 'bg-warn', ok: 'bg-good' };
const textColor = { over: 'text-bad', warn: 'text-warn', ok: 'text-muted' };

// "Por categoria" da planilha de gastos, com limite (orçamento) por categoria.
// Os limites valem para todos os meses e ficam em db.settings 'budgets' ({ categoria: R$ }).
export default function BudgetCard({ byCategory }) {
  const [budgets, saveBudgets] = useSetting('budgets', {});
  const [editing, setEditing] = useState(false);
  if (!budgets) return null;
  const list = budgetStatus(byCategory, budgets);
  const total = byCategory.reduce((s, c) => s + c.value, 0);
  if (!list.length && !editing) return null;
  const onSave = e => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    saveBudgets(Object.fromEntries(CATEGORIES.map(c => [c.id, Math.max(0, Number(form.get(c.id)) || 0)])));
    setEditing(false);
  };

  return (
    <section className="card space-y-3 p-5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-wider text-muted">Por categoria</p>
        <button onClick={() => setEditing(e => !e)} className="btn-ghost -my-1 py-1 text-xs" aria-expanded={editing}>
          <Pencil size={14} /> Orçamento
        </button>
      </div>
      {editing ? (
        <form onSubmit={onSave} className="space-y-2">
          <p className="text-xs text-faint">
            Limite por mês em cada categoria. Deixe 0 para não ter limite. Você recebe aviso ao chegar a 80% e ao passar do limite.
          </p>
          {CATEGORIES.map(c => (
            <label key={c.id} className="flex items-center gap-2 text-sm">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: c.color }} />
              <span className="flex-1 text-muted">{c.label}</span>
              <input
                name={c.id}
                type="number"
                min="0"
                step="10"
                defaultValue={budgets[c.id] || ''}
                placeholder="0"
                className="field mt-0 w-28 py-1.5"
                aria-label={`Limite de ${c.label}`}
              />
            </label>
          ))}
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={() => setEditing(false)} className="btn-secondary">
              Cancelar
            </button>
            <button className="btn-primary">Salvar</button>
          </div>
        </form>
      ) : (
        <>
          {total > 0 && (
            <div className="flex h-3 overflow-hidden rounded-full bg-surface2">
              {byCategory.map(c => (
                <div key={c.id} style={{ width: `${c.pct}%`, background: c.color }} title={c.label} />
              ))}
            </div>
          )}
          <ul className="space-y-2 text-sm">
            {list.map(c => (
              <li key={c.id}>
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: c.color }} />
                  <span className="flex-1 text-muted">{c.label}</span>
                  <strong>{brl(c.value)}</strong>
                  {c.limit > 0 ? (
                    <span className={`w-24 text-right text-xs ${textColor[c.level]}`}>de {brl(c.limit)}</span>
                  ) : (
                    <span className="w-24 text-right text-xs text-faint">{total ? `${Math.round((c.value / total) * 100)}%` : ''}</span>
                  )}
                </div>
                {c.limit > 0 && (
                  <>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface2">
                      <div className={`bar-fill h-full rounded-full ${barColor[c.level]}`} style={{ width: `${Math.min(100, c.ratio * 100)}%` }} />
                    </div>
                    {c.level !== 'ok' && (
                      <p className={`mt-0.5 text-xs ${textColor[c.level]}`}>
                        {c.level === 'over' ? `Passou ${brl(-c.left)} do limite` : `${Math.round(c.ratio * 100)}% do limite · resta ${brl(c.left)}`}
                      </p>
                    )}
                  </>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
