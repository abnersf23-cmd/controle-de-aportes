import { useState } from 'react';
import { Settings2, Sparkles } from 'lucide-react';
import { brl, monthLabel } from '@/lib/finance';

// Assistente de aporte: olha a sobra do mês na planilha de gastos e sugere quanto aportar,
// deixando um colchão na conta corrente.
export default function AssistantCard({ assistant, buckets, onUse, goTo }) {
  const { loading, month, settings, saveSettings, hasMonth, suggestion } = assistant;
  const [editing, setEditing] = useState(false);
  if (loading) return null;
  const { leftover, keep, contribution } = suggestion;
  const split = buckets.filter(b => b.percentage > 0);

  return (
    <section className="card space-y-3 p-5">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-accent/10 text-accent">
            <Sparkles size={20} />
          </div>
          <div>
            <h2 className="font-bold">Assistente de aporte</h2>
            <p className="text-sm text-muted">Baseado em Gastos mensais · {monthLabel(month)}</p>
          </div>
        </div>
        <button onClick={() => setEditing(e => !e)} className="btn-ghost" aria-label="Ajustar o assistente" aria-expanded={editing}>
          <Settings2 size={16} />
        </button>
      </div>

      {editing && (
        <div className="grid grid-cols-2 gap-3 rounded-xl bg-surface2 p-3">
          <label className="label">
            Deixar na conta (% da sobra)
            <input
              type="number"
              min="0"
              max="100"
              step="1"
              defaultValue={settings.keepPct}
              onBlur={e => saveSettings({ keepPct: Math.min(100, Math.max(0, Number(e.target.value) || 0)) })}
              className="field"
            />
          </label>
          <label className="label">
            Mínimo na conta (R$)
            <input
              type="number"
              min="0"
              step="10"
              defaultValue={settings.keepMin}
              onBlur={e => saveSettings({ keepMin: Math.max(0, Number(e.target.value) || 0) })}
              className="field"
            />
          </label>
          <p className="col-span-2 text-xs text-faint">Fica na conta o maior dos dois. O resto vira aporte, arredondado para baixo de R$ 10 em R$ 10.</p>
        </div>
      )}

      {!hasMonth ? (
        <p className="text-sm text-muted">
          Preencha as entradas e as contas de {monthLabel(month)} em{' '}
          <button onClick={() => goTo('gastos')} className="font-semibold text-accent underline">
            Gastos mensais
          </button>{' '}
          para eu calcular a sugestão.
        </p>
      ) : leftover <= 0 ? (
        <p className="rounded-xl bg-bad/10 p-3 text-sm text-bad">
          Este mês as contas passam a renda em {brl(-leftover)}. Sugestão: <strong>não aportar</strong> e rever os gastos.
        </p>
      ) : (
        <>
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-muted">Sobra do mês</span>
              <strong>{brl(leftover)}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Fica na conta corrente</span>
              <strong>{brl(keep)}</strong>
            </div>
            <div className="flex justify-between border-t border-line pt-1.5">
              <span className="font-semibold">Aporte sugerido</span>
              <strong className="text-lg text-good">{brl(contribution)}</strong>
            </div>
          </div>
          {contribution > 0 ? (
            <>
              <div className="space-y-1 rounded-xl bg-surface2 p-3 text-sm">
                {split.map(b => (
                  <div key={b.id} className="flex justify-between">
                    <span className="text-muted">
                      {b.icon} {b.name} ({b.percentage}%)
                    </span>
                    <strong>{brl((contribution * b.percentage) / 100)}</strong>
                  </div>
                ))}
              </div>
              <button onClick={() => onUse(contribution)} className="btn-primary w-full">
                Usar {brl(contribution)} no aporte do mês
              </button>
            </>
          ) : (
            <p className="rounded-xl bg-warn/10 p-3 text-sm text-warn">A sobra é pequena: melhor deixar tudo na conta este mês.</p>
          )}
        </>
      )}
    </section>
  );
}
