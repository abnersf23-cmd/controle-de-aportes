import { useState } from 'react';
import { Field } from '@/components/ui/Bits';
import { compareInvestments } from '@/lib/compare';
import { brl, pct } from '@/lib/finance';

// O mesmo valor e prazo em Tesouro Selic, CDB, LCI/LCA, FIIs e ações, já sem o imposto.
export default function Comparador({ rates }) {
  const selic = rates?.selic?.value ?? 15, cdi = rates?.cdi?.value ?? 14.9;
  const [f, setF] = useState({ amount: '1000', months: '12', cdbPct: '100', lciPct: '90', fiiDy: '10', fiiGrowth: '0', stockDy: '6', stockGrowth: '5' });
  const set = key => e => setF(x => ({ ...x, [key]: e.target.value }));
  const n = k => Number(f[k]) || 0;
  const rows = n('amount') > 0 && n('months') > 0 ? compareInvestments({ amount: n('amount'), months: n('months'), selic, cdi, cdbPct: n('cdbPct'), lciPct: n('lciPct'), fiiDy: n('fiiDy'), fiiGrowth: n('fiiGrowth'), stockDy: n('stockDy'), stockGrowth: n('stockGrowth') }) : [];
  // A barra compara o ganho (não o total): com o valor inteiro, todas as barras ficariam quase iguais.
  const best = Math.max(...rows.map(r => r.profit), 1);
  return (
    <div className="space-y-4">
      <section className="card grid gap-3 p-5 sm:grid-cols-4">
        <Field label="Valor (R$)"><input type="number" min="0" step="100" value={f.amount} onChange={set('amount')} className="field" /></Field>
        <Field label="Prazo (meses)"><input type="number" min="1" step="1" value={f.months} onChange={set('months')} className="field" /></Field>
        <Field label="CDB (% do CDI)"><input type="number" min="0" step="1" value={f.cdbPct} onChange={set('cdbPct')} className="field" /></Field>
        <Field label="LCI/LCA (% do CDI)"><input type="number" min="0" step="1" value={f.lciPct} onChange={set('lciPct')} className="field" /></Field>
        <Field label="FIIs: rendimento (% ao ano)"><input type="number" min="0" step="0.5" value={f.fiiDy} onChange={set('fiiDy')} className="field" /></Field>
        <Field label="FIIs: valorização (% ao ano)"><input type="number" step="0.5" value={f.fiiGrowth} onChange={set('fiiGrowth')} className="field" /></Field>
        <Field label="Ações: dividendos (% ao ano)"><input type="number" min="0" step="0.5" value={f.stockDy} onChange={set('stockDy')} className="field" /></Field>
        <Field label="Ações: valorização (% ao ano)"><input type="number" step="0.5" value={f.stockGrowth} onChange={set('stockGrowth')} className="field" /></Field>
      </section>
      {rows.length > 0 && <section className="card overflow-x-auto p-5">
        <table className="w-full min-w-[560px] text-sm">
          <thead><tr className="text-left text-xs text-muted"><th className="pb-2">Investimento</th><th className="pb-2 text-right">Imposto</th><th className="pb-2 text-right">Você fica com</th><th className="pb-2 text-right">Ao ano, líquido</th><th className="w-1/4 pb-2 pl-3">Ganho depois do IR</th></tr></thead>
          <tbody>{rows.map(r => (
            <tr key={r.id} className="border-t border-line">
              <td className="py-2"><strong>{r.label}</strong>{r.risk && <span className="chip ml-2 bg-warn/10 text-warn">oscila</span>}<span className="block text-xs text-faint">{r.note}</span></td>
              <td className="py-2 text-right text-muted">{brl(r.tax)}</td>
              <td className="py-2 text-right font-semibold">{brl(r.net)}</td>
              <td className="py-2 text-right">{pct(r.netYearly)}</td>
              <td className="py-2 pl-3"><div className="flex items-center gap-2"><div className="h-2 flex-1 overflow-hidden rounded-full bg-surface2"><div className="h-full rounded-full bg-accent" style={{ width: `${Math.max(2, r.profit / best * 100)}%` }} /></div><span className="w-20 text-right text-xs text-good">+{brl(r.profit)}</span></div></td>
            </tr>
          ))}</tbody>
        </table>
        <p className="mt-3 text-xs text-faint">Selic {pct(selic)} e CDI {pct(cdi)}{rates?.cdi ? ' do Banco Central' : ' (valores de exemplo)'}. Renda fixa supõe a taxa constante; FIIs e ações usam as suas suposições de rendimento e valorização, que <strong>não são garantidas</strong>: o valor pode cair. Regras de IR de 2025; ações ficam isentas se você vender até R$ 20 mil no mês.</p>
      </section>}
    </div>
  );
}
