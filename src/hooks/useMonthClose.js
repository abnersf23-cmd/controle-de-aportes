import { useEffect, useMemo, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/database';
import { useBackupFolder } from '@/hooks/useAutoBackup';
import { useToast } from '@/components/ui/Toast';
import { monthLabel } from '@/lib/finance';
import { pendingReports } from '@/lib/monthClose';
import { REPORTS_DIR, saveReportsIfPossible } from '@/services/monthReports';

// Dados do fechamento: meses fechados e meses que ainda precisam de relatório.
export function useClosedMonths() {
  const info = useLiveQuery(async () => ({
    records: await db.expenses.toArray(),
    closed: (await db.settings.get('closedMonths'))?.value || {}
  }), []);
  const pending = useMemo(() => (info ? pendingReports(info.records, info.closed) : []), [info]);
  return { loading: !info, records: info?.records || [], closed: info?.closed || {}, pending };
}

// Ao abrir o app (e sempre que a pasta fica autorizada), salva sozinho os relatórios pendentes.
export default function useMonthClose(enabled) {
  const { pending } = useClosedMonths();
  const { status, folderName } = useBackupFolder();
  const toast = useToast();
  const running = useRef(false);
  const key = pending.join(',');
  useEffect(() => {
    if (!enabled || !key || status !== 'granted' || running.current) return;
    running.current = true; // o StrictMode roda o efeito duas vezes em desenvolvimento
    saveReportsIfPossible(key.split(','))
      .then(saved => saved.length && toast(`Relatório de ${saved.map(monthLabel).join(', ')} salvo em "${folderName}\\${REPORTS_DIR}".`, { duration: 8000 }))
      .catch(e => toast(`Não consegui salvar o relatório do mês: ${e?.message || e}`, { type: 'error' }))
      .finally(() => { running.current = false; });
  }, [enabled, key, status, folderName, toast]);
}
