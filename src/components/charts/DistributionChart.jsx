import { brl, pct } from '@/lib/finance';

// Barra única mostrando como o aporte mensal é dividido entre os buckets.
export default function DistributionChart({ buckets, total = 0 }) {
  return (
    <section className="card p-5">
      <h3 className="font-bold">Divisão do aporte mensal</h3>
      <p className="text-xs text-muted">Como cada real que sobra é distribuído.</p>
      <div className="mt-4 flex h-4 overflow-hidden rounded-full">
        {buckets.map(b => <div key={b.id} title={`${b.name}: ${pct(b.percentage)}`} style={{ width: `${b.percentage}%`, backgroundColor: b.color }} />)}
      </div>
      <ul className="mt-4 grid gap-2">
        {buckets.map(b => (
          <li key={b.id} className="flex items-center gap-2 text-sm">
            <i className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: b.color }} />
            <span className="flex-1 truncate text-muted">{b.icon} {b.name}</span>
            <strong>{pct(b.percentage)}</strong>
            {total > 0 && <span className="w-24 text-right text-xs text-faint">{brl(total * b.percentage / 100)}</span>}
          </li>
        ))}
      </ul>
    </section>
  );
}
