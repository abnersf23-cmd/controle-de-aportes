import { useMemo, useState } from 'react';
import { Flag } from 'lucide-react';
import { PageHeader, Notice, Segmented } from '@/components/ui/Bits';
import ProjectionChart from '@/components/charts/ProjectionChart';
import useSetting from '@/hooks/useSetting';
import useMarketRates from '@/hooks/useMarketRates';
import { brl, pct, projectionData, effectiveRate, bucketBalance, stockTotal, milestones, weightedAverageRate, realRate, dateLabel } from '@/lib/finance';

const PROJECTION_DEFAULTS = { inflation: null, stockReturn: 0, fromCurrent: true };
const eta = months => (months == null ? 'mais de 50 anos' : months === 0 ? 'já atingida 🎉' : `${months < 12 ? `${months} ${months === 1 ? 'mês' : 'meses'}` : `${(months / 12).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} anos`} (${new Date(new Date().getFullYear(), new Date().getMonth() + months, 1).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })})`);

export default function Projecao({ data }) {
  const { buckets, records, extras, withdrawals, stocks } = data;
  const [opts, saveOpts] = useSetting('projection', PROJECTION_DEFAULTS);
  const market = useMarketRates();
  const average = records.length ? records.reduce((s, r) => s + r.planned_total, 0) / records.length : 0;
  const [manual, setManual] = useState('');
  const [horizon, setHorizon] = useState(12);
  const monthly = manual === '' ? average : Number(manual);
  const o = opts || PROJECTION_DEFAULTS;
  const ipca = market.rates?.ipca;
  // Inflação: a que você digitou, senão o IPCA dos últimos 12 meses do Banco Central.
  const inflation = o.inflation ?? ipca?.value ?? 0;
  const stockBucket = buckets.find(b => b.kind === 'stocks');
  const rates = useMemo(() => (stockBucket ? { [stockBucket.id]: Number(o.stockReturn) || 0 } : {}), [stockBucket, o.stockReturn]);
  // Saldo de hoje por bucket (FIIs e Ações pelo valor aportado, como no patrimônio do Início).
  const start = useMemo(() => Object.fromEntries(buckets.map(b => [b.id, b.kind === 'stocks' ? stockTotal(stocks) : bucketBalance(b, records, extras, withdrawals).balance])), [buckets, records, extras, withdrawals, stocks]);
  const current = Object.values(start).reduce((s, v) => s + v, 0);
  const rows = useMemo(() => projectionData(buckets, monthly, horizon, { start: o.fromCurrent ? start : {}, rates, inflation }), [buckets, monthly, horizon, o.fromCurrent, start, rates, inflation]);
  const avgRate = weightedAverageRate(buckets, rates);
  const goals = milestones(current, monthly, avgRate, inflation);
  const marks = [6, 12, 24, 60, 120].filter(m => m <= horizon);

  return (
    <div className="space-y-5">
      <PageHeader title="Projeção de crescimento" subtitle="Simule seus aportes com a taxa atual de cada bucket, descontando a inflação.">
        <Segmented value={horizon} onChange={setHorizon} options={[{ value: 12, label: '1 ano' }, { value: 24, label: '2 anos' }, { value: 60, label: '5 anos' }, { value: 120, label: '10 anos' }]} />
      </PageHeader>
      <Notice>É uma simulação: supõe que as taxas, o aporte e a inflação continuam iguais. "Valor de hoje" mostra quanto o dinheiro do futuro compraria hoje.</Notice>
      <div className="grid gap-4 lg:grid-cols-[1fr_2fr]">
        <section className="card space-y-4 p-5">
          <label className="label">Aporte mensal (R$)
            <input type="number" min="0" value={manual} onChange={e => setManual(e.target.value)} placeholder={average ? `Sua média: ${average.toFixed(2)}` : '0,00'} className="field" />
            <span className="mt-1 block font-normal text-faint">{manual === '' ? `Usando sua média de ${brl(average)} (${records.length} meses registrados).` : 'Apague para voltar à média.'}</span>
          </label>
          <label className="label">Inflação esperada (% a.a.)
            <input type="number" min="0" step="0.1" value={o.inflation ?? ''} onChange={e => saveOpts({ inflation: e.target.value === '' ? null : Number(e.target.value) })} placeholder={ipca ? `IPCA 12 meses: ${ipca.value}` : 'ex.: 4,5'} className="field" />
            <span className="mt-1 block font-normal text-faint">{o.inflation != null ? 'Apague para usar o IPCA do Banco Central.' : ipca ? `Usando o IPCA de 12 meses do Banco Central (${pct(ipca.value)}, ${dateLabel(ipca.date)}).` : market.loading ? 'Buscando o IPCA no Banco Central…' : 'Sem IPCA salvo: digite um valor.'}</span>
          </label>
          {stockBucket && <label className="label">Retorno esperado de FIIs e Ações (% a.a.)
            <input type="number" min="0" step="0.1" value={o.stockReturn || ''} onChange={e => saveOpts({ stockReturn: Number(e.target.value) || 0 })} placeholder="0" className="field" />
            <span className="mt-1 block font-normal text-faint">Ex.: o dividend yield médio da sua carteira. Em branco, entra como 0%.</span>
          </label>}
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!o.fromCurrent} onChange={e => saveOpts({ fromCurrent: e.target.checked })} className="h-4 w-4 accent-[rgb(var(--accent))]" />Começar do patrimônio atual ({brl(current)})</label>
          <div>
            <h3 className="mb-2 font-bold">Taxas usadas</h3>
            <ul className="space-y-1.5">{buckets.map(b => <li key={b.id} className="flex justify-between text-sm"><span className="text-muted">{b.icon} {b.name} <span className="text-faint">({pct(b.percentage)})</span></span><strong>{pct(rates[b.id] ?? effectiveRate(b))} a.a.</strong></li>)}</ul>
            <p className="mt-2 flex justify-between border-t border-line pt-2 text-sm"><span className="text-muted">Média da carteira</span><strong>{pct(avgRate)} → {pct(realRate(avgRate, inflation))} real</strong></p>
          </div>
        </section>
        <ProjectionChart data={rows} buckets={buckets} showReal={inflation > 0} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {marks.map(m => {
          const row = rows[m - 1] || {}, projected = row.Total || 0, contributed = monthly * m + (o.fromCurrent ? current : 0);
          return (
            <section key={m} className="card p-5">
              <h3 className="font-bold">Em {m >= 12 ? `${m / 12} ano${m > 12 ? 's' : ''}` : `${m} meses`}</h3>
              <dl className="mt-3 space-y-1.5 text-sm">
                <div className="flex justify-between"><dt className="text-muted">{o.fromCurrent ? 'Hoje + aportes' : 'Aportado'}</dt><dd className="font-semibold">{brl(contributed)}</dd></div>
                <div className="flex justify-between"><dt className="text-muted">Projetado</dt><dd className="font-semibold">{brl(projected)}</dd></div>
                <div className="flex justify-between"><dt className="text-good">Ganho estimado</dt><dd className="font-semibold text-good">{brl(projected - contributed)}</dd></div>
                {inflation > 0 && <div className="flex justify-between border-t border-line pt-1.5"><dt className="text-muted">Em valor de hoje</dt><dd className="font-semibold">{brl(row['Total em valor de hoje'])}</dd></div>}
              </dl>
            </section>
          );
        })}
      </div>
      <section className="card space-y-3 p-5">
        <h2 className="flex items-center gap-2 font-bold"><Flag size={18} className="text-accent" /> Metas de patrimônio</h2>
        <p className="text-sm text-muted">Partindo de {brl(current)}, aportando {brl(monthly)}/mês com a taxa média de {pct(avgRate)} a.a.</p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[480px] text-sm">
            <thead><tr className="text-left text-xs text-muted"><th className="p-2">Meta</th><th className="p-2">Quando (valor de nota)</th><th className="p-2">Quando (poder de compra de hoje)</th></tr></thead>
            <tbody>{goals.map(g => <tr key={g.target} className="border-t border-line"><td className="p-2 font-bold">{brl(g.target)}</td><td className="p-2">{monthly > 0 || g.months === 0 ? eta(g.months) : '—'}</td><td className="p-2">{monthly > 0 || g.monthsReal === 0 ? eta(g.monthsReal) : '—'}</td></tr>)}</tbody>
          </table>
        </div>
        <p className="text-xs text-faint">"Poder de compra de hoje" usa a taxa real ({pct(realRate(avgRate, inflation))} a.a., descontando {pct(inflation)} de inflação) e supõe que você reajusta o aporte pela inflação todo ano. É a meta que de fato compra o que R$ 1 milhão compra hoje.</p>
      </section>
    </div>
  );
}
