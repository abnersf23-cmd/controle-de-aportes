import { useState } from 'react';
import { Field } from '@/components/ui/Bits';
import { Answer, Chips, More } from '@/components/simuladores/Parts';
import { compareInvestments } from '@/lib/compare';
import { brl, pct } from '@/lib/finance';

const period = m => (m < 12 ? `${m} meses` : m === 12 ? '1 ano' : `${m / 12} anos`);

// O mesmo valor e prazo em Tesouro Selic, CDB, LCI/LCA, FIIs e ações, já sem o imposto.
// À vista: só valor e prazo. As suposições de cada investimento ficam em "Ajustar detalhes".
export default function Comparador({ rates }) {
  const selic = rates?.selic?.value ?? 15,
    cdi = rates?.cdi?.value ?? 14.9;
  const [f, setF] = useState({ amount: '1000', months: '12', cdbPct: '100', lciPct: '90', fiiDy: '10', fiiGrowth: '0', stockDy: '6', stockGrowth: '5' });
  const set = key => e => setF(x => ({ ...x, [key]: e.target.value }));
  const n = k => Number(f[k]) || 0;
  const rows =
    n('amount') > 0 && n('months') > 0
      ? compareInvestments({
          amount: n('amount'),
          months: n('months'),
          selic,
          cdi,
          cdbPct: n('cdbPct'),
          lciPct: n('lciPct'),
          fiiDy: n('fiiDy'),
          fiiGrowth: n('fiiGrowth'),
          stockDy: n('stockDy'),
          stockGrowth: n('stockGrowth')
        })
      : [];
  // A barra compara o ganho (não o total): com o valor inteiro, todas as barras ficariam quase iguais.
  const best = Math.max(...rows.map(r => r.profit), 1);
  // A resposta destaca a melhor opção SEGURA; FIIs e ações dependem de suposições e podem cair.
  const safe = rows.find(r => !r.risk);

  return (
    <div className="space-y-4">
      <section className="card grid gap-4 p-5 sm:grid-cols-2">
        <Field label="1. Quanto quer investir? (R$)">
          <input type="number" min="0" step="100" value={f.amount} onChange={set('amount')} className="field" />
        </Field>
        <Field label="2. Por quanto tempo? (meses)">
          <input type="number" min="1" step="1" value={f.months} onChange={set('months')} className="field" aria-label="Prazo (meses)" />
          <Chips value={f.months} options={[6, 12, 24, 60]} onChange={v => setF(x => ({ ...x, months: v }))} format={period} />
        </Field>
        <div className="sm:col-span-2">
          <More>
            <Field label="CDB (% do CDI)" hint="100% é o comum em bancos digitais.">
              <input type="number" min="0" step="1" value={f.cdbPct} onChange={set('cdbPct')} className="field" />
            </Field>
            <Field label="LCI/LCA (% do CDI)" hint="Rende menos, mas não tem IR.">
              <input type="number" min="0" step="1" value={f.lciPct} onChange={set('lciPct')} className="field" />
            </Field>
            <Field label="FIIs: aluguel por ano (%)">
              <input type="number" min="0" step="0.5" value={f.fiiDy} onChange={set('fiiDy')} className="field" />
            </Field>
            <Field label="FIIs: valorização da cota por ano (%)">
              <input type="number" step="0.5" value={f.fiiGrowth} onChange={set('fiiGrowth')} className="field" />
            </Field>
            <Field label="Ações: dividendos por ano (%)">
              <input type="number" min="0" step="0.5" value={f.stockDy} onChange={set('stockDy')} className="field" />
            </Field>
            <Field label="Ações: valorização por ano (%)">
              <input type="number" step="0.5" value={f.stockGrowth} onChange={set('stockGrowth')} className="field" />
            </Field>
          </More>
        </div>
      </section>

      {rows.length > 0 && (
        <section className="card space-y-4 p-5">
          {safe && (
            <Answer tone="good" title={`Mais seguro que rende mais: ${safe.label}`}>
              Seus {brl(f.amount)} viram <strong>{brl(safe.net)}</strong> em {period(n('months'))}, já sem imposto ({brl(safe.profit)} de ganho).
            </Answer>
          )}
          <ul className="space-y-3">
            {rows.map(r => (
              <li key={r.id} className="grid gap-1 sm:grid-cols-[220px_1fr_110px] sm:items-center sm:gap-4">
                <div>
                  <p className="font-semibold">
                    {r.label}
                    {r.risk && <span className="chip ml-2 bg-warn/10 text-warn">pode cair</span>}
                  </p>
                  <p className="text-xs text-faint">
                    {r.note} · {pct(r.netYearly)} ao ano
                  </p>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-surface2">
                  <div
                    className={`h-full rounded-full ${r.risk ? 'bg-warn' : 'bg-accent'}`}
                    style={{ width: `${Math.max(2, (r.profit / best) * 100)}%` }}
                    title={`Ganho de ${brl(r.profit)}`}
                  />
                </div>
                <p className="text-right">
                  <strong>{brl(r.net)}</strong>
                  <span className="block text-xs text-good">+{brl(r.profit)}</span>
                </p>
              </li>
            ))}
          </ul>
          <p className="text-xs text-faint">
            Selic {pct(selic)} e CDI {pct(cdi)}
            {rates?.cdi ? ' do Banco Central' : ' (valores de exemplo)'}, supondo que fiquem iguais. FIIs e ações usam as suposições em &quot;Ajustar
            detalhes&quot;, que <strong>não são garantidas</strong>. Regras de IR de 2025.
          </p>
        </section>
      )}
    </div>
  );
}
