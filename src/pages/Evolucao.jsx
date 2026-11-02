import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Flag, PiggyBank, Sprout, Wallet } from 'lucide-react';
import { db } from '@/db/database';
import { Empty, PageHeader, Stat } from '@/components/ui/Bits';
import TimelineChart, { TYPE_LABEL } from '@/components/charts/TimelineChart';
import { monthKey } from '@/lib/dates';
import { brl, dateLabel, monthLabel, pct } from '@/lib/finance';
import {
  ALL_STOCKS,
  TOTAL,
  SNAPSHOT_KEY,
  assetList,
  buildTimeline,
  computedBalances,
  contributionEvents,
  milestonesReached,
  monthRange,
  nextMilestone,
  timelineSummary,
  trimEmptyStart
} from '@/lib/history';

const typeCls = {
  mensal: 'bg-good/10 text-good',
  avulso: 'bg-accent/10 text-accent',
  compra: 'bg-good/10 text-good',
  venda: 'bg-bad/10 text-bad',
  saque: 'bg-warn/10 text-warn'
};

// Linha do tempo do patrimônio: de onde você saiu, cada aporte que fez e quanto tem hoje.
// Dá para ver o total, um ativo só (ex.: MXRF11) ou todos os FIIs e ações juntos.
export default function Evolucao({ data }) {
  const { buckets, records, extras, withdrawals, stocks } = data;
  const snapshots = useLiveQuery(async () => (await db.settings.get(SNAPSHOT_KEY))?.value || {}, []);
  const [asset, setAsset] = useState(TOTAL);
  const [showAll, setShowAll] = useState(false);
  const PREVIEW = 6; // meses mostrados na lista antes do "Ver todos"

  const events = useMemo(() => contributionEvents({ buckets, records, extras, withdrawals, stocks }), [buckets, records, extras, withdrawals, stocks]);
  const assets = useMemo(() => assetList(buckets, stocks, events), [buckets, stocks, events]);
  const months = useMemo(() => monthRange(events[0]?.month, monthKey()), [events]);
  // Recalcular saldo de cada ativo em cada mês é a parte "pesada": useMemo evita refazer a cada clique.
  const computed = useMemo(
    () => computedBalances(months, { buckets, records, extras, withdrawals, stocks }),
    [months, buckets, records, extras, withdrawals, stocks]
  );
  const points = useMemo(
    () => trimEmptyStart(buildTimeline({ months, computed, events, snapshots: snapshots || {}, asset })),
    [months, computed, events, snapshots, asset]
  );
  const summary = timelineSummary(points);
  const isTotal = asset === TOTAL;
  const reached = isTotal ? milestonesReached(points) : [];
  const next = isTotal && summary ? nextMilestone(summary.now) : null;
  // No gráfico: os marcos já alcançados e o próximo, se ele não for longe demais (senão achata a linha).
  const lines = reached.filter(m => m.month || (next && m.target === next.target && m.target <= Math.max(summary.now, 1) * 2.5));

  const hasStocks = assets.some(a => a.kind === 'stock');
  const selectedName = isTotal ? 'Patrimônio total' : asset === ALL_STOCKS ? 'FIIs e Ações' : assets.find(a => a.id === asset)?.name;
  const mine = points.flatMap(p => p.events).reverse();
  const grouped = mine.reduce((list, e) => {
    const g = list.find(x => x.month === e.month);
    if (g) g.items.push(e);
    else list.push({ month: e.month, items: [e] });
    return list;
  }, []);

  if (!events.length)
    return (
      <div className="space-y-5">
        <PageHeader title="Evolução do patrimônio" subtitle="De onde você saiu e até onde chegou." />
        <Empty>Quando você registrar o primeiro aporte, a linha do tempo começa aqui.</Empty>
      </div>
    );

  return (
    <div className="space-y-5">
      <PageHeader title="Evolução do patrimônio" subtitle="De onde você saiu, cada aporte que fez e quanto tem hoje.">
        <label className="flex items-center gap-2 text-sm font-semibold">
          Ver
          <select value={asset} onChange={e => setAsset(e.target.value)} className="field mt-0 w-auto" aria-label="Escolher ativo">
            <option value={TOTAL}>Patrimônio total</option>
            {hasStocks && <option value={ALL_STOCKS}>📊 FIIs e Ações (todos)</option>}
            <optgroup label="Renda fixa">
              {assets
                .filter(a => a.kind === 'bucket')
                .map(a => (
                  <option key={a.id} value={a.id}>
                    {a.icon} {a.name}
                  </option>
                ))}
            </optgroup>
            {hasStocks && (
              <optgroup label="FIIs e Ações">
                {assets
                  .filter(a => a.kind === 'stock')
                  .map(a => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
              </optgroup>
            )}
          </select>
        </label>
      </PageHeader>

      {summary && (
        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat icon={Flag} iconTone="text-muted" label={`Começou em ${monthLabel(summary.from)}`} value={brl(summary.start)} />
          <Stat icon={Wallet} label="Tem hoje" value={brl(summary.now)} hint={`${summary.growth >= 0 ? '+' : ''}${brl(summary.growth)} desde o começo`} />
          <Stat icon={PiggyBank} iconTone="text-info" label="Saiu do seu bolso" value={brl(summary.invested)} hint={`${summary.count} lançamentos`} />
          <Stat icon={Sprout} iconTone="text-good" label="Rendeu sozinho" value={brl(summary.gain)} tone={summary.gain >= 0 ? 'good' : 'bad'} />
        </section>
      )}

      <section className="card p-5">
        <h3 className="font-bold">{selectedName}</h3>
        <p className="mb-3 text-xs text-muted">
          Passe o mouse na curva para ver cada lançamento do mês. Ponto verde = aporte; ponto vermelho = saque ou venda.
        </p>
        {points.length < 2 ? (
          <p className="py-10 text-center text-sm text-muted">O gráfico aparece a partir do segundo mês. Os lançamentos já estão listados abaixo.</p>
        ) : (
          <TimelineChart points={points} milestones={lines} />
        )}
      </section>

      {isTotal && (
        <section className="card p-5">
          <h3 className="font-bold">Marcos do patrimônio</h3>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {reached.map(m => (
              <li key={m.target} className={`rounded-xl border p-3 ${m.month ? 'border-good/40 bg-good/10' : 'border-line'}`}>
                <strong className="block">{brl(m.target).replace(',00', '')}</strong>
                {m.month ? (
                  <span className="text-xs text-good">✓ Alcançado em {monthLabel(m.month)}</span>
                ) : next?.target === m.target ? (
                  <>
                    <span className="text-xs text-muted">
                      Faltam {brl(next.missing)} ({pct(next.progress)} do caminho)
                    </span>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface2">
                      <div className="h-full rounded-full bg-accent" style={{ width: `${next.progress}%` }} />
                    </div>
                  </>
                ) : (
                  <span className="text-xs text-faint">Próximos capítulos</span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="space-y-3">
        <h3 className="font-bold">Linha do tempo dos lançamentos</h3>
        {!grouped.length && <Empty>Nenhum lançamento para este ativo.</Empty>}
        {(showAll ? grouped : grouped.slice(0, PREVIEW)).map(g => {
          const point = points.find(p => p.month === g.month);
          return (
            <article key={g.month} className="card p-4">
              <header className="flex flex-wrap items-baseline justify-between gap-2">
                <strong>{monthLabel(g.month)}</strong>
                {point && <span className="text-xs text-muted">Fim do mês: {brl(point.balance)}</span>}
              </header>
              <ul className="mt-2 divide-y divide-line">
                {g.items.map((e, i) => (
                  <li key={i} className="flex items-center justify-between gap-3 py-2 text-sm">
                    <div className="min-w-0">
                      <span className={`chip mr-2 ${typeCls[e.type]}`}>{TYPE_LABEL[e.type]}</span>
                      <span className="font-medium">{e.name}</span>
                      <span className="text-xs text-muted">
                        {' '}
                        · {e.type === 'mensal' ? monthLabel(e.month) : dateLabel(e.date)}
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
          );
        })}
        {grouped.length > PREVIEW && (
          <button onClick={() => setShowAll(v => !v)} className="btn-secondary w-full justify-center">
            {showAll ? 'Mostrar só os meses recentes' : `Ver todos os ${grouped.length} meses`}
          </button>
        )}
      </section>

      <p className="text-xs text-faint">
        Como os valores são calculados: todo mês o app guarda sozinho uma &quot;foto&quot; do patrimônio, com FIIs e ações a preço de mercado. A foto do mês
        atual vai sendo atualizada e, quando o mês acaba, fica congelada. Meses de antes dessa foto existir são recalculados pelos lançamentos, com FIIs e ações
        pelo valor aportado. A foto entra no backup.
      </p>
    </div>
  );
}
