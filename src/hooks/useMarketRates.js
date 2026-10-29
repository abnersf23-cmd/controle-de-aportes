import { useCallback, useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/database';
import { ratesStale } from '@/lib/rates';
import { fetchMarketRates } from '@/services/rates';

// Selic, CDI e IPCA do Banco Central: busca ao abrir o app se a última busca tiver mais de 12 h.
export default function useMarketRates() {
  const rates = useLiveQuery(async () => (await db.settings.get('marketRates'))?.value || null, []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const refresh = useCallback(async () => {
    setLoading(true); setError(null);
    try { return await fetchMarketRates(); } catch (e) { setError(e.message); throw e; } finally { setLoading(false); }
  }, []);
  const ready = rates !== undefined;
  // Confere uma vez, quando o banco termina de carregar (e não a cada taxa nova que chega).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (ready && ratesStale(rates)) refresh().catch(() => {}); }, [ready]);
  return { rates: rates || null, loading, error, refresh };
}
