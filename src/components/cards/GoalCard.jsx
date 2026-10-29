import { useState } from 'react';
import { Pencil, Target } from 'lucide-react';
import { brl, weightedAverageRate, goalProjection } from '@/lib/finance';

export default function GoalCard({ goal, currentBalance, averageMonthly, buckets, onSave }) {
  const [editing, setEditing] = useState(!goal);
  const [target, setTarget] = useState(goal?.target_amount || '');
  const targetAmount = Number(goal?.target_amount) || 0;
  const progress = targetAmount > 0 ? Math.min(100, (currentBalance / targetAmount) * 100) : 0;
  const monthsToGoal = goal && targetAmount > 0 ? goalProjection(currentBalance, averageMonthly, weightedAverageRate(buckets), targetAmount) : null;
  const eta = monthsToGoal
    ? new Date(new Date().getFullYear(), new Date().getMonth() + monthsToGoal, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
    : null;

  return (
    <section className="card p-5">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-good/10 text-good">
            <Target size={20} />
          </div>
          <div>
            <h2 className="font-bold">Meta de patrimônio</h2>
            {!editing && <p className="text-sm text-muted">{brl(targetAmount)}</p>}
          </div>
        </div>
        {!editing && (
          <button
            onClick={() => {
              setTarget(targetAmount);
              setEditing(true);
            }}
            className="btn-ghost"
            aria-label="Editar meta"
          >
            <Pencil size={16} />
          </button>
        )}
      </div>
      {editing ? (
        <form
          onSubmit={e => {
            e.preventDefault();
            if (Number(target) > 0) {
              onSave(Number(target));
              setEditing(false);
            }
          }}
          className="flex gap-2"
        >
          <input
            type="number"
            min="1"
            step="0.01"
            value={target}
            onChange={e => setTarget(e.target.value)}
            placeholder="Valor alvo, ex.: 100000"
            className="field mt-0"
            autoFocus
          />
          <button className="btn-primary">Salvar</button>
          {goal && (
            <button type="button" onClick={() => setEditing(false)} className="btn-secondary">
              Cancelar
            </button>
          )}
        </form>
      ) : (
        <>
          <div className="flex justify-between text-sm">
            <span className="text-muted">Você tem</span>
            <strong>{brl(currentBalance)}</strong>
          </div>
          <div className="mt-2 h-3 overflow-hidden rounded-full bg-surface2">
            <div className="bar-fill h-full rounded-full bg-good" style={{ width: `${progress}%` }} />
          </div>
          <div className="mt-1 flex justify-between text-xs text-muted">
            <span>{progress.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%</span>
            <span>Faltam {brl(Math.max(0, targetAmount - currentBalance))}</span>
          </div>
          {monthsToGoal > 0 && averageMonthly > 0 && (
            <p className="mt-3 rounded-xl bg-good/10 p-3 text-sm text-good">
              Com aporte médio de {brl(averageMonthly)}/mês, você chega lá em cerca de{' '}
              <strong>
                {monthsToGoal} {monthsToGoal === 1 ? 'mês' : 'meses'}
              </strong>{' '}
              ({eta}).
            </p>
          )}
          {monthsToGoal === 0 && <p className="mt-3 rounded-xl bg-good/10 p-3 text-sm text-good">🎉 Parabéns! Você já atingiu sua meta!</p>}
        </>
      )}
    </section>
  );
}
