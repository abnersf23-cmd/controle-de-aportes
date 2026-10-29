import { useState } from 'react';
import { Field } from '@/components/ui/Bits';
import { simulateConsigned } from '@/lib/loan';
import { brl, pct } from '@/lib/finance';

// Simulador de consignado: parcela (tabela Price), quanto paga no total, margem e CET.
export default function Consignado() {
  const [f, setF] = useState({ amount: '', rate: '1.8', months: '24', salary: '', marginPct: '35', otherConsigned: '', fees: '', currentRate: '' });
  const set = key => e => setF(x => ({ ...x, [key]: e.target.value }));
  const ready = Number(f.amount) > 0 && Number(f.months) > 0 && f.rate !== '';
  const s = ready ? simulateConsigned(f) : null;
  return (
    <div className="grid items-start gap-4 lg:grid-cols-[1fr_1.1fr]">
      <section className="card grid gap-3 p-5 sm:grid-cols-2">
        <Field label="Quanto quer pegar (R$)"><input type="number" min="0" step="0.01" value={f.amount} onChange={set('amount')} className="field" placeholder="ex.: 5000" /></Field>
        <Field label="Juros (% ao mês)" hint="O teto do consignado muda; confira a taxa no banco."><input type="number" min="0" step="0.01" value={f.rate} onChange={set('rate')} className="field" /></Field>
        <Field label="Prazo (meses)"><input type="number" min="1" step="1" value={f.months} onChange={set('months')} className="field" /></Field>
        <Field label="Salário líquido (R$)"><input type="number" min="0" step="0.01" value={f.salary} onChange={set('salary')} className="field" /></Field>
        <Field label="Margem consignável (%)" hint="Normalmente 35% do salário para empréstimo."><input type="number" min="0" step="1" value={f.marginPct} onChange={set('marginPct')} className="field" /></Field>
        <Field label="Parcelas de consignado que já tem (R$)"><input type="number" min="0" step="0.01" value={f.otherConsigned} onChange={set('otherConsigned')} className="field" placeholder="0,00" /></Field>
        <Field label="IOF e tarifas (R$)" hint="Vazio = estimativa do IOF (0,38% + 0,0082% ao dia)."><input type="number" min="0" step="0.01" value={f.fees} onChange={set('fees')} className="field" placeholder="estimar" /></Field>
        <Field label="Juros da dívida que vai trocar (% ao mês)" hint="Opcional: cartão, cheque especial…"><input type="number" min="0" step="0.01" value={f.currentRate} onChange={set('currentRate')} className="field" placeholder="ex.: 12" /></Field>
      </section>
      <section className="card space-y-3 p-5">
        {!s ? <p className="text-sm text-muted">Preencha o valor, os juros e o prazo.</p> : <>
          <div className="grid grid-cols-2 gap-3">
            <div><p className="text-xs text-muted">Parcela</p><p className="text-2xl font-bold">{brl(s.payment)}</p></div>
            <div><p className="text-xs text-muted">Total pago</p><p className="text-2xl font-bold">{brl(s.total)}</p></div>
          </div>
          <table className="w-full text-sm"><tbody>
            <tr className="border-t border-line"><td className="py-1.5 text-muted">Juros + IOF + tarifas</td><td className="py-1.5 text-right font-semibold text-bad">{brl(s.interest)}</td></tr>
            <tr className="border-t border-line"><td className="py-1.5 text-muted">IOF e tarifas {f.fees === '' && '(estimado)'}</td><td className="py-1.5 text-right">{brl(s.costs)}</td></tr>
            <tr className="border-t border-line"><td className="py-1.5 text-muted">CET (custo efetivo total)</td><td className="py-1.5 text-right">{pct(s.cetMonthly)} ao mês · {pct(s.cetYearly)} ao ano</td></tr>
            {Number(f.salary) > 0 && <tr className="border-t border-line"><td className="py-1.5 text-muted">Margem livre</td><td className="py-1.5 text-right">{brl(s.margin)}</td></tr>}
          </tbody></table>
          {Number(f.salary) > 0 && <p className={`rounded-xl p-3 text-sm ${s.fits ? 'bg-good/10 text-good' : 'bg-bad/10 text-bad'}`}>{s.fits ? 'A parcela cabe na sua margem consignável.' : `A parcela passa da margem em ${brl(s.payment - s.margin)}. Aumente o prazo ou pegue menos.`}</p>}
          {s.savings != null && <p className={`rounded-xl p-3 text-sm ${s.savings > 0 ? 'bg-good/10 text-good' : 'bg-warn/10 text-warn'}`}>{s.savings > 0 ? <>Trocar a dívida atual pelo consignado economiza <strong>{brl(s.savings)}</strong> de juros no mesmo prazo (a parcela na dívida atual seria {brl(s.currentPayment)}).</> : 'A dívida atual sai mais barata que o consignado: não vale trocar.'}</p>}
          <p className="text-xs text-faint">Simulação pela tabela Price. O desconto vem direto no salário e não dá para atrasar: só vale para trocar uma dívida mais cara, não para gastar.</p>
        </>}
      </section>
    </div>
  );
}
