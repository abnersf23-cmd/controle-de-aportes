import { useState } from 'react';
import { Field } from '@/components/ui/Bits';
import { Answer, Figure, More } from '@/components/simuladores/Parts';
import Slider from '@/components/ui/Slider';
import { compactBrl } from '@/components/charts/theme';
import { simulateConsigned } from '@/lib/loan';
import { brl, pct } from '@/lib/finance';

// Simulador de consignado: quanto fica a parcela, quanto você devolve no total e se cabe no salário.
// Só o valor e o prazo são obrigatórios; juros, margem e tarifas já vêm com valores comuns.
export default function Consignado() {
  const [f, setF] = useState({ amount: '5000', months: '24', salary: '', rate: '1.8', marginPct: '35', otherConsigned: '', fees: '', currentRate: '' });
  const set = key => e => setF(x => ({ ...x, [key]: e.target.value }));
  const put = key => value => setF(x => ({ ...x, [key]: value }));
  const ready = Number(f.amount) > 0 && Number(f.months) > 0 && f.rate !== '';
  const s = ready ? simulateConsigned(f) : null;
  const hasSalary = Number(f.salary) > 0;
  const extra = s ? s.total - Number(f.amount) : 0;

  return (
    <div className="grid items-start gap-4 lg:grid-cols-[1fr_1.1fr]">
      <section className="card space-y-4 p-5">
        <Slider label="1. Quanto você precisa?" unit="R$" value={f.amount} onChange={put('amount')} min={500} max={50000} step={500} format={compactBrl} />
        <Slider label="2. Em quantos meses quer pagar?" unit="meses" value={f.months} onChange={put('months')} min={6} max={96} step={6} format={m => `${m}`} />
        <Field label="3. Quanto cai na sua conta por mês? (R$)" hint="Opcional. Serve para ver se a parcela cabe no limite do consignado.">
          <input type="number" min="0" step="0.01" value={f.salary} onChange={set('salary')} className="field" placeholder="salário líquido" />
        </Field>
        <More>
          <div className="sm:col-span-2">
            <Slider
              label="Juros (% ao mês)"
              unit="%"
              value={f.rate}
              onChange={put('rate')}
              min={0.5}
              max={4}
              step={0.05}
              format={v => pct(v)}
              hint="1,8% é comum; use a do banco"
            />
          </div>
          <Field label="Limite do salário para consignado (%)" hint="Em geral, 35% do salário.">
            <input type="number" min="0" step="1" value={f.marginPct} onChange={set('marginPct')} className="field" />
          </Field>
          <Field label="Parcelas de consignado que você já paga (R$)">
            <input type="number" min="0" step="0.01" value={f.otherConsigned} onChange={set('otherConsigned')} className="field" placeholder="0,00" />
          </Field>
          <Field label="IOF e tarifas (R$)" hint="Em branco, o app estima o IOF (imposto do empréstimo).">
            <input type="number" min="0" step="0.01" value={f.fees} onChange={set('fees')} className="field" placeholder="estimar" />
          </Field>
          <Field label="Vai usar para quitar outra dívida? Juros dela (% ao mês)" hint="Ex.: cartão de crédito costuma passar de 10% ao mês.">
            <input type="number" min="0" step="0.01" value={f.currentRate} onChange={set('currentRate')} className="field" placeholder="ex.: 12" />
          </Field>
        </More>
      </section>

      <section className="card space-y-3 p-5">
        {!s ? (
          <p className="text-sm text-muted">Diga quanto precisa e em quantos meses quer pagar.</p>
        ) : (
          <>
            <Answer tone={hasSalary ? (s.fits ? 'good' : 'bad') : 'info'} title={`${f.months} parcelas de ${brl(s.payment)}`}>
              Você pega {brl(f.amount)} e devolve {brl(s.total)} no total, ou seja, <strong>{brl(extra)} a mais</strong> de juros e impostos.
              {hasSalary &&
                (s.fits
                  ? ' A parcela cabe no limite do seu salário.'
                  : ` A parcela passa do limite do seu salário em ${brl(s.payment - s.margin)}: aumente o prazo ou pegue menos.`)}
            </Answer>
            <div className="grid grid-cols-2 gap-3">
              <Figure label="Você recebe" value={brl(f.amount)} />
              <Figure label="Você devolve" value={brl(s.total)} hint={`${brl(extra)} a mais`} />
              <Figure label="Custo real por ano" value={pct(s.cetYearly)} hint="CET: juros + IOF + tarifas" />
              {hasSalary ? (
                <Figure label="Limite livre no salário" value={brl(s.margin)} hint={`${pct(f.marginPct)} do salário`} />
              ) : (
                <Figure label="IOF e tarifas" value={brl(s.costs)} hint={f.fees === '' ? 'estimado' : undefined} />
              )}
            </div>
            {s.savings != null && (
              <Answer tone={s.savings > 0 ? 'good' : 'warn'} title={s.savings > 0 ? `Trocar a dívida economiza ${brl(s.savings)}` : 'Não vale trocar'}>
                {s.savings > 0
                  ? `Pagando a mesma dívida com os juros dela, a parcela seria ${brl(s.currentPayment)}.`
                  : 'A dívida que você tem hoje sai mais barata que o consignado.'}
              </Answer>
            )}
            <p className="text-xs text-faint">
              A parcela é descontada direto do salário e não dá para atrasar. Vale para trocar uma dívida mais cara, não para gastar. Conta pela tabela Price.
            </p>
          </>
        )}
      </section>
    </div>
  );
}
