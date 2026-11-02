import { useEffect, useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { ArrowLeft, Check, DollarSign, Pencil, PiggyBank, Plus, RefreshCw, Sprout, TrendingDown, Undo2, Wallet } from 'lucide-react';
import { db } from '@/db/database';
import Modal from '@/components/ui/Modal';
import { Empty, Stat } from '@/components/ui/Bits';
import { useAction } from '@/components/ui/Toast';
import TimelineChart, { TYPE_LABEL } from '@/components/charts/TimelineChart';
import BucketForm from '@/components/forms/BucketForm';
import ExtraForm from '@/components/forms/ExtraForm';
import RateForm from '@/components/forms/RateForm';
import DollarRateForm from '@/components/forms/DollarRateForm';
import WithdrawalForm from '@/components/forms/WithdrawalForm';
import useSetting from '@/hooks/useSetting';
import { withdrawalCategories } from '@/lib/withdrawalCategories';
import { PLAN_DEFAULTS, contributionPlan } from '@/lib/plan';
import { SNAPSHOT_KEY, buildTimeline, computedBalances, contributionEvents, monthRange, timelineSummary, trimEmptyStart } from '@/lib/history';
import { brl, bucketBalance, dateLabel, daysSince, effectiveRate, monthKey, monthLabel, pct, usd } from '@/lib/finance';

const typeCls = {
  mensal: 'bg-good/10 text-good',
  avulso: 'bg-accent/10 text-accent',
  saque: 'bg-warn/10 text-warn'
};
const titles = {
  extra: 'Aporte avulso',
  withdraw: 'Registrar saque ou gasto',
  rate: 'Atualizar taxa',
  dollar: 'Atualizar cotação do dólar',
  edit: 'Editar bucket'
};

// O id do bucket vem do endereço: #bucket/<id>. Ouve o hashchange para trocar de bucket sem recarregar.
function useBucketId() {
  const read = () => window.location.hash.slice(1).split('/')[1] || '';
  const [id, setId] = useState(read);
  useEffect(() => {
    const onHash = () => setId(read());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);
  return id;
}

// Página de um bucket de renda fixa (Caixa, Tesouro, Dólar...), no mesmo estilo de "FIIs e Ações":
// saldo, rendimento, aporte do mês, a curva de evolução e todos os lançamentos.
// O aporte do MÊS não é feito aqui: ele é feito no Início, em "Quanto sobrou esse mês?" → "aportei".
export default function Bucket({ data, goTo }) {
  const { buckets, records, extras, withdrawals, stocks } = data;
  const id = useBucketId();
  const bucket = buckets.find(b => b.id === id && b.kind !== 'stocks');
  const run = useAction();
  const [plan] = useSetting('contributionPlan', PLAN_DEFAULTS);
  const snapshots = useLiveQuery(async () => (await db.settings.get(SNAPSHOT_KEY))?.value || {}, []);
  const [modal, setModal] = useState(null);
  const close = () => setModal(null);
  const done = async (fn, msg, opts) => {
    if (await run(fn, msg, opts)) close();
  };

  const events = useMemo(() => contributionEvents({ buckets, records, extras, withdrawals, stocks }), [buckets, records, extras, withdrawals, stocks]);
  const months = useMemo(() => monthRange(events[0]?.month, monthKey()), [events]);
  const computed = useMemo(
    () => computedBalances(months, { buckets, records, extras, withdrawals, stocks }),
    [months, buckets, records, extras, withdrawals, stocks]
  );
  const points = useMemo(
    () => (bucket ? trimEmptyStart(buildTimeline({ months, computed, events, snapshots: snapshots || {}, asset: bucket.id })) : []),
    [bucket, months, computed, events, snapshots]
  );

  if (!bucket)
    return (
      <div className="space-y-5">
        <button onClick={() => goTo('inicio/carteira')} className="btn-ghost -ml-2">
          <ArrowLeft size={16} /> Voltar para a Carteira
        </button>
        <Empty>Este bucket não existe mais. Ele pode ter sido removido em Gerenciar ativos.</Empty>
      </div>
    );

  const isDollar = bucket.rate_type === 'fed';
  const bal = bucketBalance(bucket, records, extras, withdrawals);
  const summary = timelineSummary(points);
  const month = monthKey();
  const row = plan ? contributionPlan([bucket], { records, extras, stocks }, month, plan.monthly).rows[0] : null;
  const marked = records.find(r => r.month === month)?.allocations.find(a => a.bucket_id === bucket.id);
  const dollarStale = isDollar ? daysSince(bucket.dollar_rate_updated_date) : null;
  const grouped = points
    .flatMap(p => p.events)
    .reverse()
    .reduce((list, e) => {
      const g = list.find(x => x.month === e.month);
      if (g) g.items.push(e);
      else list.push({ month: e.month, items: [e] });
      return list;
    }, []);

  return (
    <div className="space-y-5">
      <button onClick={() => goTo('inicio/carteira')} className="btn-ghost -ml-2 text-sm">
        <ArrowLeft size={16} /> Carteira
      </button>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid h-12 w-12 place-items-center rounded-xl text-3xl" style={{ backgroundColor: `${bucket.color}1f` }}>
            {bucket.icon}
          </span>
          <div>
            <h1 className="page-title">{bucket.name}</h1>
            <p className="page-subtitle">
              {pct(bucket.percentage)} do aporte · {pct(effectiveRate(bucket))} a.a. · taxa de {dateLabel(bucket.rate_updated_date)}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setModal('extra')} className="btn-primary">
            <Plus size={16} /> Aporte avulso
          </button>
          <button onClick={() => setModal('withdraw')} className="btn-secondary">
            <TrendingDown size={16} /> Saque/gasto
          </button>
          <button onClick={() => setModal('rate')} className="btn-secondary">
            <RefreshCw size={16} /> Taxa
          </button>
          {isDollar && (
            <button onClick={() => setModal('dollar')} className="btn-secondary">
              <DollarSign size={16} /> Cotação
            </button>
          )}
          <button onClick={() => setModal('edit')} className="btn-ghost" aria-label="Editar bucket">
            <Pencil size={16} />
          </button>
        </div>
      </div>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat icon={Wallet} label="Saldo" value={isDollar ? usd(bal.usdBalance) : brl(bal.balance)} hint={isDollar ? `≈ ${brl(bal.balance)}` : 'calculado'} />
        <Stat icon={PiggyBank} iconTone="text-info" label="Total aportado" value={brl(bal.contributed)} />
        <Stat icon={Sprout} iconTone="text-good" label="Rendimento" value={isDollar ? usd(bal.usdYield) : brl(bal.yield)} tone="good" />
        {isDollar ? (
          <Stat
            label="Variação cambial"
            value={brl(bal.exchange)}
            tone={(bal.exchange || 0) >= 0 ? 'good' : 'bad'}
            hint={`R$ ${Number(bucket.current_dollar_rate || 0).toFixed(2)}${dollarStale > 7 ? ` · há ${dollarStale} dias` : ''}`}
          />
        ) : (
          <Stat label="Taxa efetiva" value={`${pct(effectiveRate(bucket))} a.a.`} />
        )}
      </section>

      {/* Aporte do mês: só mostra o status. O registro é feito no Início ("Quanto sobrou esse mês?"). */}
      <section className="card flex flex-wrap items-center justify-between gap-3 p-5">
        <div>
          <h3 className="font-bold">Aporte de {monthLabel(month)}</h3>
          {row && (
            <p className="text-sm text-muted">
              Previsto {brl(row.planned)} · realizado <strong className={row.actual >= row.planned ? 'text-good' : 'text-ink'}>{brl(row.actual)}</strong>
              {row.diff < 0 && ` · faltam ${brl(-row.diff)}`}
            </p>
          )}
        </div>
        {marked ? (
          <div className="flex items-center gap-2">
            <span className="chip bg-good/10 text-good">
              <Check size={13} /> {brl(marked.amount)} registrado
            </span>
            <button
              onClick={() => run(() => data.unmark(bucket.id), 'Aporte do mês desmarcado.')}
              className="btn-ghost text-xs"
              title="Desfaz o aporte do mês deste bucket"
            >
              <Undo2 size={14} /> Desmarcar
            </button>
          </div>
        ) : (
          <button onClick={() => goTo('inicio/mes')} className="btn-secondary">
            Fazer pelo &quot;Quanto sobrou esse mês?&quot;
          </button>
        )}
      </section>

      <section className="card p-5">
        <h3 className="font-bold">Evolução</h3>
        <p className="mb-3 text-xs text-muted">Ponto verde = aporte; ponto vermelho = saque ou gasto.</p>
        {points.length < 2 ? (
          <p className="py-10 text-center text-sm text-muted">O gráfico aparece a partir do segundo mês com lançamento.</p>
        ) : (
          <TimelineChart points={points} />
        )}
        {summary && (
          <p className="mt-3 text-xs text-muted">
            Desde {monthLabel(summary.from)}: saiu do seu bolso {brl(summary.invested)} e rendeu {brl(summary.gain)}.
          </p>
        )}
      </section>

      <section className="space-y-3">
        <h3 className="font-bold">Lançamentos</h3>
        {!grouped.length && <Empty>Nenhum lançamento ainda neste bucket.</Empty>}
        {grouped.map(g => (
          <article key={g.month} className="card p-4">
            <strong>{monthLabel(g.month)}</strong>
            <ul className="mt-2 divide-y divide-line">
              {g.items.map((e, i) => (
                <li key={i} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <div className="min-w-0">
                    <span className={`chip mr-2 ${typeCls[e.type] || ''}`}>{TYPE_LABEL[e.type]}</span>
                    <span className="text-xs text-muted">
                      {e.type === 'mensal' ? monthLabel(e.month) : dateLabel(e.date)}
                      {e.note ? ` · ${e.note}` : ''}
                    </span>
                  </div>
                  <strong className={e.amount >= 0 ? 'text-good' : 'text-bad'}>
                    {e.amount >= 0 ? '+' : ''}
                    {brl(e.amount)}
                  </strong>
                </li>
              ))}
            </ul>
          </article>
        ))}
      </section>

      <Modal open={!!modal} title={titles[modal]} subtitle={bucket.name} onClose={close} wide={modal === 'edit'}>
        {modal === 'extra' && (
          <ExtraForm
            bucket={bucket}
            extras={extras}
            onCancel={close}
            onDelete={e =>
              run(() => data.deleteExtraContribution(e.id), 'Aporte avulso excluído.', {
                action: { label: 'Desfazer', onClick: () => data.restore('extras', e) }
              })
            }
            onSave={f => done(() => data.addExtraContribution({ ...f, bucket_id: bucket.id }), 'Aporte avulso registrado.')}
          />
        )}
        {modal === 'withdraw' && (
          <WithdrawalForm
            bucket={bucket}
            categories={withdrawalCategories(withdrawals)}
            onCancel={close}
            onSave={f => done(() => data.addWithdrawal(f), 'Saque/gasto registrado.')}
          />
        )}
        {modal === 'rate' && <RateForm bucket={bucket} onCancel={close} onSave={f => done(() => data.updateRate(bucket.id, f), 'Taxa atualizada.')} />}
        {modal === 'dollar' && (
          <DollarRateForm
            currentRate={bucket.current_dollar_rate}
            onCancel={close}
            onSave={r => done(() => data.updateDollarRate(bucket.id, r), 'Cotação atualizada.')}
          />
        )}
        {modal === 'edit' && (
          <BucketForm
            bucket={bucket}
            allowPercentage
            onCancel={close}
            onSave={f =>
              done(
                () =>
                  data.updateBucket(bucket.id, {
                    name: f.name,
                    icon: f.icon,
                    color: f.color,
                    category: f.category,
                    percentage: Number(f.percentage),
                    rate_type: f.rate_type,
                    base_rate: Number(f.base_rate),
                    management_fee: Number(f.management_fee),
                    cdi_percentage: Number(f.cdi_percentage)
                  }),
                'Bucket atualizado.'
              )
            }
          />
        )}
      </Modal>
    </div>
  );
}
