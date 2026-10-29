import { useMemo, useState } from 'react';
import { ArrowRight, Eye, EyeOff, PiggyBank, TrendingDown, TrendingUp, Wallet } from 'lucide-react';
import BucketCard from '@/components/cards/BucketCard';
import CategoryCard from '@/components/cards/CategoryCard';
import StockBucketCard from '@/components/cards/StockBucketCard';
import GoalCard from '@/components/cards/GoalCard';
import AssistantCard from '@/components/cards/AssistantCard';
import ReserveCard from '@/components/cards/ReserveCard';
import PlanCard from '@/components/cards/PlanCard';
import CashflowCard from '@/components/cards/CashflowCard';
import BudgetAlert from '@/components/cards/BudgetAlert';
import RatesNotice from '@/components/cards/RatesNotice';
import useAssistant from '@/hooks/useAssistant';
import useMarketRates from '@/hooks/useMarketRates';
import MonthlySummary from '@/components/cards/MonthlySummary';
import DistributionChart from '@/components/charts/DistributionChart';
import PieCard from '@/components/charts/PieCard';
import Modal from '@/components/ui/Modal';
import { Notice, Stat } from '@/components/ui/Bits';
import { useAction } from '@/components/ui/Toast';
import BucketForm from '@/components/forms/BucketForm';
import WithdrawalForm from '@/components/forms/WithdrawalForm';
import ExtraForm from '@/components/forms/ExtraForm';
import RateForm from '@/components/forms/RateForm';
import DollarRateForm from '@/components/forms/DollarRateForm';
import { brl, monthKey, bucketBalance, daysSince, totalBalance, stockTotal, bucketCategory, withdrawalBrl, round, stockMarketValue, stockNetAmount, splitZeroBuckets } from '@/lib/finance';

const titles = { extra: 'Aporte avulso', withdraw: 'Registrar saque ou gasto', rate: 'Atualizar taxa', dollar: 'Atualizar cotação do dólar', edit: 'Editar bucket', mark: 'Confirmar aporte em dólar', add: 'Novo bucket' };

export default function Inicio({ data, goTo }) {
  const { buckets, records, extras, withdrawals, stocks, quotes, goals } = data;
  const run = useAction();
  const assistant = useAssistant();
  const market = useMarketRates();
  const [input, setInput] = useState('');
  const [total, setTotal] = useState(0);
  const [modal, setModal] = useState(null); // { kind, bucket }
  const [showZero, setShowZero] = useState(false);
  const close = () => setModal(null);

  const current = records.find(r => r.month === monthKey());
  const trading = buckets.filter(b => b.kind !== 'stocks');
  const stockBucket = buckets.find(b => b.kind === 'stocks');
  const dollarBucket = buckets.find(b => b.rate_type === 'fed');
  const dollarStale = daysSince(dollarBucket?.dollar_rate_updated_date);
  const balances = useMemo(() => trading.map(b => ({ b, bal: bucketBalance(b, records, extras, withdrawals) })), [trading, records, extras, withdrawals]);
  const totalValue = balances.reduce((s, x) => s + x.bal.balance, 0) + stockTotal(stocks);
  const totalYield = balances.reduce((s, x) => s + (x.bal.yield || 0) + (x.bal.exchange || 0), 0);
  const monthOut = withdrawals.filter(w => (w.date || '').slice(0, 7) === monthKey()).reduce((s, w) => s + withdrawalBrl(w), 0);
  const avgMonthly = records.length ? records.reduce((s, r) => s + r.planned_total, 0) / records.length : 0;
  const isMarked = b => !!current?.allocations.some(a => a.bucket_id === b.id);

  const categoryOf = b => b.category || bucketCategory(b.name);
  const cashItem = balances.find(({ b }) => categoryOf(b) === 'Caixa');
  const { visible, hidden } = splitZeroBuckets(balances.filter(i => i !== cashItem), total);
  const groups = (showZero ? [...visible, ...hidden] : visible).reduce((list, item) => {
    const name = categoryOf(item.b), g = list.find(x => x.name === name);
    if (g) g.items.push(item); else list.push({ name, items: [item] });
    return list;
  }, []);

  const onAction = (kind, bucket) => {
    if (kind === 'mark' && bucket.rate_type !== 'fed') return run(() => data.mark(bucket, total), `Aporte de ${brl(total * bucket.percentage / 100)} registrado em ${bucket.name}.`);
    if (kind === 'unmark') return run(() => data.unmark(bucket.id), 'Aporte do mês desmarcado.');
    setModal({ kind, bucket });
  };
  const renderBucket = ({ b, bal }) => <BucketCard key={b.id} bucket={b} balance={bal} total={total} marked={isMarked(b)} onAction={onAction} />;
  const done = async (fn, msg, opts) => { if (await run(fn, msg, opts)) close(); };
  const b = modal?.bucket;

  const fixedPie = balances.map(({ b: x, bal }) => ({ id: x.id, name: `${x.icon} ${x.name}`, value: Math.max(0, bal.balance), color: x.color }));
  const varPie = stocks.map(s => ({ id: s.id, name: s.ticker, value: stockMarketValue(s, quotes[s.ticker]) ?? stockNetAmount(s), color: s.color })).filter(d => d.value > 0);
  const varTotal = round(varPie.reduce((s, d) => s + d.value, 0));
  const fullPie = [...fixedPie, ...(varTotal > 0 ? [{ id: 'rv', name: '📊 FIIs e Ações', value: varTotal, color: stockBucket?.color || '#DC2626' }] : [])];

  return (
    <div className="space-y-6">
      <RatesNotice market={market} buckets={buckets} updateRate={data.updateRate} />
      <BudgetAlert assistant={assistant} goTo={goTo} />
      {dollarStale != null && dollarStale > 7 && <Notice>A cotação do dólar está há {dollarStale} dias sem atualizar. <button className="font-semibold underline" onClick={() => setModal({ kind: 'dollar', bucket: dollarBucket })}>Atualizar agora</button></Notice>}

      <section className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
        <div className="card relative overflow-hidden p-5">
          <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-accent/10 blur-2xl" />
          <p className="flex items-center gap-2 text-sm font-semibold text-muted"><PiggyBank size={18} className="text-accent" /> Quanto sobrou esse mês?</p>
          <form onSubmit={e => { e.preventDefault(); setTotal(Number(input) || 0); }} className="mt-3 flex items-center gap-2">
            <span className="text-xl text-faint">R$</span>
            <input value={input} onChange={e => setInput(e.target.value)} type="number" min="0" step="0.01" placeholder="0,00" className="w-full min-w-0 bg-transparent text-3xl font-bold outline-none placeholder:text-faint" />
            <button className="btn-primary h-12 w-12 shrink-0 rounded-full p-0" aria-label="Calcular divisão"><ArrowRight size={20} /></button>
          </form>
          {total > 0 ? <div className="mt-4 space-y-1.5">
            <p className="text-xs font-semibold text-muted">Divisão sugerida — marque em cada bucket quando fizer o aporte:</p>
            {buckets.map(x => <div key={x.id} className="flex items-center justify-between text-sm"><span className="text-muted">{x.icon} {x.name}</span><span className="flex items-center gap-2"><strong>{brl(total * x.percentage / 100)}</strong>{isMarked(x) && <span className="chip bg-good/10 text-good">feito</span>}</span></div>)}
          </div> : <p className="mt-3 text-xs text-faint">Digite o valor e pressione Enter para ver quanto vai para cada bucket.</p>}
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:grid-cols-1">
          <Stat icon={TrendingUp} label="Patrimônio total" value={brl(totalValue)} />
          <Stat icon={TrendingUp} label="Rendimento acumulado" value={brl(totalYield)} tone="good" />
          <Stat icon={monthOut > 0 ? TrendingDown : Wallet} iconTone={monthOut > 0 ? 'text-bad' : 'text-info'} label="Aporte do mês" value={brl(total)} hint={monthOut > 0 ? `${brl(monthOut)} em saques/gastos este mês` : 'Nenhum saque este mês'} />
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <AssistantCard assistant={assistant} buckets={buckets} goTo={goTo} onUse={v => { setInput(String(v)); setTotal(v); window.scrollTo({ top: 0, behavior: 'smooth' }); }} />
        <ReserveCard assistant={assistant} balances={balances} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <PlanCard buckets={buckets} records={records} extras={extras} stocks={stocks} />
        <CashflowCard assistant={assistant} goTo={goTo} />
      </div>

      {cashItem && <div className="grid gap-4 md:grid-cols-2">{renderBucket(cashItem)}<MonthlySummary buckets={trading} records={records} extras={extras} withdrawals={withdrawals} stocks={stocks} /></div>}

      <section>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-muted">Seus investimentos</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {stockBucket && <StockBucketCard bucket={stockBucket} stocks={stocks} quotes={quotes} onOpen={() => goTo('acoes')} />}
          {groups.map(g => <CategoryCard key={g.name} name={g.name} items={g.items} renderBucket={renderBucket} onAdd={() => setModal({ kind: 'add', bucket: { category: g.name } })} />)}
        </div>
        {hidden.length > 0 && <button type="button" onClick={() => setShowZero(v => !v)} className="mt-3 flex items-center gap-2 text-sm font-semibold text-muted transition hover:text-accent">
          {showZero ? <><EyeOff size={16} /> Ocultar buckets zerados</> : <><Eye size={16} /> Mostrar {hidden.length} {hidden.length === 1 ? 'bucket zerado' : 'buckets zerados'}</>}
        </button>}
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        {!cashItem && <MonthlySummary buckets={trading} records={records} extras={extras} withdrawals={withdrawals} stocks={stocks} />}
        <GoalCard goal={goals[0]} currentBalance={totalBalance(trading, records, extras, withdrawals, new Date(), stocks)} averageMonthly={avgMonthly} buckets={trading} onSave={v => run(() => data.saveGoal(v), 'Meta salva.')} />
        <DistributionChart buckets={buckets} total={total} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <PieCard title="Renda fixa" subtitle="Saldo atual por bucket" data={fixedPie} emptyLabel="Nenhum saldo em renda fixa ainda." />
        <PieCard title="Renda variável" subtitle="Valor de mercado por ativo" data={varPie} emptyLabel="Nenhum FII ou ação registrado ainda." />
        <PieCard title="Carteira completa" subtitle="Renda fixa + renda variável" data={fullPie} emptyLabel="Nenhum aporte registrado ainda." />
      </div>

      <Modal open={!!modal} title={titles[modal?.kind]} subtitle={b?.name} onClose={close} wide={modal?.kind === 'edit' || modal?.kind === 'add'}>
        {modal?.kind === 'extra' && <ExtraForm bucket={b} extras={extras} onCancel={close}
          onDelete={e => run(() => data.deleteExtraContribution(e.id), 'Aporte avulso excluído.', { action: { label: 'Desfazer', onClick: () => data.restore('extras', e) } })}
          onSave={f => done(() => data.addExtraContribution({ ...f, bucket_id: b.id }), 'Aporte avulso registrado.')} />}
        {modal?.kind === 'withdraw' && <WithdrawalForm bucket={b} onCancel={close} onSave={f => done(() => data.addWithdrawal(f), 'Saque/gasto registrado.')} />}
        {modal?.kind === 'rate' && <RateForm bucket={b} onCancel={close} onSave={f => done(() => data.updateRate(b.id, f), 'Taxa atualizada.')} />}
        {modal?.kind === 'dollar' && <DollarRateForm currentRate={b.current_dollar_rate} onCancel={close} onSave={r => done(() => data.updateDollarRate(b.id, r), 'Cotação atualizada.')} />}
        {modal?.kind === 'mark' && <DollarRateForm currentRate={b.last_dollar_rate || b.current_dollar_rate} submitLabel={`Confirmar ${brl(total * b.percentage / 100)}`} hint={`Informe a cotação usada na compra dos dólares. Equivale a ≈ US$ ${(total * b.percentage / 100 / (b.last_dollar_rate || b.current_dollar_rate || 1)).toFixed(2)}.`} onCancel={close} onSave={r => done(() => data.mark(b, total, r), 'Aporte em dólar registrado.')} />}
        {modal?.kind === 'edit' && <BucketForm bucket={b} allowPercentage onCancel={close} onSave={f => done(() => data.updateBucket(b.id, { name: f.name, icon: f.icon, color: f.color, category: f.category, percentage: Number(f.percentage), rate_type: f.rate_type, base_rate: Number(f.base_rate), management_fee: Number(f.management_fee), cdi_percentage: Number(f.cdi_percentage) }), 'Bucket atualizado.')} />}
        {modal?.kind === 'add' && <BucketForm category={b.category} onCancel={close} onSave={f => done(() => data.addBucket(f), 'Bucket criado e percentuais rebalanceados.')} />}
      </Modal>
    </div>
  );
}
