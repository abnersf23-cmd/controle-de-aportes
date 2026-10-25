import { useEffect, useMemo, useRef, useState } from 'react';
import { Archive, Copy, CopyPlus, FileDown, Plus, Trash2 } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import { Notice, PageHeader } from '@/components/ui/Bits';
import { useAction } from '@/components/ui/Toast';
import useExpenses from '@/hooks/useExpenses';
import { useClosedMonths } from '@/hooks/useMonthClose';
import { downloadReports } from '@/services/monthReports';
import { isArchived } from '@/lib/monthClose';
import { newId } from '@/db/database';
import { addMonths, monthKey } from '@/lib/dates';
import { brl, monthLabel, round } from '@/lib/finance';

const empty = { income_15: '', income_30: '', items: [] };
const toPayload = d => ({ income_15: Number(d.income_15) || 0, income_30: Number(d.income_30) || 0, items: (d.items || []).map(i => ({ id: i.id, name: i.name || '', vale: Number(i.vale) || 0, pagamento: Number(i.pagamento) || 0 })) });

function Row({ label, value, strong, negative }) {
  return <div className="flex items-center justify-between gap-3 text-sm"><span className="text-muted">{label}</span><strong className={strong ? `text-lg ${negative ? 'text-bad' : 'text-good'}` : negative ? 'text-bad' : ''}>{value}</strong></div>;
}

export default function GastosMensais() {
  const { records, loading, save, duplicate } = useExpenses();
  const [dupOpen, setDupOpen] = useState(false);
  const run = useAction();
  const { closed } = useClosedMonths();
  const [showArchived, setShowArchived] = useState(false);
  const [month, setMonth] = useState(monthKey());
  // Abas: mês anterior + atual + 5 à frente, mais qualquer mês que já tenha dados.
  // Meses fechados (relatório já salvo, a partir do dia 2) ficam ocultos, mas os dados continuam no banco.
  const allMonths = useMemo(() => {
    const base = Array.from({ length: 7 }, (_, i) => addMonths(monthKey(), i - 1));
    return [...new Set([...base, ...records.map(r => r.month)])].sort();
  }, [records]);
  const archived = allMonths.filter(m => isArchived(m, { records, closed }));
  const months = showArchived ? allMonths : allMonths.filter(m => m === month || !archived.includes(m));
  const [data, setData] = useState(empty);
  const record = records.find(r => r.month === month);
  const loadedFor = useRef(null);

  useEffect(() => {
    if (loading || loadedFor.current === month) return;
    loadedFor.current = month;
    setData(record ? { income_15: record.income_15 ?? '', income_30: record.income_30 ?? '', items: record.items || [] } : empty);
  }, [month, record, loading]);

  const persist = next => { setData(next); save(month, toPayload(next)); };
  const commit = () => save(month, toPayload(data));
  const updateItem = (id, patch) => setData(d => ({ ...d, items: d.items.map(i => (i.id === id ? { ...i, ...patch } : i)) }));
  const totalVale = round(data.items.reduce((s, i) => s + (Number(i.vale) || 0), 0));
  const totalPag = round(data.items.reduce((s, i) => s + (Number(i.pagamento) || 0), 0));
  const in15 = Number(data.income_15) || 0, in30 = Number(data.income_30) || 0;
  const resta15 = in15 - totalVale, resta30 = in30 - totalPag;

  // Traz do mês anterior só as contas que ainda não existem neste mês.
  const copyPrevious = () => {
    const prev = records.find(r => r.month === addMonths(month, -1));
    if (!prev || !(prev.items || []).some(i => i.name)) return run(async () => { throw new Error('O mês anterior está vazio.'); });
    const names = new Set(data.items.map(i => String(i.name || '').trim().toLowerCase()));
    const missing = prev.items.filter(i => i.name && !names.has(i.name.trim().toLowerCase())).map(i => ({ ...i, id: newId() }));
    if (!missing.length) return run(async () => { throw new Error('Todas as contas do mês anterior já estão aqui.'); });
    persist({ income_15: data.income_15 === '' ? prev.income_15 ?? '' : data.income_15, income_30: data.income_30 === '' ? prev.income_30 ?? '' : data.income_30, items: [...data.items.filter(i => String(i.name || '').trim()), ...missing] });
    run(async () => {}, `${missing.length} conta${missing.length > 1 ? 's' : ''} copiada${missing.length > 1 ? 's' : ''} do mês anterior.`);
  };

  return (
    <div className="space-y-5">
      <PageHeader title="Gastos mensais" subtitle="Sua planilha por quinzena: dia 15 (vale) e dia 30 (pagamento).">
        <button onClick={() => { commit(); setDupOpen(true); }} disabled={!data.items.some(i => String(i.name || '').trim())} className="btn-primary"><CopyPlus size={16} /> Duplicar mês</button>
      </PageHeader>
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {months.map(m => <button key={m} onClick={() => { loadedFor.current = null; setMonth(m); }} className={`whitespace-nowrap rounded-xl px-3 py-2 text-xs font-semibold transition ${m === month ? 'bg-accent text-white' : 'border border-line bg-surface text-muted hover:text-ink'}`}>{monthLabel(m)}{m === monthKey() ? ' · atual' : ''}{closed[m] ? ' · fechado' : ''}</button>)}
        {archived.length > 0 && <button onClick={() => { if (showArchived && archived.includes(month)) { loadedFor.current = null; setMonth(monthKey()); } setShowArchived(v => !v); }} className="btn-ghost whitespace-nowrap py-2 text-xs"><Archive size={14} /> {showArchived ? 'Ocultar meses fechados' : `Ver meses anteriores (${archived.length})`}</button>}
      </div>
      {closed[month] && <Notice tone="good" icon={Archive}>{monthLabel(month)} já foi fechado: o relatório foi {closed[month].how === 'download' ? 'baixado' : 'salvo na pasta'} em {new Date(closed[month].reportAt).toLocaleDateString('pt-BR')}. Se você mudar algo aqui, baixe o relatório de novo. <button onClick={() => run(async () => { await commit(); await downloadReports([month], { mark: false }); }, 'Relatório baixado (HTML e CSV).')} className="ml-1 inline-flex items-center gap-1 font-semibold underline"><FileDown size={14} /> Baixar relatório</button></Notice>}
      <Notice tone="info">Cada célula é salva quando você sai dela. Os totais e o que sobra são calculados sozinhos.</Notice>
      <div className="grid items-start gap-4 lg:grid-cols-[1.7fr_1fr]">
        <section className="card overflow-hidden">
          <div className="grid grid-cols-2 gap-3 border-b border-line p-4">
            <label className="label">Entrada dia 15 (vale)<input type="number" step="0.01" value={data.income_15} onChange={e => setData(d => ({ ...d, income_15: e.target.value }))} onBlur={commit} className="field" placeholder="0,00" /></label>
            <label className="label">Entrada dia 30 (pagamento)<input type="number" step="0.01" value={data.income_30} onChange={e => setData(d => ({ ...d, income_30: e.target.value }))} onBlur={commit} className="field" placeholder="0,00" /></label>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] text-sm">
              <thead><tr className="text-left text-xs text-muted"><th className="p-3">Dívida / conta</th><th className="w-32 p-3">Dia 15</th><th className="w-32 p-3">Dia 30</th><th className="w-10" /></tr></thead>
              <tbody>
                {data.items.map(i => (
                  <tr key={i.id} className="border-t border-line">
                    <td className="p-2"><input value={i.name} onChange={e => updateItem(i.id, { name: e.target.value })} onBlur={commit} placeholder="Ex.: Internet" className="field mt-0" /></td>
                    <td className="p-2"><input type="number" step="0.01" value={i.vale || ''} onChange={e => updateItem(i.id, { vale: e.target.value })} onBlur={commit} placeholder="0,00" className="field mt-0" /></td>
                    <td className="p-2"><input type="number" step="0.01" value={i.pagamento || ''} onChange={e => updateItem(i.id, { pagamento: e.target.value })} onBlur={commit} placeholder="0,00" className="field mt-0" /></td>
                    <td className="p-2"><button onClick={() => persist({ ...data, items: data.items.filter(x => x.id !== i.id) })} className="btn-ghost p-2 hover:text-bad" aria-label="Remover linha"><Trash2 size={16} /></button></td>
                  </tr>
                ))}
                <tr className="border-t border-line bg-surface2 font-semibold"><td className="p-3">Total</td><td className="p-3">{brl(totalVale)}</td><td className="p-3">{brl(totalPag)}</td><td /></tr>
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap gap-2 border-t border-line p-3">
            <button onClick={() => persist({ ...data, items: [...data.items, { id: newId(), name: '', vale: '', pagamento: '' }] })} className="btn-secondary"><Plus size={16} /> Adicionar linha</button>
            <button onClick={copyPrevious} className="btn-ghost"><Copy size={16} /> Copiar do mês anterior</button>
          </div>
        </section>
        <div className="space-y-4">
          <section className="card space-y-2 p-5">
            <p className="text-xs font-bold uppercase tracking-wider text-muted">Total de contas</p>
            <p className="text-2xl font-bold">{brl(totalVale + totalPag)}</p>
            <div className="space-y-2 border-t border-line pt-2"><Row label="Dia 15 (vale)" value={brl(totalVale)} /><Row label="Dia 30 (pagamento)" value={brl(totalPag)} /></div>
          </section>
          <section className="card space-y-2 p-5">
            <p className="text-xs font-bold uppercase tracking-wider text-muted">O que sobra</p>
            <Row label="Resta dia 15" value={brl(resta15)} negative={resta15 < 0} />
            <Row label="Resta dia 30" value={brl(resta30)} negative={resta30 < 0} />
            <div className="border-t border-line pt-2"><Row label="Resta no fim do mês" value={brl(resta15 + resta30)} strong negative={resta15 + resta30 < 0} /></div>
            {in15 + in30 > 0 && <div className="pt-2"><div className="h-2 overflow-hidden rounded-full bg-surface2"><div className={`h-full ${totalVale + totalPag > in15 + in30 ? 'bg-bad' : 'bg-accent'}`} style={{ width: `${Math.min(100, (totalVale + totalPag) / (in15 + in30) * 100)}%` }} /></div><p className="mt-1 text-xs text-muted">{Math.round((totalVale + totalPag) / (in15 + in30) * 100)}% da renda comprometida</p></div>}
          </section>
        </div>
      </div>
      <Modal open={dupOpen} wide title="Duplicar mês" subtitle={`Copiar as contas de ${monthLabel(month)}`} onClose={() => setDupOpen(false)}>
        <DuplicateForm month={month} source={toPayload(data)} records={records} onCancel={() => setDupOpen(false)}
          onSave={async (targets, opts) => { if (await run(() => duplicate(toPayload(data), targets, opts), `Contas copiadas para ${targets.length} ${targets.length > 1 ? 'meses' : 'mês'}.`)) setDupOpen(false); }} />
      </Modal>
    </div>
  );
}

function DuplicateForm({ month, source, records, onSave, onCancel }) {
  const options = useMemo(() => Array.from({ length: 12 }, (_, i) => addMonths(month, i + 1)), [month]);
  const [targets, setTargets] = useState([options[0]]);
  const [incomes, setIncomes] = useState(true);
  const [mode, setMode] = useState('merge');
  const toggle = m => setTargets(t => (t.includes(m) ? t.filter(x => x !== m) : [...t, m].sort()));
  const withData = targets.filter(m => records.some(r => r.month === m && (r.items || []).some(i => i.name)));
  const count = source.items.filter(i => i.name.trim()).length;
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">{count} conta{count > 1 ? 's' : ''} ({brl(source.items.reduce((s, i) => s + i.vale + i.pagamento, 0))}) serão copiadas para os meses escolhidos.</p>
      <div>
        <div className="mb-1.5 flex items-center justify-between"><span className="label">Para quais meses?</span>
          <span className="flex gap-2 text-xs font-semibold"><button onClick={() => setTargets(options.slice(0, 3))} className="text-accent">Próximos 3</button><button onClick={() => setTargets(options.slice(0, 6))} className="text-accent">6</button><button onClick={() => setTargets(options)} className="text-accent">12</button><button onClick={() => setTargets([])} className="text-muted">Limpar</button></span>
        </div>
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
          {options.map(m => {
            const on = targets.includes(m), has = records.some(r => r.month === m && (r.items || []).some(i => i.name));
            return <button key={m} type="button" onClick={() => toggle(m)} className={`rounded-xl border px-2 py-2 text-xs font-semibold transition ${on ? 'border-accent bg-accent/15 text-accent' : 'border-line text-muted hover:text-ink'}`}>{monthLabel(m)}{has && <span className="block text-[10px] font-normal text-warn">já tem contas</span>}</button>;
          })}
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={incomes} onChange={e => setIncomes(e.target.checked)} className="h-4 w-4 accent-[rgb(var(--accent))]" /> Copiar também as entradas do dia 15 e do dia 30</label>
      {withData.length > 0 && <div className="space-y-2 rounded-xl border border-warn/30 bg-warn/10 p-3 text-sm">
        <p className="font-semibold text-warn">{withData.length} {withData.length > 1 ? 'meses escolhidos já têm' : 'mês escolhido já tem'} contas. O que fazer?</p>
        <label className="flex items-start gap-2"><input type="radio" checked={mode === 'merge'} onChange={() => setMode('merge')} className="mt-0.5" /><span><strong>Juntar</strong> <span className="text-muted">— mantém o que já está lá e adiciona só as contas que faltam (pelo nome).</span></span></label>
        <label className="flex items-start gap-2"><input type="radio" checked={mode === 'replace'} onChange={() => setMode('replace')} className="mt-0.5" /><span><strong>Substituir</strong> <span className="text-muted">— apaga as contas desses meses e deixa igual a {monthLabel(month)}.</span></span></label>
      </div>}
      <div className="flex justify-end gap-2"><button onClick={onCancel} className="btn-secondary">Cancelar</button><button disabled={!targets.length} onClick={() => onSave(targets, { incomes, mode })} className="btn-primary">Duplicar para {targets.length} {targets.length === 1 ? 'mês' : 'meses'}</button></div>
    </div>
  );
}
