import { useState } from 'react';
import { Download, Plus, Trash2, TrendingDown, Wallet } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import { Empty, PageHeader, Segmented, Stat } from '@/components/ui/Bits';
import { useAction } from '@/components/ui/Toast';
import CompositionCard from '@/components/charts/CompositionCard';
import WithdrawalForm from '@/components/forms/WithdrawalForm';
import downloadCsv from '@/lib/csv';
import { brl, usd, dateLabel, withdrawalBrl, monthKey } from '@/lib/finance';
import { today } from '@/lib/dates';

export const categoryColors = { 'emergência': '#EF4444', lazer: '#8B5CF6', investimento: '#10B981', moradia: '#3B82F6', 'alimentação': '#F59E0B', 'saúde': '#EC4899', transporte: '#06B6D4', 'educação': '#84CC16', outros: '#64748B' };
// Categoria digitada à mão ganha uma cor fixa (pelo nome), em vez de tudo virar cinza.
const EXTRA = ['#F97316', '#14B8A6', '#A855F7', '#EAB308', '#0EA5E9', '#F43F5E'];
export const categoryColor = name => categoryColors[name] || EXTRA[[...String(name)].reduce((h, c) => h + c.charCodeAt(0), 0) % EXTRA.length];
const typeLabel = { gasto: 'Gasto', saque: 'Saque' };
const num = v => Number(v || 0).toFixed(2).replace('.', ',');

export default function Saques({ data }) {
  const { withdrawals, buckets } = data;
  const run = useAction();
  const [filter, setFilter] = useState('all');
  const [adding, setAdding] = useState(false);
  const filtered = filter === 'all' ? withdrawals : withdrawals.filter(w => w.type === filter);
  const totalBrl = filtered.reduce((s, w) => s + withdrawalBrl(w), 0);
  const monthBrl = withdrawals.filter(w => (w.date || '').slice(0, 7) === monthKey()).reduce((s, w) => s + withdrawalBrl(w), 0);
  const byCategory = Object.entries(filtered.reduce((acc, w) => { const c = w.category || 'outros'; acc[c] = (acc[c] || 0) + withdrawalBrl(w); return acc; }, {}))
    .map(([name, value]) => ({ name: name[0].toUpperCase() + name.slice(1), value, color: categoryColor(name) }));

  const exportCsv = () => downloadCsv(`saques-e-gastos-${today()}.csv`,
    ['Data', 'Tipo', 'Categoria', 'Ativo', 'Moeda', 'Valor', 'Cotação do dólar', 'Valor em R$', 'Observação'],
    filtered.map(w => { const d = w.dollar_rate != null; return [w.date, typeLabel[w.type] || w.type, w.category || 'outros', w.bucket_name, d ? 'USD' : 'BRL', num(w.amount), d ? num(w.dollar_rate) : '', num(withdrawalBrl(w)), w.note || '']; }));

  return (
    <div className="space-y-5">
      <PageHeader title="Saques e gastos" subtitle="Tudo que saiu dos seus buckets, por tipo e categoria.">
        <button onClick={exportCsv} disabled={!filtered.length} className="btn-secondary"><Download size={16} /> Exportar CSV</button>
        <button onClick={() => setAdding(true)} className="btn-primary"><Plus size={16} /> Registrar</button>
      </PageHeader>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Stat icon={Wallet} iconTone="text-bad" label={filter === 'all' ? 'Total retirado' : `Total em ${filter === 'gasto' ? 'gastos' : 'saques'}`} value={brl(totalBrl)} />
        <Stat icon={TrendingDown} iconTone="text-warn" label="Neste mês" value={brl(monthBrl)} />
        <Stat icon={TrendingDown} iconTone="text-info" label="Lançamentos" value={filtered.length} />
      </div>
      <div className="grid gap-4 lg:grid-cols-[1fr_1.6fr]">
        <CompositionCard title="Por categoria" subtitle="Saques e gastos tirados dos investimentos" data={byCategory} emptyLabel="Nada registrado." />
        <div className="space-y-3">
          <Segmented value={filter} onChange={setFilter} options={[{ value: 'all', label: 'Todos' }, { value: 'gasto', label: 'Gastos' }, { value: 'saque', label: 'Saques' }]} />
          {!filtered.length && <Empty>Nenhum saque ou gasto registrado.</Empty>}
          {filtered.map(w => {
            const d = w.dollar_rate != null, bucket = buckets.find(b => b.id === w.bucket_id), cat = w.category || 'outros';
            return (
              <article key={w.id} className="card flex items-center gap-3 p-4">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-lg" style={{ backgroundColor: `${categoryColor(cat)}22` }}>{bucket?.icon || '💰'}</div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <strong>{d ? usd(w.amount) : brl(w.amount)}</strong>
                    <span className={`chip ${w.type === 'gasto' ? 'bg-warn/10 text-warn' : 'bg-info/10 text-info'}`}>{typeLabel[w.type]}</span>
                    <span className="chip" style={{ backgroundColor: `${categoryColor(cat)}22`, color: categoryColor(cat) }}>{cat}</span>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-muted">{w.bucket_name} · {dateLabel(w.date)}{d ? ` · ≈ ${brl(withdrawalBrl(w))} (R$ ${Number(w.dollar_rate).toFixed(2)})` : ''}{w.note ? ` · ${w.note}` : ''}</p>
                </div>
                <button onClick={() => run(() => data.deleteWithdrawal(w.id), 'Lançamento excluído.', { action: { label: 'Desfazer', onClick: () => data.restore('withdrawals', w) } })} className="btn-ghost p-2 hover:text-bad" aria-label="Excluir"><Trash2 size={17} /></button>
              </article>
            );
          })}
        </div>
      </div>
      <Modal open={adding} title="Registrar saque ou gasto" onClose={() => setAdding(false)}>
        <WithdrawalForm buckets={buckets} onCancel={() => setAdding(false)} onSave={async f => { if (await run(() => data.addWithdrawal(f), 'Saque/gasto registrado.')) setAdding(false); }} />
      </Modal>
    </div>
  );
}
