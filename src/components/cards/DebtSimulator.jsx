import { useState } from 'react';
import { Field } from '@/components/ui/Bits';
import { Answer, Figure, More } from '@/components/simuladores/Parts';
import useMarketRates from '@/hooks/useMarketRates';
import { interestSavings, simulateAnticipation } from '@/lib/debt';
import { brl, pct } from '@/lib/finance';
import { parcelNumber } from '@/db/expenses';

const blank = { parcel: '', remaining: '' };

// "Vale antecipar as parcelas?": quanto de juros você economiza e se é melhor que deixar o dinheiro investido.
// As contas parceladas dos Gastos mensais aparecem como atalho e já preenchem os campos.
export default function DebtSimulator({ fixed, month }) {
  const debts = fixed
    .filter(f => f.parcels && f.first && f.start <= month)
    .map(f => {
      const now = parcelNumber(f, month);
      return { id: f.id, name: f.name, parcel: (Number(f.vale) || 0) + (Number(f.pagamento) || 0), remaining: f.parcels - now, now, total: f.parcels };
    })
    .filter(d => d.now >= 1 && d.remaining > 0);
  const [picked, setPicked] = useState(debts[0] || blank);

  return (
    <div className="space-y-4">
      {debts.length > 0 && (
        <section className="card space-y-2 p-4">
          <p className="text-sm font-semibold text-muted">Suas contas parceladas: escolha uma para preencher</p>
          <div className="flex flex-wrap gap-1.5">
            {[...debts, { ...blank, id: 'outra', name: 'Outra dívida' }].map(d => (
              <button
                key={d.id}
                type="button"
                onClick={() => setPicked(d.id === 'outra' ? blank : d)}
                className={`rounded-lg border px-3 py-1.5 text-sm font-semibold transition ${(picked.id || 'outra') === d.id ? 'border-accent bg-accent/10 text-accent' : 'border-line text-muted hover:text-ink'}`}
              >
                {d.name}
                {d.total && <span className="ml-1 text-xs font-normal opacity-70">faltam {d.remaining}</span>}
              </button>
            ))}
          </div>
        </section>
      )}
      {/* key: trocar de conta recomeça o formulário com os valores dela. */}
      <SimulatorForm key={picked.id || 'outra'} debt={picked} />
    </div>
  );
}

function SimulatorForm({ debt }) {
  const { rates } = useMarketRates();
  const [f, setF] = useState({
    parcel: debt.parcel,
    remaining: debt.remaining,
    count: '',
    debtRate: '',
    investRate: rates?.cdi?.value ?? 14.9,
    taxFree: false
  });
  const set = key => e => setF(x => ({ ...x, [key]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));
  const remaining = Number(f.remaining) || 0;
  // Em branco = todas as que faltam (quitar).
  const count = Math.min(f.count === '' ? remaining : Number(f.count) || 0, remaining);
  const ready = Number(f.parcel) > 0 && remaining > 0 && f.debtRate !== '';
  const saved = ready ? interestSavings({ ...f, count }) : null;
  const s = ready && f.investRate !== '' ? simulateAnticipation({ ...f, count }) : null;
  const all = count === remaining;
  const noInterest = ready && Number(f.debtRate) === 0;

  return (
    <div className="grid items-start gap-4 lg:grid-cols-[1fr_1.1fr]">
      <section className="card space-y-4 p-5">
        <Field label="1. Valor da parcela (R$)">
          <input type="number" min="0" step="0.01" value={f.parcel} onChange={set('parcel')} className="field" />
        </Field>
        <Field label="2. Quantas parcelas ainda faltam?">
          <input type="number" min="1" step="1" value={f.remaining} onChange={set('remaining')} className="field" />
        </Field>
        <Field label="3. Juros do contrato (% ao mês)" hint="Está no contrato, no carnê ou no app do banco. Compra parcelada “sem juros”? Digite 0.">
          <input type="number" min="0" step="0.01" value={f.debtRate} onChange={set('debtRate')} placeholder="ex.: 2,5" className="field" />
        </Field>
        <More>
          <Field label="Quantas antecipar" hint="Em branco = todas (quitar). As últimas têm mais desconto.">
            <input type="number" min="1" step="1" max={f.remaining} value={f.count} onChange={set('count')} placeholder="todas" className="field" />
          </Field>
          <Field
            label="Quanto seu dinheiro rende investido (% ao ano)"
            hint={rates?.cdi ? `Sugestão: CDI de ${pct(rates.cdi.value)}.` : 'Ex.: a taxa do seu Tesouro ou CDB.'}
          >
            <input type="number" min="0" step="0.01" value={f.investRate} onChange={set('investRate')} className="field" />
          </Field>
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input type="checkbox" checked={f.taxFree} onChange={set('taxFree')} className="h-4 w-4 accent-[rgb(var(--accent))]" />O investimento é isento de IR
            (LCI/LCA)
          </label>
        </More>
      </section>

      <section className="card space-y-3 p-5">
        {!saved ? (
          <p className="text-sm text-muted">Preencha a parcela, quantas faltam e os juros do contrato.</p>
        ) : noInterest ? (
          <Answer tone="info" title="Sem juros: não vale antecipar">
            Antecipar não dá desconto. Deixe o dinheiro rendendo e pague as parcelas em dia.
          </Answer>
        ) : (
          <>
            <Answer
              tone={!s || s.better !== 'investir' ? 'good' : 'info'}
              title={`${all ? 'Quitando hoje' : `Antecipando ${count} ${count === 1 ? 'parcela' : 'parcelas'}`}, você economiza ${brl(all ? saved.payoff : saved.anticipate)}`}
            >
              {s &&
                (s.better === 'investir' ? (
                  <>
                    Mas o seu investimento rende mais que os juros da dívida: deixar o dinheiro aplicado te deixa com{' '}
                    <strong>{brl(Math.abs(s.advantage))} a mais</strong>.
                  </>
                ) : s.better === 'antecipar' ? (
                  <>
                    E vale mais que investir: no fim você fica com <strong>{brl(s.advantage)} a mais</strong> do que se deixasse o dinheiro aplicado.
                  </>
                ) : (
                  'Dá praticamente no mesmo que deixar o dinheiro investido.'
                ))}
            </Answer>
            <div className="grid grid-cols-2 gap-3">
              {all ? (
                <>
                  <Figure label="Para quitar, você paga hoje" value={brl(saved.payoffCost)} />
                  <Figure label="Pagando as parcelas, seriam" value={brl(saved.totalLeft)} />
                </>
              ) : (
                <>
                  <Figure
                    label={`Antecipando ${count} ${count === 1 ? 'parcela' : 'parcelas'}`}
                    value={brl(saved.anticipateCost)}
                    hint={`em vez de ${brl(count * Number(f.parcel))}`}
                  />
                  <Figure label="Quitando tudo hoje" value={brl(saved.payoffCost)} hint={`em vez de ${brl(saved.totalLeft)}`} />
                </>
              )}
            </div>
            <p className="text-xs text-faint">
              A loja ou o banco é obrigado a dar o desconto dos juros quando você antecipa (Código de Defesa do Consumidor). Antes de usar o dinheiro, veja se a
              reserva de emergência continua cheia.
            </p>
          </>
        )}
      </section>
    </div>
  );
}
