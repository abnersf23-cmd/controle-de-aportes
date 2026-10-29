import { useState } from 'react';
import { Pencil, ShieldCheck } from 'lucide-react';
import { Segmented } from '@/components/ui/Bits';
import { reserveStatus } from '@/lib/assistant';
import { brl, bucketCategory } from '@/lib/finance';

// Por padrão, contam como reserva os buckets das categorias Cofrinhos e Caixa.
const defaultReserve = balances => balances.filter(({ b }) => ['Cofrinhos', 'Caixa'].includes(b.category || bucketCategory(b.name))).map(({ b }) => b.id);

export default function ReserveCard({ assistant, balances }) {
  const { loading, settings, saveSettings, bills, suggestion } = assistant;
  const [editing, setEditing] = useState(false);
  if (loading) return null;
  const ids = settings.reserveBuckets || defaultReserve(balances);
  const chosen = balances.filter(({ b }) => ids.includes(b.id));
  const balance = chosen.reduce((s, x) => s + x.bal.balance, 0);
  // Quanto do aporte sugerido vai para os buckets da reserva, pelos percentuais deles.
  const monthlyIn = (suggestion.contribution * chosen.reduce((s, x) => s + (Number(x.b.percentage) || 0), 0)) / 100;
  const st = reserveStatus(balance, bills.average, settings.reserveMonths, monthlyIn);
  const toggle = id => saveSettings({ reserveBuckets: ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id] });

  return (
    <section className="card space-y-3 p-5">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-info/10 text-info">
            <ShieldCheck size={20} />
          </div>
          <div>
            <h2 className="font-bold">Reserva de emergência</h2>
            <p className="text-sm text-muted">Meta: {settings.reserveMonths} meses de gastos</p>
          </div>
        </div>
        <button onClick={() => setEditing(e => !e)} className="btn-ghost" aria-label="Ajustar a reserva" aria-expanded={editing}>
          <Pencil size={16} />
        </button>
      </div>

      {editing && (
        <div className="space-y-3 rounded-xl bg-surface2 p-3">
          <div>
            <span className="label mb-1.5">Quantos meses de gastos guardar?</span>
            <Segmented
              value={settings.reserveMonths}
              onChange={v => saveSettings({ reserveMonths: v })}
              options={[3, 6, 12].map(v => ({ value: v, label: `${v} meses` }))}
            />
          </div>
          <div>
            <span className="label mb-1.5">O que conta como reserva?</span>
            <div className="space-y-1">
              {balances.map(({ b }) => (
                <label key={b.id} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={ids.includes(b.id)} onChange={() => toggle(b.id)} className="h-4 w-4 accent-[rgb(var(--accent))]" />
                  {b.icon} {b.name}
                </label>
              ))}
            </div>
          </div>
        </div>
      )}

      {!bills.average ? (
        <p className="text-sm text-muted">Preencha suas contas em Gastos mensais para eu calcular o gasto médio.</p>
      ) : (
        <>
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-muted">Gasto médio por mês</span>
              <strong>{brl(bills.average)}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Reserva hoje</span>
              <strong>{brl(balance)}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Meta ({settings.reserveMonths} meses)</span>
              <strong>{brl(st.target)}</strong>
            </div>
          </div>
          <div>
            <div className="h-3 overflow-hidden rounded-full bg-surface2">
              <div className="bar-fill h-full rounded-full bg-info" style={{ width: `${st.progress}%` }} />
            </div>
            <div className="mt-1 flex justify-between text-xs text-muted">
              <span>
                Cobre {st.covered.toLocaleString('pt-BR')} {st.covered === 1 ? 'mês' : 'meses'}
              </span>
              <span>{st.missing > 0 ? `Faltam ${brl(st.missing)}` : 'Meta atingida 🎉'}</span>
            </div>
          </div>
          {st.missing > 0 && (
            <p className="rounded-xl bg-info/10 p-3 text-sm text-info">
              {st.monthsToGoal ? (
                <>
                  Com o aporte sugerido deste mês ({brl(monthlyIn)} para a reserva), você chega lá em cerca de{' '}
                  <strong>
                    {st.monthsToGoal} {st.monthsToGoal === 1 ? 'mês' : 'meses'}
                  </strong>
                  , sem contar os rendimentos.
                </>
              ) : (
                'Sem aporte sugerido para a reserva este mês, a meta não avança.'
              )}
            </p>
          )}
          <p className="text-xs text-faint">
            Média de {bills.months} {bills.months === 1 ? 'mês' : 'meses'} da planilha de gastos.
          </p>
        </>
      )}
    </section>
  );
}
