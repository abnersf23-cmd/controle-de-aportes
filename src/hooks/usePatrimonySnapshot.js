// Tira a "foto do mês" do patrimônio sozinho, sem você precisar clicar em nada.
//
// Roda sempre que os dados mudam (aporte novo, cotação nova...). A regra de quando gravar
// fica em upsertSnapshot (lib/history.js): o mês atual é atualizado, os meses passados ficam
// congelados. A foto fica em db.settings, então entra no backup junto com o resto.
import { useEffect } from 'react';
import { db, stamp } from '@/db/database';
import { monthKey } from '@/lib/dates';
import { currentSnapshot, SNAPSHOT_KEY, upsertSnapshot } from '@/lib/history';

export default function usePatrimonySnapshot(data, enabled) {
  const { loading, buckets, records, extras, withdrawals, stocks, quotes } = data;
  useEffect(() => {
    if (!enabled || loading) return;
    // Sem nenhum ativo ainda não há o que fotografar.
    if (!buckets.length && !stocks.length) return;
    const month = monthKey();
    const snap = currentSnapshot({ buckets, records, extras, withdrawals, stocks, quotes });
    if (!snap.balance && !snap.invested) return;
    // A transação lê e grava junto: duas atualizações seguidas não se atropelam.
    db.transaction('rw', db.settings, async () => {
      const history = (await db.settings.get(SNAPSHOT_KEY))?.value || {};
      const next = upsertSnapshot(history, month, month, snap, stamp());
      if (next !== history) await db.settings.put({ key: SNAPSHOT_KEY, value: next });
    }).catch(() => {}); // a foto é um extra: um erro aqui não pode atrapalhar o app
  }, [enabled, loading, buckets, records, extras, withdrawals, stocks, quotes]);
}
