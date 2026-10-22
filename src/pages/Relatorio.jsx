import { useMemo, useState } from 'react';
import { Activity, ArrowDownRight, ArrowUpRight, ChevronLeft, ChevronRight, Download, TrendingDown, TrendingUp, Wallet } from 'lucide-react';
import { Empty, PageHeader, Segmented, Stat } from '@/components/ui/Bits';
import PatrimonyChart from '@/components/charts/PatrimonyChart';
import downloadCsv from '@/lib/csv';
import { today, toDateKey } from '@/lib/dates';
import { brl, usd, dateLabel, monthLabel, totalBalance, round, patrimonyEvolution, withdrawalBrl } from '@/lib/finance';

const typeMeta = {
  aporte: { label: 'Aporte', icon: ArrowUpRight, cls: 'bg-good/10 text-good' },
  gasto: { label: 'Gasto', icon: ArrowDownRight, cls: 'bg-warn/10 text-warn' },
  saque: { label: 'Saque', icon: ArrowDownRight, cls: 'bg-info/10 text-info' },
  venda: { label: 'Venda de ativo', icon: ArrowDownRight, cls: 'bg-bad/10 text-bad' }
};

function weekRange(ref) {
  const d = new Date(`${ref}T12:00:00`);
  const day = d.getDay();
  const monday = new Date(d); monday.setDate(d.getDate() - day + (day === 0 ? -6 : 1));
  const sunday = new Date(monday); sunday.setDate(monday.getDate() + 6);
  return { start: toDateKey(monday), end: toDateKey(sunday) };
}
function shift(ref, period, dir) {
  const d = new Date(`${ref}T12:00:00`);
  if (period === 'dia') d.setDate(d.getDate() + dir);
  else if (period === 'semana') d.setDate(d.getDate() + 7 * dir);
  else d.setMonth(d.getMonth() + dir, 1);
  return toDateKey(d);
}

export default function Relatorio({ data }) {
  const { records, extras, withdrawals, buckets, stocks } = data;
  const [period, setPeriod] = useState('mes');
  const [ref, setRef] = useState(today());

  const all = useMemo(() => [
    ...records.flatMap(r => (r.allocations || []).map(a => ({ id: `mr-${r.id}-${a.bucket_id}`, date: `${r.month}-01`, bucket_id: a.bucket_id, name: a.bucket_name, type: 'aporte', amount: Number(a.amount) || 0, note: 'Aporte mensal', color: a.color }))),
    ...extras.map(e => ({ id: `ex-${e.id}`, date: e.date, bucket_id: e.bucket_id, name: e.bucket_name, type: 'aporte', amount: Number(e.amount) || 0, note: e.note || 'Aporte avulso' })),
    ...stocks.flatMap(s => (s.contributions || []).map(c => ({ id: `st-${s.id}-${c.id}`, date: c.date, name: s.ticker, type: c.kind === 'sell' ? 'venda' : 'aporte', amount: Number(c.amount) || 0, note: c.note || '', color: s.color }))),
    ...withdrawals.map(w => ({ id: `wd-${w.id}`, date: w.date, bucket_id: w.bucket_id, name: w.bucket_name, type: w.type || 'gasto', amount: Number(w.amount) || 0, note: w.note || '', dollar_rate: w.dollar_rate }))
  ], [records, extras, withdrawals, stocks]);

  const filtered = useMemo(() => {
    let list;
    if (period === 'dia') list = all.filter(t => t.date === ref);
    else if (period === 'semana') { const { start, end } = weekRange(ref); list = all.filter(t => t.date >= start && t.date <= end); }
    else list = all.filter(t => (t.date || '').slice(0, 7) === ref.slice(0, 7));
    return list.sort((a, b) => String(b.date).localeCompare(String(a.date)));
  }, [all, period, ref]);

  // Aportes estão sempre em R$; saques em bucket de dólar estão em US$.
  const toBrl = t => (t.type === 'aporte' || t.type === 'venda' ? t.amount : withdrawalBrl(t));
  const inSum = filtered.filter(t => t.type === 'aporte').reduce((s, t) => s + toBrl(t), 0);
  const outSum = filtered.filter(t => t.type !== 'aporte').reduce((s, t) => s + toBrl(t), 0);
  const net = inSum - outSum;

  const evolution = useMemo(() => patrimonyEvolution(buckets, records, extras, withdrawals, stocks), [buckets, records, extras, withdrawals, stocks]);
  const variation = useMemo(() => {
    const now = new Date();
    const cur = totalBalance(buckets, records, extras, withdrawals, now, stocks);
    const prev = totalBalance(buckets, records, extras, withdrawals, new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59), stocks);
    return prev > 0 ? round((cur - prev) / prev * 100) : null;
  }, [buckets, records, extras, withdrawals, stocks]);

  const label = period === 'dia' ? dateLabel(ref) : period === 'semana' ? `Semana de ${dateLabel(weekRange(ref).start)} a ${dateLabel(weekRange(ref).end)}` : monthLabel(ref.slice(0, 7));
  const colorOf = t => t.color || buckets.find(b => b.id === t.bucket_id)?.color || '#64748b';
  const exportCsv = () => downloadCsv(`relatorio-${ref}.csv`, ['Data', 'Tipo', 'Ativo', 'Valor em R$', 'Observação'], filtered.map(t => [t.date, typeMeta[t.type].label, t.name, toBrl(t).toFixed(2).replace('.', ','), t.note]));

  return (
    <div className="space-y-5">
      <PageHeader title="Relatório" subtitle="Aportes, vendas, gastos e saques por período.">
        <button onClick={exportCsv} disabled={!filtered.length} className="btn-secondary"><Download size={16} /> Exportar CSV</button>
      </PageHeader>
      <section className="card flex flex-wrap items-center gap-3 p-3">
        <Segmented value={period} onChange={setPeriod} options={[{ value: 'dia', label: 'Dia' }, { value: 'semana', label: 'Semana' }, { value: 'mes', label: 'Mês' }]} />
        <div className="flex items-center gap-1">
          <button onClick={() => setRef(r => shift(r, period, -1))} className="btn-ghost p-2" aria-label="Período anterior"><ChevronLeft size={18} /></button>
          <span className="min-w-40 text-center text-sm font-semibold">{label}</span>
          <button onClick={() => setRef(r => shift(r, period, 1))} className="btn-ghost p-2" aria-label="Próximo período"><ChevronRight size={18} /></button>
        </div>
        <input type="date" value={ref} onChange={e => e.target.value && setRef(e.target.value)} className="field mt-0 w-auto" />
        <button onClick={() => setRef(today())} className="btn-ghost text-xs">Hoje</button>
      </section>
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat icon={TrendingUp} label="Total aportado" value={brl(inSum)} />
        <Stat icon={TrendingDown} iconTone="text-bad" label="Total retirado" value={brl(outSum)} />
        <Stat icon={Wallet} label="Saldo líquido" value={brl(net)} tone={net >= 0 ? 'good' : 'bad'} />
        <Stat icon={Activity} iconTone="text-info" label="Patrimônio vs mês anterior" value={variation != null ? `${variation >= 0 ? '+' : ''}${variation.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%` : 'Sem base'} tone={variation == null ? 'ink' : variation >= 0 ? 'good' : 'bad'} />
      </section>
      <PatrimonyChart data={evolution} />
      <p className="text-sm font-medium text-muted">{filtered.length} lançamento{filtered.length !== 1 ? 's' : ''} no período</p>
      <div className="space-y-2">
        {!filtered.length && <Empty>Nenhum lançamento neste período.</Empty>}
        {filtered.map(t => {
          const meta = typeMeta[t.type], Icon = meta.icon, dollarOut = t.type !== 'aporte' && t.dollar_rate != null;
          return (
            <article key={t.id} className="card flex items-center gap-3 p-3.5">
              <i className="h-10 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: colorOf(t) }} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2"><strong>{dollarOut ? usd(t.amount) : brl(t.amount)}</strong><span className={`chip ${meta.cls}`}><Icon size={13} /> {meta.label}</span></div>
                <p className="mt-0.5 truncate text-xs text-muted">{t.name} · {dateLabel(t.date)}{dollarOut ? ` · ≈ ${brl(toBrl(t))}` : ''}{t.note ? ` · ${t.note}` : ''}</p>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
