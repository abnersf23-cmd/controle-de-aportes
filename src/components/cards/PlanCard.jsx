import { useState } from 'react';
import { ClipboardCheck, Pencil } from 'lucide-react';
import useSetting from '@/hooks/useSetting';
import { PLAN_DEFAULTS, contributionPlan } from '@/lib/plan';
import { brl, monthKey, monthLabel } from '@/lib/finance';

// Previsto x realizado: o aporte planejado do mês dividido pelos % dos buckets, ao lado do que entrou.
export default function PlanCard({ buckets, records, extras, stocks }) {
  const [plan, savePlan] = useSetting('contributionPlan', PLAN_DEFAULTS);
  const [editing, setEditing] = useState(false);
  if (!plan) return null;
  const month = monthKey();
  const st = contributionPlan(buckets, { records, extras, stocks }, month, plan.monthly);

  return (
    <section className="card space-y-3 p-5">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-good/10 text-good">
            <ClipboardCheck size={20} />
          </div>
          <div>
            <h2 className="font-bold">Previsto x realizado</h2>
            <p className="text-sm text-muted">
              Aportes de {monthLabel(month)} · plano de {brl(plan.monthly)}/mês
            </p>
          </div>
        </div>
        <button onClick={() => setEditing(e => !e)} className="btn-ghost" aria-label="Mudar o aporte planejado" aria-expanded={editing}>
          <Pencil size={16} />
        </button>
      </div>

      {editing && (
        <form
          className="flex items-end gap-2 rounded-xl bg-surface2 p-3"
          onSubmit={e => {
            e.preventDefault();
            savePlan({ monthly: Math.max(0, Number(new FormData(e.currentTarget).get('monthly')) || 0) });
            setEditing(false);
          }}
        >
          <label className="label flex-1">
            Aporte planejado por mês (R$)
            <input name="monthly" type="number" min="0" step="10" defaultValue={plan.monthly} className="field" autoFocus />
          </label>
          <button className="btn-primary">Salvar</button>
        </form>
      )}

      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-muted">
            <th className="pb-1 font-semibold">Bucket</th>
            <th className="pb-1 text-right font-semibold">Previsto</th>
            <th className="pb-1 text-right font-semibold">Entrou</th>
            <th className="pb-1 text-right font-semibold">Diferença</th>
          </tr>
        </thead>
        <tbody>
          {st.rows.map(r => (
            <tr key={r.id} className="border-t border-line">
              <td className="py-1.5">
                <span className="text-muted">
                  {r.icon} {r.name}
                </span>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface2">
                  <div className={`h-full rounded-full ${r.diff >= 0 ? 'bg-good' : 'bg-warn'}`} style={{ width: `${r.progress}%` }} />
                </div>
              </td>
              <td className="py-1.5 text-right">{brl(r.planned)}</td>
              <td className="py-1.5 text-right font-semibold">{brl(r.actual)}</td>
              <td className={`py-1.5 text-right font-semibold ${r.diff >= 0 ? 'text-good' : 'text-warn'}`}>
                {r.diff > 0 ? '+' : ''}
                {brl(r.diff)}
              </td>
            </tr>
          ))}
          <tr className="border-t border-line font-bold">
            <td className="py-1.5">Total</td>
            <td className="py-1.5 text-right">{brl(st.planned)}</td>
            <td className="py-1.5 text-right">{brl(st.actual)}</td>
            <td className={`py-1.5 text-right ${st.diff >= 0 ? 'text-good' : 'text-warn'}`}>
              {st.diff > 0 ? '+' : ''}
              {brl(st.diff)}
            </td>
          </tr>
        </tbody>
      </table>
      {st.missing > 0 ? (
        <p className="rounded-xl bg-warn/10 p-3 text-sm text-warn">Faltam {brl(st.missing)} para fechar o plano deste mês.</p>
      ) : (
        st.planned > 0 && <p className="rounded-xl bg-good/10 p-3 text-sm text-good">Plano do mês cumprido 🎉</p>
      )}
      <p className="text-xs text-faint">"Entrou" = aporte marcado no bucket + aportes avulsos do mês. Em FIIs e Ações valem as compras registradas no mês.</p>
    </section>
  );
}
