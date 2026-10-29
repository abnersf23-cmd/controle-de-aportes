import { Copy, Pin, Plus, Trash2 } from 'lucide-react';
import PayCell from '@/components/gastos/PayCell';
import { ParcelChip } from '@/components/gastos/Parcels';
import { brl } from '@/lib/finance';
import { CATEGORIES, categoryOf } from '@/lib/categories';

const num = v => Number(v) || 0;
// Linha toda paga: cada dia que tem valor está com o ✓.
const isDone = i => (num(i.vale) > 0 || num(i.pagamento) > 0) && (!(num(i.vale) > 0) || i.paid_15) && (!(num(i.pagamento) > 0) || i.paid_30);

// A planilha: entradas do dia 15 e 30 em cima, uma linha por conta, totais embaixo.
// Toda a lógica de salvar fica na página; aqui só desenha e avisa o que mudou.
export default function ExpenseTable({ data, totals, fixed, month, learned, on, className = '' }) {
  return (
    <section className={`card overflow-hidden ${className}`}>
      <div className="grid grid-cols-2 gap-3 border-b border-line p-4">
        <label className="label">Entrada dia 15 (vale)<input type="number" step="0.01" value={data.income_15} onChange={e => on.income('income_15', e.target.value)} onBlur={on.commit} className="field" placeholder="0,00" /></label>
        <label className="label">Entrada dia 30 (pagamento)<input type="number" step="0.01" value={data.income_30} onChange={e => on.income('income_30', e.target.value)} onBlur={on.commit} className="field" placeholder="0,00" /></label>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[680px] text-sm">
          <thead><tr className="text-left text-xs text-muted"><th className="min-w-[200px] p-3">Dívida / conta</th><th className="w-36 p-3">Categoria</th><th className="w-36 p-3">Dia 15</th><th className="w-36 p-3">Dia 30</th><th className="w-10" /></tr></thead>
          <tbody>
            {data.items.map(i => (
              <tr key={i.id} className={`border-t border-line transition ${isDone(i) ? 'opacity-60' : ''}`}>
                <td className="p-2"><div className="flex items-center gap-1">
                  <button onClick={() => on.pin(i)} className={`btn-ghost shrink-0 p-1.5 ${i.fixed_id ? 'text-accent' : 'text-faint'}`} aria-pressed={!!i.fixed_id} aria-label={i.fixed_id ? 'Conta fixa (clique para tirar o pin)' : 'Fixar: repetir nos próximos meses'} title={i.fixed_id ? 'Conta fixa: se repete todo mês' : 'Fixar: repetir nos próximos meses'}><Pin size={16} className={i.fixed_id ? 'fill-current' : ''} /></button>
                  <input value={i.name} onChange={e => on.update(i.id, { name: e.target.value })} onBlur={() => on.commitRow(i)} placeholder="Ex.: Internet" className="field mt-0" />
                  {i.fixed_id && <ParcelChip f={fixed.find(f => f.id === i.fixed_id)} month={month} onClick={on.parcels} />}
                </div></td>
                <td className="p-2"><select value={categoryOf(i, learned)} onChange={e => on.category(i, e.target.value)} className={`field mt-0 py-2 text-xs ${i.category ? '' : 'text-muted'}`} aria-label={`Categoria de ${i.name || 'conta'}`} title={i.category ? '' : 'Sugerida automaticamente'}>{CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}</select></td>
                <td className="p-2"><PayCell value={i.vale} paid={i.paid_15} onChange={e => on.update(i.id, { vale: e.target.value })} onBlur={() => on.commitRow(i)} onToggle={() => on.paid(i.id, 'paid_15')} /></td>
                <td className="p-2"><PayCell value={i.pagamento} paid={i.paid_30} onChange={e => on.update(i.id, { pagamento: e.target.value })} onBlur={() => on.commitRow(i)} onToggle={() => on.paid(i.id, 'paid_30')} /></td>
                <td className="p-2"><button onClick={() => on.remove(i.id)} className="btn-ghost p-2 hover:text-bad" aria-label="Remover linha"><Trash2 size={16} /></button></td>
              </tr>
            ))}
            <tr className="border-t border-line bg-surface2 font-semibold"><td className="p-3">Total</td><td /><td className="p-3">{brl(totals.bills15)}</td><td className="p-3">{brl(totals.bills30)}</td><td /></tr>
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center gap-2 border-t border-line p-3">
        <button onClick={on.add} className="btn-secondary"><Plus size={16} /> Adicionar linha</button>
        <button onClick={on.copyPrevious} className="btn-ghost"><Copy size={16} /> Copiar do mês anterior</button>
        <p className="ml-auto text-xs text-faint">Salva sozinho ao sair da célula · 📌 repete a conta nos próximos meses · ○ marca como pago</p>
      </div>
    </section>
  );
}
