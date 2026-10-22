import { useMemo, useState } from 'react';
import { PageHeader, Notice, Segmented } from '@/components/ui/Bits';
import ProjectionChart from '@/components/charts/ProjectionChart';
import { brl, pct, projectionData, effectiveRate } from '@/lib/finance';

export default function Projecao({ data }) {
  const { buckets, records } = data;
  const average = records.length ? records.reduce((s, r) => s + r.planned_total, 0) / records.length : 0;
  const [manual, setManual] = useState('');
  const [horizon, setHorizon] = useState(12);
  const monthly = manual === '' ? average : Number(manual);
  const rows = useMemo(() => projectionData(buckets, monthly, horizon), [buckets, monthly, horizon]);
  const marks = [6, 12, 24, 60].filter(m => m <= horizon);
  return (
    <div className="space-y-5">
      <PageHeader title="Projeção de crescimento" subtitle="Simule seus aportes com a taxa atual de cada bucket.">
        <Segmented value={horizon} onChange={setHorizon} options={[{ value: 12, label: '1 ano' }, { value: 24, label: '2 anos' }, { value: 60, label: '5 anos' }]} />
      </PageHeader>
      <Notice>A projeção supõe que as taxas atuais continuam iguais. Renda variável (FIIs e ações) entra com taxa 0%.</Notice>
      <div className="grid gap-4 lg:grid-cols-[1fr_2fr]">
        <section className="card space-y-4 p-5">
          <label className="label">Aporte mensal (R$)
            <input type="number" min="0" value={manual} onChange={e => setManual(e.target.value)} placeholder={average ? `Sua média: ${average.toFixed(2)}` : '0,00'} className="field" />
            <span className="mt-1 block font-normal text-faint">{manual === '' ? `Usando sua média de ${brl(average)} (${records.length} meses registrados).` : 'Apague para voltar à média.'}</span>
          </label>
          <div>
            <h3 className="mb-2 font-bold">Taxas atuais</h3>
            <ul className="space-y-1.5">{buckets.map(b => <li key={b.id} className="flex justify-between text-sm"><span className="text-muted">{b.icon} {b.name} <span className="text-faint">({pct(b.percentage)})</span></span><strong>{pct(effectiveRate(b))} a.a.</strong></li>)}</ul>
          </div>
        </section>
        <ProjectionChart data={rows} buckets={buckets} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {marks.map(m => {
          const projected = rows[m - 1]?.Total || 0, contributed = monthly * m;
          return (
            <section key={m} className="card p-5">
              <h3 className="font-bold">Em {m >= 12 ? `${m / 12} ano${m > 12 ? 's' : ''}` : `${m} meses`}</h3>
              <dl className="mt-3 space-y-1.5 text-sm">
                <div className="flex justify-between"><dt className="text-muted">Aportado</dt><dd className="font-semibold">{brl(contributed)}</dd></div>
                <div className="flex justify-between"><dt className="text-muted">Projetado</dt><dd className="font-semibold">{brl(projected)}</dd></div>
                <div className="flex justify-between"><dt className="text-good">Ganho estimado</dt><dd className="font-semibold text-good">{brl(projected - contributed)}</dd></div>
              </dl>
            </section>
          );
        })}
      </div>
    </div>
  );
}
