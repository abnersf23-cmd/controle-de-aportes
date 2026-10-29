import { useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, Circle, Copy, CopyPlus, Pin, Plus, Trash2 } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import BudgetCard from '@/components/cards/BudgetCard';
import DebtSimulator from '@/components/cards/DebtSimulator';
import { Field, Notice, PageHeader } from '@/components/ui/Bits';
import { useConfirm } from '@/components/ui/Confirm';
import { useAction } from '@/components/ui/Toast';
import useExpenses from '@/hooks/useExpenses';
import { db, newId } from '@/db/database';
import { applyFixed, fixedEnd, freshCopy, parcelNumber } from '@/db/expenses';
import { addMonths, monthKey } from '@/lib/dates';
import { nameKey } from '@/lib/text';
import { brl, monthLabel, round } from '@/lib/finance';
import { CATEGORIES, categoryOf, learnedCategories, totalsByCategory } from '@/lib/categories';

const empty = { income_15: '', income_30: '', items: [], fixed_applied: [] };
// fixed_id marca a linha que veio de uma conta fixa; fixed_applied lista as contas fixas que o mês já recebeu.
const toPayload = d => ({ income_15: Number(d.income_15) || 0, income_30: Number(d.income_30) || 0, fixed_applied: d.fixed_applied || [], items: (d.items || []).map(i => ({ id: i.id, name: i.name || '', vale: Number(i.vale) || 0, pagamento: Number(i.pagamento) || 0, ...(i.category ? { category: i.category } : {}), ...(i.fixed_id ? { fixed_id: i.fixed_id } : {}), ...(i.paid_15 ? { paid_15: true } : {}), ...(i.paid_30 ? { paid_30: true } : {}) })) });

// Valor da conta num dia + botão para marcar como pago (só aparece se tiver valor).
function PayCell({ value, paid, onChange, onBlur, onToggle }) {
  const has = Number(value) > 0;
  return (
    <div className="flex items-center gap-1">
      <input type="number" step="0.01" value={value || ''} onChange={onChange} onBlur={onBlur} placeholder="0,00" className={`field mt-0 ${has && paid ? 'border-good/40 text-good line-through' : ''}`} />
      {has && <button onClick={onToggle} className={`btn-ghost shrink-0 p-1.5 ${paid ? 'text-good' : ''}`} aria-pressed={!!paid} aria-label={paid ? 'Pago (clique para desmarcar)' : 'Marcar como pago'} title={paid ? 'Pago' : 'Marcar como pago'}>{paid ? <CheckCircle2 size={18} /> : <Circle size={18} />}</button>}
      {!has && <span className="w-[30px] shrink-0" />}
    </div>
  );
}

function Row({ label, value, strong, negative }) {
  return <div className="flex items-center justify-between gap-3 text-sm"><span className="text-muted">{label}</span><strong className={strong ? `text-lg ${negative ? 'text-bad' : 'text-good'}` : negative ? 'text-bad' : ''}>{value}</strong></div>;
}

export default function GastosMensais() {
  const { records, fixed, loading, save, duplicate, pinItem, unpinItem, updatePinned, setParcels } = useExpenses();
  const [parcelFor, setParcelFor] = useState(null);
  const [dupOpen, setDupOpen] = useState(false);
  const run = useAction();
  const confirm = useConfirm();
  // Mês anterior + atual + 5 à frente (o original mostrava só os 6 próximos).
  // Abas: mês anterior + atual + 5 à frente, mais qualquer mês que já tenha dados.
  const months = useMemo(() => {
    const base = Array.from({ length: 7 }, (_, i) => addMonths(monthKey(), i - 1));
    return [...new Set([...base, ...records.map(r => r.month)])].sort();
  }, [records]);
  const [month, setMonth] = useState(monthKey());
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
  const totalVale = round(data.items.reduce((s, i) => s + (Number(i.vale) || 0), 0));
  const totalPag = round(data.items.reduce((s, i) => s + (Number(i.pagamento) || 0), 0));
  const in15 = Number(data.income_15) || 0, in30 = Number(data.income_30) || 0;
  const resta15 = in15 - totalVale, resta30 = in30 - totalPag;
  // O que ainda falta pagar em cada dia (contas com valor e sem o ✓).
  const falta15 = round(data.items.reduce((s, i) => s + (i.paid_15 ? 0 : Number(i.vale) || 0), 0));
  const falta30 = round(data.items.reduce((s, i) => s + (i.paid_30 ? 0 : Number(i.pagamento) || 0), 0));
  // Categoria: a escolhida na linha, ou aprendida pelo nome em outros meses, ou sugerida por palavra-chave.
  const learned = useMemo(() => learnedCategories(records), [records]);
  const byCategory = totalsByCategory(data.items, learned);
  const setCategory = (i, category) => {
    persist({ ...data, items: data.items.map(x => (x.id === i.id ? { ...x, category } : x)) });
    if (i.fixed_id) run(() => updatePinned(month, { ...i, category }));
  };
  const togglePaid = (id, key) => persist({ ...data, items: data.items.map(i => (i.id === id ? { ...i, [key]: !i[key] } : i)) });
  const isDone = i => (Number(i.vale) > 0 || Number(i.pagamento) > 0) && (!(Number(i.vale) > 0) || i.paid_15) && (!(Number(i.pagamento) > 0) || i.paid_30);

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
        {months.map(m => <button key={m} onClick={() => { loadedFor.current = null; setMonth(m); }} className={`whitespace-nowrap rounded-xl px-3 py-2 text-xs font-semibold transition ${m === month ? 'bg-accent text-white' : 'border border-line bg-surface text-muted hover:text-ink'}`}>{monthLabel(m)}{m === monthKey() ? ' · atual' : ''}</button>)}
      </div>
      <Notice tone="info">Cada célula é salva quando você sai dela. Clique no 📌 de uma conta para ela se repetir nos próximos meses, e no ○ do valor quando pagar.</Notice>
      <div className="grid items-start gap-4 lg:grid-cols-[1.7fr_1fr]">
        <section className="card overflow-hidden">
          <div className="grid grid-cols-2 gap-3 border-b border-line p-4">
            <label className="label">Entrada dia 15 (vale)<input type="number" step="0.01" value={data.income_15} onChange={e => setData(d => ({ ...d, income_15: e.target.value }))} onBlur={commit} className="field" placeholder="0,00" /></label>
            <label className="label">Entrada dia 30 (pagamento)<input type="number" step="0.01" value={data.income_30} onChange={e => setData(d => ({ ...d, income_30: e.target.value }))} onBlur={commit} className="field" placeholder="0,00" /></label>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-sm">
              <thead><tr className="text-left text-xs text-muted"><th className="min-w-[200px] p-3">Dívida / conta</th><th className="w-36 p-3">Categoria</th><th className="w-36 p-3">Dia 15</th><th className="w-36 p-3">Dia 30</th><th className="w-10" /></tr></thead>
              <tbody>
                {data.items.map(i => (
                  <tr key={i.id} className={`border-t border-line transition ${isDone(i) ? 'opacity-60' : ''}`}>
                    <td className="p-2"><div className="flex items-center gap-1"><button onClick={() => togglePin(i)} className={`btn-ghost shrink-0 p-1.5 ${i.fixed_id ? 'text-accent' : 'text-faint'}`} aria-pressed={!!i.fixed_id} aria-label={i.fixed_id ? 'Conta fixa (clique para tirar o pin)' : 'Fixar: repetir nos próximos meses'} title={i.fixed_id ? 'Conta fixa: se repete todo mês' : 'Fixar: repetir nos próximos meses'}><Pin size={16} className={i.fixed_id ? 'fill-current' : ''} /></button><input value={i.name} onChange={e => updateItem(i.id, { name: e.target.value })} onBlur={() => commitRow(i)} placeholder="Ex.: Internet" className="field mt-0" />{i.fixed_id && <ParcelChip f={fixed.find(f => f.id === i.fixed_id)} month={month} onClick={setParcelFor} />}</div></td>
                    <td className="p-2"><select value={categoryOf(i, learned)} onChange={e => setCategory(i, e.target.value)} className={`field mt-0 py-2 text-xs ${i.category ? '' : 'text-muted'}`} aria-label={`Categoria de ${i.name || 'conta'}`} title={i.category ? '' : 'Sugerida automaticamente'}>{CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}</select></td>
                    <td className="p-2"><PayCell value={i.vale} paid={i.paid_15} onChange={e => updateItem(i.id, { vale: e.target.value })} onBlur={() => commitRow(i)} onToggle={() => togglePaid(i.id, 'paid_15')} /></td>
                    <td className="p-2"><PayCell value={i.pagamento} paid={i.paid_30} onChange={e => updateItem(i.id, { pagamento: e.target.value })} onBlur={() => commitRow(i)} onToggle={() => togglePaid(i.id, 'paid_30')} /></td>
                    <td className="p-2"><button onClick={() => persist({ ...data, items: data.items.filter(x => x.id !== i.id) })} className="btn-ghost p-2 hover:text-bad" aria-label="Remover linha"><Trash2 size={16} /></button></td>
                  </tr>
                ))}
                <tr className="border-t border-line bg-surface2 font-semibold"><td className="p-3">Total</td><td /><td className="p-3">{brl(totalVale)}</td><td className="p-3">{brl(totalPag)}</td><td /></tr>
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
          <BudgetCard byCategory={byCategory} />
          <section className="card space-y-2 p-5">
            <p className="text-xs font-bold uppercase tracking-wider text-muted">Falta pagar</p>
            <Row label="Dia 15" value={falta15 || !totalVale ? brl(falta15) : 'Tudo pago ✓'} />
            <Row label="Dia 30" value={falta30 || !totalPag ? brl(falta30) : 'Tudo pago ✓'} />
            <div className="border-t border-line pt-2"><Row label="Já pago no mês" value={brl(round(totalVale + totalPag - falta15 - falta30))} /></div>
            <p className="text-xs text-faint">Clique no ○ ao lado do valor quando pagar a conta.</p>
          </section>
          <section className="card space-y-2 p-5">
            <p className="text-xs font-bold uppercase tracking-wider text-muted">O que sobra</p>
            <Row label="Resta dia 15" value={brl(resta15)} negative={resta15 < 0} />
            <Row label="Resta dia 30" value={brl(resta30)} negative={resta30 < 0} />
            <div className="border-t border-line pt-2"><Row label="Resta no fim do mês" value={brl(resta15 + resta30)} strong negative={resta15 + resta30 < 0} /></div>
            {in15 + in30 > 0 && <div className="pt-2"><div className="h-2 overflow-hidden rounded-full bg-surface2"><div className={`h-full ${totalVale + totalPag > in15 + in30 ? 'bg-bad' : 'bg-accent'}`} style={{ width: `${Math.min(100, (totalVale + totalPag) / (in15 + in30) * 100)}%` }} /></div><p className="mt-1 text-xs text-muted">{Math.round((totalVale + totalPag) / (in15 + in30) * 100)}% da renda comprometida</p></div>}
          </section>
          <DebtSimulator fixed={fixed} month={month} />
        </div>
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


// Mostra "3/10" numa conta parcelada ou "∞" numa conta fixa sem fim; clique para definir as parcelas.
function ParcelChip({ f, month, onClick }) {
  if (!f) return null;
  const label = f.parcels ? `${parcelNumber(f, month)}/${f.parcels}` : '∞';
  const title = f.parcels ? `Parcela ${label} · termina em ${monthLabel(fixedEnd(f))}` : 'Sem fim · clique para definir parcelas';
  return <button onClick={() => onClick(f)} className="chip shrink-0 bg-surface2 text-muted hover:text-ink" title={title} aria-label={title}>{label}</button>;
}

function ParcelForm({ f, month, onSave, onCancel }) {
  const [parcels, setParcels] = useState(f.parcels ? String(f.parcels) : '');
  const [current, setCurrent] = useState(String(f.parcels ? parcelNumber(f, month) : 1));
  const total = Number(parcels) || 0, now = Number(current) || 1;
  return (
    <form className="space-y-4" onSubmit={e => { e.preventDefault(); onSave({ parcels: total, current: now }); }}>
      <Field label="Total de parcelas" hint="Deixe vazio se a conta não tem fim."><input type="number" min="1" step="1" value={parcels} onChange={e => setParcels(e.target.value)} className="field" placeholder="Ex.: 10" autoFocus /></Field>
      {total > 0 && <Field label={`Em ${monthLabel(month)} é a parcela nº`}><input type="number" min="1" max={total} step="1" value={current} onChange={e => setCurrent(e.target.value)} className="field" /></Field>}
      {total > 0 && now >= 1 && now <= total && <p className="rounded-xl bg-surface2 p-3 text-sm">Última parcela em <strong>{monthLabel(addMonths(month, total - now))}</strong>. Faltam {total - now + 1} parcela{total - now + 1 > 1 ? 's' : ''}, contando esta.</p>}
      <div className="flex justify-end gap-2"><button type="button" onClick={onCancel} className="btn-secondary">Cancelar</button><button className="btn-primary">Salvar</button></div>
    </form>
  );
}
