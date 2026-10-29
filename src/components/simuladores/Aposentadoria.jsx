import { Answer, Figure, More } from '@/components/simuladores/Parts';
import Slider from '@/components/ui/Slider';
import { compactBrl } from '@/components/charts/theme';
import useSetting from '@/hooks/useSetting';
import { retirementPlan } from '@/lib/retirement';
import { brl, pct } from '@/lib/finance';

export const RETIREMENT_DEFAULTS = { age: '', retireAge: 60, income: 3000, realRate: 4, withdrawRate: 4 };

// Quanto juntar por mês para viver de renda. Usa seu patrimônio de hoje e o aporte do plano.
// Só idade, idade de parar e renda ficam à vista; as taxas vêm com valores conservadores.
export default function Aposentadoria({ current, monthly }) {
  const [f, save] = useSetting('retirement', RETIREMENT_DEFAULTS);
  if (!f) return null;
  const put = key => value => save({ [key]: value });
  const ready = Number(f.age) > 0 && Number(f.retireAge) > Number(f.age) && Number(f.income) > 0;
  const p = ready ? retirementPlan({ ...f, current, monthly }) : null;
  const onTrack = p && p.monthlyNeeded <= monthly;

  return (
    <div className="grid items-start gap-4 lg:grid-cols-[1fr_1.1fr]">
      <section className="card space-y-4 p-5">
        <Slider label="1. Quantos anos você tem?" unit="anos" value={f.age} onChange={put('age')} min={14} max={70} placeholder="ex.: 22" />
        <Slider label="2. Com quantos anos quer parar de trabalhar?" unit="anos" value={f.retireAge} onChange={put('retireAge')} min={35} max={80} />
        <Slider
          label="3. Quanto quer receber por mês?"
          unit="R$"
          value={f.income}
          onChange={put('income')}
          min={1000}
          max={30000}
          step={500}
          format={compactBrl}
          hint="em dinheiro de hoje"
        />
        <More>
          <div className="sm:col-span-2">
            <Slider
              label="Quanto o dinheiro rende acima da inflação (% ao ano)"
              unit="%"
              value={f.realRate}
              onChange={put('realRate')}
              min={1}
              max={10}
              step={0.5}
              format={v => pct(v)}
              hint="4% é conservador"
            />
          </div>
          <div className="sm:col-span-2">
            <Slider
              label="Quanto tirar por ano depois de parar (%)"
              unit="%"
              value={f.withdrawRate}
              onChange={put('withdrawRate')}
              min={2}
              max={8}
              step={0.5}
              format={v => pct(v)}
              hint="regra dos 4%: o dinheiro dura"
            />
          </div>
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
