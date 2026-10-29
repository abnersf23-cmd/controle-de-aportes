import { useEffect, useMemo, useRef, useState } from 'react';
import { Archive, CopyPlus, FileDown, Scale } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import BudgetCard from '@/components/cards/BudgetCard';
import ExpenseTable from '@/components/gastos/ExpenseTable';
import SheetSummary from '@/components/gastos/SheetSummary';
import DuplicateForm from '@/components/gastos/DuplicateForm';
import { ParcelForm } from '@/components/gastos/Parcels';
import { Notice, PageHeader } from '@/components/ui/Bits';
import { useConfirm } from '@/components/ui/Confirm';
import { useAction } from '@/components/ui/Toast';
import useExpenses from '@/hooks/useExpenses';
import { useClosedMonths } from '@/hooks/useMonthClose';
import { downloadReports } from '@/services/monthReports';
import { isArchived } from '@/lib/monthClose';
import { db, newId } from '@/db/database';
import { applyFixed, freshCopy } from '@/db/expenses';
import { addMonths, monthKey } from '@/lib/dates';
import { nameKey } from '@/lib/text';
import { monthLabel } from '@/lib/finance';
import { sheetTotals } from '@/lib/sheet';
import { learnedCategories, totalsByCategory } from '@/lib/categories';

const empty = { income_15: '', income_30: '', items: [], fixed_applied: [] };
// fixed_id marca a linha que veio de uma conta fixa; fixed_applied lista as contas fixas que o mês já recebeu.
const toPayload = d => ({ income_15: Number(d.income_15) || 0, income_30: Number(d.income_30) || 0, fixed_applied: d.fixed_applied || [], items: (d.items || []).map(i => ({ id: i.id, name: i.name || '', vale: Number(i.vale) || 0, pagamento: Number(i.pagamento) || 0, ...(i.category ? { category: i.category } : {}), ...(i.fixed_id ? { fixed_id: i.fixed_id } : {}), ...(i.paid_15 ? { paid_15: true } : {}), ...(i.paid_30 ? { paid_30: true } : {}) })) });

export default function GastosMensais({ goTo }) {
  const { records, fixed, loading, save, duplicate, pinItem, unpinItem, updatePinned, setParcels } = useExpenses();
  const [parcelFor, setParcelFor] = useState(null);
  const [dupOpen, setDupOpen] = useState(false);
  const run = useAction();
  const confirm = useConfirm();
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

  const persist = next => { setData(next); save(month, toPayload(next)); };
  // Mostra o mês e, se faltar alguma conta fixa nele, já inclui e salva.
  const show = (rec, fx) => {
    const base = rec ? { income_15: rec.income_15 ?? '', income_30: rec.income_30 ?? '', items: rec.items || [], fixed_applied: rec.fixed_applied || [] } : empty;
    const next = applyFixed(fx, month, base);
    if (next) persist(next); else setData(base);
  };

  useEffect(() => {
    if (loading || loadedFor.current === month) return;
    loadedFor.current = month;
    show(record, fixed);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- carrega uma vez por mês (loadedFor), não a cada edição das contas fixas
  }, [month, record, loading]);

  // Depois de fixar/desafixar, relê o mês direto do banco (os outros meses já foram atualizados).
  const reload = async () => show(await db.expenses.where('month').equals(month).first(), await db.fixed.toArray());
  const togglePin = async i => {
    await commit();
    if (!i.fixed_id) {
      if (await run(() => pinItem(month, i), `"${i.name}" fixada: vai se repetir de ${monthLabel(month)} em diante.`)) await reload();
    } else if (await confirm(`Tirar o pin de "${i.name}"?`, { message: `A linha continua em ${monthLabel(month)}, mas sai dos meses seguintes.`, confirmLabel: 'Tirar pin' })) {
      if (await run(() => unpinItem(month, i.fixed_id), 'Pin removido.')) await reload();
    }
  };
  const onSaveParcels = async values => {
    await commit();
    if (await run(() => setParcels(parcelFor.id, month, values), values.parcels ? 'Parcelas salvas.' : 'Conta sem fim.')) { setParcelFor(null); await reload(); }
  };
  // Sair de uma célula de linha fixada leva o novo nome/valor para os meses seguintes.
  const commitRow = i => { commit(); if (i.fixed_id) run(() => updatePinned(month, i)); };
  const commit = () => save(month, toPayload(data));
  const updateItem = (id, patch) => setData(d => ({ ...d, items: d.items.map(i => (i.id === id ? { ...i, ...patch } : i)) }));
  const totals = sheetTotals(data);
  const parcelled = fixed.filter(f => f.parcels && f.start <= month && data.items.some(i => i.fixed_id === f.id)).length;
  // Categoria: a escolhida na linha, ou aprendida pelo nome em outros meses, ou sugerida por palavra-chave.
  const learned = useMemo(() => learnedCategories(records), [records]);
  const byCategory = totalsByCategory(data.items, learned);
  const setCategory = (i, category) => {
    persist({ ...data, items: data.items.map(x => (x.id === i.id ? { ...x, category } : x)) });
    if (i.fixed_id) run(() => updatePinned(month, { ...i, category }));
  };
  const togglePaid = (id, key) => persist({ ...data, items: data.items.map(i => (i.id === id ? { ...i, [key]: !i[key] } : i)) });

  // Traz do mês anterior só as contas que ainda não existem neste mês.
  const copyPrevious = () => {
    const prev = records.find(r => r.month === addMonths(month, -1));
    if (!prev || !(prev.items || []).some(i => i.name)) return run(async () => { throw new Error('O mês anterior está vazio.'); });
    const names = new Set(data.items.map(i => nameKey(i.name)));
    const missing = prev.items.filter(i => i.name && !names.has(nameKey(i.name))).map(freshCopy);
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
      {/* Resumo primeiro: a planilha precisa de largura, então só fica ao lado em telas bem largas. */}
      <div className="grid items-start gap-4 2xl:grid-cols-[1.7fr_1fr]">
        <div className="grid items-start gap-4 md:grid-cols-2 2xl:order-2 2xl:grid-cols-1">
          <SheetSummary t={totals} />
          <BudgetCard byCategory={byCategory} />
          {parcelled > 0 && <button onClick={() => goTo('simuladores/antecipar')} className="card lift flex w-full items-center gap-3 p-4 text-left text-sm"><Scale size={18} className="shrink-0 text-accent" /><span className="flex-1"><strong>{parcelled} {parcelled > 1 ? 'contas parceladas' : 'conta parcelada'}</strong><span className="block text-xs text-muted">Vale antecipar? Veja quanto de juros você economiza.</span></span></button>}
        </div>
        <ExpenseTable className="2xl:order-1" data={data} totals={totals} fixed={fixed} month={month} learned={learned} on={{
          income: (key, value) => setData(d => ({ ...d, [key]: value })), commit, commitRow, update: updateItem, pin: togglePin, parcels: setParcelFor,
          category: setCategory, paid: togglePaid, remove: id => persist({ ...data, items: data.items.filter(x => x.id !== id) }),
          add: () => persist({ ...data, items: [...data.items, { id: newId(), name: '', vale: '', pagamento: '' }] }), copyPrevious
        }} />
      </div>
      <Modal open={!!parcelFor} title="Parcelas" subtitle={parcelFor?.name} onClose={() => setParcelFor(null)}>
        {parcelFor && <ParcelForm f={parcelFor} month={month} onCancel={() => setParcelFor(null)} onSave={onSaveParcels} />}
      </Modal>
      <Modal open={dupOpen} wide title="Duplicar mês" subtitle={`Copiar as contas de ${monthLabel(month)}`} onClose={() => setDupOpen(false)}>
        <DuplicateForm month={month} source={toPayload(data)} records={records} onCancel={() => setDupOpen(false)}
          onSave={async (targets, opts) => { if (await run(() => duplicate(toPayload(data), targets, opts), `Contas copiadas para ${targets.length} ${targets.length > 1 ? 'meses' : 'mês'}.`)) setDupOpen(false); }} />
      </Modal>
    </div>
  );
}
