import { Field } from '@/components/ui/Bits';
import useSetting from '@/hooks/useSetting';
import { retirementPlan } from '@/lib/retirement';
import { brl, pct } from '@/lib/finance';

export const RETIREMENT_DEFAULTS = { age: '', retireAge: 60, income: 3000, realRate: 4, withdrawRate: 4 };

// Quanto juntar por mês para viver de renda. Usa seu patrimônio de hoje e o aporte do plano.
export default function Aposentadoria({ current, monthly }) {
  const [f, save] = useSetting('retirement', RETIREMENT_DEFAULTS);
  if (!f) return null;
  const set = key => e => save({ [key]: e.target.value });
  const ready = Number(f.age) > 0 && Number(f.retireAge) > Number(f.age) && Number(f.income) > 0;
  const p = ready ? retirementPlan({ ...f, current, monthly }) : null;
  return (
    <div className="grid items-start gap-4 lg:grid-cols-[1fr_1.1fr]">
      <section className="card grid gap-3 p-5 sm:grid-cols-2">
        <Field label="Sua idade">
          <input type="number" min="0" step="1" value={f.age} onChange={set('age')} className="field" placeholder="ex.: 22" />
        </Field>
        <Field label="Quer se aposentar com">
          <input type="number" min="0" step="1" value={f.retireAge} onChange={set('retireAge')} className="field" />
        </Field>
        <Field label="Renda por mês (R$ de hoje)">
          <input type="number" min="0" step="100" value={f.income} onChange={set('income')} className="field" />
        </Field>
        <Field label="Rendimento acima da inflação (% ao ano)" hint="4% a 5% é uma suposição conservadora para longo prazo.">
          <input type="number" min="0" step="0.5" value={f.realRate} onChange={set('realRate')} className="field" />
        </Field>
        <Field label="Quanto tirar por ano (%)" hint="Regra dos 4%: tirar 4% ao ano faz o dinheiro durar.">
          <input type="number" min="1" step="0.5" value={f.withdrawRate} onChange={set('withdrawRate')} className="field" />
        </Field>
        <div className="rounded-xl bg-surface2 p-3 text-xs text-muted sm:col-span-2">
          Hoje: {brl(current)} investidos e {brl(monthly)} de aporte por mês (o plano da tela Início).
        </div>
      </section>
      <section className="card space-y-3 p-5">
        {!p ? (
          <p className="text-sm text-muted">Preencha sua idade, a idade em que quer parar e a renda que quer ter.</p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-muted">Precisa juntar</p>
                <p className="text-2xl font-bold">{brl(p.target)}</p>
              </div>
              <div>
                <p className="text-xs text-muted">Aporte por mês para chegar lá</p>
                <p className="text-2xl font-bold text-accent">{brl(p.monthlyNeeded)}</p>
              </div>
            </div>
            <p className={`rounded-xl p-3 text-sm ${p.monthlyNeeded <= monthly ? 'bg-good/10 text-good' : 'bg-info/10 text-info'}`}>
              {p.monthlyNeeded <= monthly ? (
                <>
                  Com os {brl(monthly)} por mês de hoje você já chega lá
                  {p.ageReached != null && (
                    <>
                      {' '}
                      por volta dos <strong>{Math.floor(p.ageReached)} anos</strong>
                    </>
                  )}
                  .
                </>
              ) : (
                <>
                  Mantendo {brl(monthly)} por mês, aos {f.retireAge} anos você teria {brl(p.projected)}, uma renda de cerca de{' '}
                  <strong>{brl(p.incomeProjected)}</strong> por mês
                  {p.ageReached != null && (
                    <>
                      ; a renda de {brl(f.income)} viria por volta dos {Math.floor(p.ageReached)} anos
                    </>
                  )}
                  .
                </>
              )}
            </p>
            <p className="text-xs text-faint">
              Valores em dinheiro de hoje, com {pct(f.realRate)} ao ano acima da inflação durante {Math.round(p.months / 12)} anos. É uma conta de longo prazo:
              revise todo ano. Não inclui INSS.
            </p>
          </>
        )}
      </section>
    </div>
  );
}
