import { useState } from 'react';
import { Scale } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import { Field } from '@/components/ui/Bits';
import useMarketRates from '@/hooks/useMarketRates';
import { interestSavings, simulateAnticipation } from '@/lib/debt';
import { brl, pct } from '@/lib/finance';
import { parcelNumber } from '@/db/expenses';

// Lista as contas parceladas do mês e abre o simulador "antecipar parcelas x investir".
export default function DebtSimulator({ fixed, month }) {
  const [open, setOpen] = useState(null);
  const debts = fixed.filter(f => f.parcels && f.first && f.start <= month).map(f => {
    const now = parcelNumber(f, month);
    return { id: f.id, name: f.name, parcel: (Number(f.vale) || 0) + (Number(f.pagamento) || 0), remaining: f.parcels - now, now, total: f.parcels };
  }).filter(d => d.now >= 1 && d.remaining > 0);

  return (
    <section className="card space-y-3 p-5">
      <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted"><Scale size={14} /> Antecipar ou investir?</p>
      {debts.length ? <ul className="space-y-1.5 text-sm">{debts.map(d => <li key={d.id} className="flex items-center gap-2"><span className="flex-1 text-muted">{d.name} <span className="text-xs text-faint">{d.now}/{d.total} · faltam {d.remaining}</span></span><button className="btn-ghost py-1 text-xs font-semibold text-accent" onClick={() => setOpen(d)}>Simular</button></li>)}</ul>
        : <p className="text-sm text-muted">Nenhuma conta parcelada com parcelas pela frente. Marque uma conta com 📌 e defina as parcelas, ou simule outra dívida.</p>}
      <button className="btn-secondary w-full" onClick={() => setOpen({ name: '', parcel: '', remaining: '' })}>Simular outra dívida</button>
      <Modal open={!!open} wide title="Antecipar parcelas ou investir?" subtitle={open?.name || 'Outra dívida'} onClose={() => setOpen(null)}>
        {open && <SimulatorForm debt={open} />}
      </Modal>
    </section>
  );
}

function SimulatorForm({ debt }) {
  const { rates } = useMarketRates();
  const [f, setF] = useState({ parcel: debt.parcel, remaining: debt.remaining, count: debt.remaining, debtRate: '', investRate: rates?.cdi?.value ?? '', taxFree: false });
  const set = key => e => setF(x => ({ ...x, [key]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));
  const count = Math.min(Number(f.count) || 0, Number(f.remaining));
  const hasDebt = Number(f.parcel) > 0 && Number(f.remaining) > 0 && f.debtRate !== '';
  const s = hasDebt && f.investRate !== '' ? simulateAnticipation({ ...f, count }) : null;
  const saved = hasDebt ? interestSavings({ ...f, count }) : null;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Valor da parcela (R$)"><input type="number" min="0" step="0.01" value={f.parcel} onChange={set('parcel')} className="field" /></Field>
        <Field label="Parcelas que faltam"><input type="number" min="1" step="1" value={f.remaining} onChange={set('remaining')} className="field" /></Field>
        <Field label="Quantas antecipar" hint="As últimas, que têm mais desconto."><input type="number" min="1" step="1" max={f.remaining} value={f.count} onChange={set('count')} className="field" /></Field>
        <Field label="Juros do contrato (% ao mês)" hint="Está no contrato ou no app do banco (taxa mensal)."><input type="number" min="0" step="0.01" value={f.debtRate} onChange={set('debtRate')} placeholder="ex.: 2,5" className="field" /></Field>
        <Field label="Rendimento do investimento (% ao ano)" hint={rates?.cdi ? `Sugestão: CDI de ${pct(rates.cdi.value)}.` : 'Ex.: a taxa do seu Tesouro ou CDB.'}><input type="number" min="0" step="0.01" value={f.investRate} onChange={set('investRate')} className="field" /></Field>
        <label className="flex items-center gap-2 self-end pb-3 text-sm"><input type="checkbox" checked={f.taxFree} onChange={set('taxFree')} className="h-4 w-4 accent-[rgb(var(--accent))]" />Investimento isento de IR (LCI/LCA)</label>
      </div>
      {saved && <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl bg-good/10 p-3 text-sm text-good"><p className="text-xs font-semibold uppercase tracking-wider opacity-80">Antecipando {count} {count === 1 ? 'parcela' : 'parcelas'}</p><p className="text-xl font-bold">{brl(saved.anticipate)}</p><p>de juros a menos (paga {brl(saved.anticipateCost)} hoje)</p></div>
        <div className="rounded-xl bg-good/10 p-3 text-sm text-good"><p className="text-xs font-semibold uppercase tracking-wider opacity-80">Quitando tudo</p><p className="text-xl font-bold">{brl(saved.payoff)}</p><p>de juros a menos (paga {brl(saved.payoffCost)} em vez de {brl(saved.totalLeft)})</p></div>
      </div>}
      {!s ? <p className="rounded-xl bg-surface2 p-3 text-sm text-muted">{hasDebt ? 'Preencha o rendimento do investimento para comparar com investir.' : 'Preencha os juros do contrato para ver quanto de juros você economiza.'}</p> : <>
        <table className="w-full text-sm">
          <tbody>
            <tr className="border-b border-line"><td className="py-1.5 text-muted">{s.count} parcelas de {brl(f.parcel)}</td><td className="py-1.5 text-right">{brl(s.nominal)}</td></tr>
            <tr className="border-b border-line"><td className="py-1.5 text-muted">Para antecipar hoje você paga</td><td className="py-1.5 text-right font-semibold">{brl(s.cost)}</td></tr>
            <tr className="border-b border-line"><td className="py-1.5 text-muted">Se investir esses {brl(s.cost)} até a última parcela</td><td className="py-1.5 text-right">{brl(s.investFinal)}</td></tr>
            <tr><td className="py-1.5 text-muted">Se antecipar e investir as parcelas que deixou de pagar</td><td className="py-1.5 text-right">{brl(s.anticipateFinal)}</td></tr>
          </tbody>
        </table>
        <p className={`rounded-xl p-3 text-sm ${s.better === 'antecipar' ? 'bg-good/10 text-good' : s.better === 'investir' ? 'bg-info/10 text-info' : 'bg-surface2 text-muted'}`}>
          {s.better === 'empate' ? 'Dá praticamente no mesmo.' : <><strong>{s.better === 'antecipar' ? 'Antecipar' : 'Investir'}</strong> deixa você com {brl(Math.abs(s.advantage))} a mais na data da última parcela.</>}{' '}
          A dívida custa {pct(f.debtRate)} ao mês; o investimento rende cerca de {pct(s.investNetMonthly)} ao mês já descontado o IR.
        </p>
        <p className="text-xs text-faint">Simulação: supõe taxas constantes e o desconto pelo valor presente (direito garantido pelo Código de Defesa do Consumidor). Antes de antecipar, confira se a reserva de emergência continua cheia: dinheiro usado para quitar não volta se surgir um imprevisto.</p>
      </>}
    </div>
  );
}
