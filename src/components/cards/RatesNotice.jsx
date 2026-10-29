import { Landmark } from 'lucide-react';
import { Notice } from '@/components/ui/Bits';
import { useAction } from '@/components/ui/Toast';
import { rateSuggestions } from '@/lib/rates';
import { dateLabel, pct } from '@/lib/finance';

// Quando a Selic ou o CDI do Banco Central muda, sugere atualizar os buckets que usam essa taxa.
// A mudança só é gravada com o seu clique, e entra no histórico de taxas a partir de hoje
// (o passado continua com a taxa antiga).
export default function RatesNotice({ market, buckets, updateRate }) {
  const run = useAction();
  const list = rateSuggestions(buckets, market.rates);
  if (!list.length) return null;
  const apply = items =>
    run(
      async () => {
        for (const s of items) await updateRate(s.bucket.id, { base_rate: s.to });
      },
      items.length > 1 ? 'Taxas atualizadas.' : 'Taxa atualizada.'
    );
  return (
    <Notice tone="info" icon={Landmark}>
      <p className="font-semibold">Taxas novas do Banco Central</p>
      <ul className="mt-1 space-y-1">
        {list.map(s => (
          <li key={s.bucket.id} className="flex flex-wrap items-center gap-2">
            {s.bucket.icon} {s.bucket.name}: {pct(s.from)} → <strong>{pct(s.to)}</strong>{' '}
            <span className="text-xs opacity-80">
              ({s.label}, {dateLabel(s.date)})
            </span>{' '}
            <button className="font-semibold underline" onClick={() => apply([s])}>
              Atualizar
            </button>
          </li>
        ))}
      </ul>
      {list.length > 1 && (
        <button className="mt-2 font-semibold underline" onClick={() => apply(list)}>
          Atualizar todas
        </button>
      )}
    </Notice>
  );
}
