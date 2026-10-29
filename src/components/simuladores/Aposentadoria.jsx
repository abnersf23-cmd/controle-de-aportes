import { Field } from '@/components/ui/Bits';
import { Answer, Chips, Figure, More } from '@/components/simuladores/Parts';
import useSetting from '@/hooks/useSetting';
import { retirementPlan } from '@/lib/retirement';
import { brl, pct } from '@/lib/finance';

export const RETIREMENT_DEFAULTS = { age: '', retireAge: 60, income: 3000, realRate: 4, withdrawRate: 4 };

// Quanto juntar por mês para viver de renda. Usa seu patrimônio de hoje e o aporte do plano.
// Só idade, idade de parar e renda ficam à vista; as taxas vêm com valores conservadores.
export default function Aposentadoria({ current, monthly }) {
  const [f, save] = useSetting('retirement', RETIREMENT_DEFAULTS);
  if (!f) return null;
  const set = key => e => save({ [key]: e.target.value });
  const put = key => value => save({ [key]: value });
  const ready = Number(f.age) > 0 && Number(f.retireAge) > Number(f.age) && Number(f.income) > 0;
  const p = ready ? retirementPlan({ ...f, current, monthly }) : null;
  const onTrack = p && p.monthlyNeeded <= monthly;

  return (
    <div className="grid items-start gap-4 lg:grid-cols-[1fr_1.1fr]">
      <section className="card space-y-4 p-5">
        <Field label="1. Quantos anos você tem?">
          <input type="number" min="0" step="1" value={f.age} onChange={set('age')} className="field" placeholder="ex.: 22" />
        </Field>
        <Field label="2. Com quantos anos quer parar de trabalhar?">
          <input type="number" min="0" step="1" value={f.retireAge} onChange={set('retireAge')} className="field" />
          <Chips value={f.retireAge} options={[45, 50, 55, 60, 65]} onChange={put('retireAge')} format={a => `${a} anos`} />
        </Field>
        <Field label="3. Quanto quer receber por mês? (R$)" hint="Pense no dinheiro de hoje: o app já desconta a inflação.">
          <input type="number" min="0" step="100" value={f.income} onChange={set('income')} className="field" />
          <Chips value={f.income} options={[2000, 3000, 5000, 10000]} onChange={put('income')} format={v => brl(v).replace(',00', '')} />
        </Field>
        <More>
          <Field label="Quanto o dinheiro rende acima da inflação (% ao ano)" hint="4% é uma suposição conservadora para muitos anos.">
            <input type="number" min="0" step="0.5" value={f.realRate} onChange={set('realRate')} className="field" />
          </Field>
          <Field label="Quanto tirar por ano depois de parar (%)" hint="Regra dos 4%: tirando 4% ao ano, o dinheiro tende a durar a vida toda.">
            <input type="number" min="1" step="0.5" value={f.withdrawRate} onChange={set('withdrawRate')} className="field" />
          </Field>
        </More>
      </section>

      <section className="card space-y-3 p-5">
        {!p ? (
          <p className="text-sm text-muted">Diga sua idade para ver quanto precisa juntar.</p>
        ) : (
          <>
            <Answer tone={onTrack ? 'good' : 'info'} title={`Guarde ${brl(p.monthlyNeeded)} por mês`}>
              Assim você junta {brl(p.target)} até os {f.retireAge} anos e pode tirar {brl(f.income)} por mês sem o dinheiro acabar.
            </Answer>
            <div className="grid grid-cols-2 gap-3">
              <Figure label="Você tem hoje" value={brl(current)} />
              <Figure label="Seu aporte hoje" value={`${brl(monthly)}/mês`} hint="o plano da tela Início" />
            </div>
            <p className={`rounded-xl p-3 text-sm ${onTrack ? 'bg-good/10 text-good' : 'bg-surface2 text-muted'}`}>
              {onTrack ? (
                <>
                  Com o que você já guarda, chega lá
                  {p.ageReached != null && (
                    <>
                      {' '}
                      por volta dos <strong>{Math.floor(p.ageReached)} anos</strong>
                    </>
                  )}
                  . 🎉
                </>
              ) : (
                <>
                  Guardando só {brl(monthly)} por mês, aos {f.retireAge} anos você receberia cerca de <strong>{brl(p.incomeProjected)}</strong> por mês.
                </>
              )}
            </p>
            <p className="text-xs text-faint">
              Tudo em dinheiro de hoje, supondo {pct(f.realRate)} ao ano acima da inflação por {Math.round(p.months / 12)} anos. Não conta o INSS. Revise uma
              vez por ano.
            </p>
          </>
        )}
      </section>
    </div>
  );
}
