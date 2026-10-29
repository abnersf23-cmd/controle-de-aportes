import { useLiveQuery } from 'dexie-react-hooks';
import { AlertTriangle, FolderSync } from 'lucide-react';
import { db } from '@/db/database';
import { daysSince } from '@/lib/finance';
import { autoBackupSupported, reactivate } from '@/services/autoBackup';
import { useBackupFolder, usePickFolder } from '@/hooks/useAutoBackup';
import { downloadBackup } from '@/pages/Backup';
import { useAction } from '@/components/ui/Toast';

// Faixa no topo: pede um clique para reativar o backup automático
// ou lembra de fazer backup quando passa de 7 dias.
export default function BackupBanner({ goTo }) {
  const run = useAction();
  const { status, refresh } = useBackupFolder();
  const pick = usePickFolder(refresh);
  const info = useLiveQuery(
    async () => ({
      last: (await db.settings.get('lastBackup'))?.value || null,
      snooze: (await db.settings.get('backupSnooze'))?.value || null
    }),
    []
  );
  if (!info || status === undefined) return null;

  if (status === 'prompt')
    return (
      <div className="mb-5 flex flex-wrap items-center gap-3 rounded-2xl border border-info/30 bg-info/10 p-3 text-sm text-info">
        <FolderSync size={18} className="shrink-0" />
        <span className="flex-1">O backup automático está pausado. O navegador pede uma confirmação a cada vez que o app é aberto.</span>
        <button
          className="btn-primary py-1.5"
          onClick={() =>
            run(async () => {
              if (!(await reactivate())) throw new Error('Permissão não concedida.');
              refresh();
            }, 'Backup automático reativado.')
          }
        >
          Reativar
        </button>
      </div>
    );

  const days = info.last ? daysSince(info.last) : null;
  const snoozed = info.snooze && daysSince(info.snooze) < 1;
  if (status === 'granted' || snoozed || (days != null && days <= 7)) return null;
  return (
    <div className="mb-5 flex flex-wrap items-center gap-3 rounded-2xl border border-warn/30 bg-warn/10 p-3 text-sm text-warn">
      <AlertTriangle size={18} className="shrink-0" />
      <span className="flex-1">
        {status === 'denied'
          ? 'O navegador perdeu o acesso à pasta de backup. Escolha a pasta de novo.'
          : days == null
            ? 'Você ainda não fez backup dos seus dados.'
            : `Seu último backup foi há ${days} dias.`}{' '}
        Se os dados do navegador forem apagados, o backup é o que salva você.
      </span>
      <button className="btn-primary py-1.5" onClick={() => run(downloadBackup, 'Backup baixado.')}>
        Baixar backup
      </button>
      {/* Antes este botão só abria a aba Backup e parecia que já tinha ativado. Agora abre a escolha da pasta direto. */}
      <button className="btn-ghost py-1.5" onClick={() => (autoBackupSupported() ? pick() : goTo('backup'))}>
        {status === 'denied' ? 'Escolher pasta' : 'Ativar automático'}
      </button>
      <button className="btn-ghost py-1.5" onClick={() => db.settings.put({ key: 'backupSnooze', value: new Date().toISOString() })}>
        Amanhã
      </button>
    </div>
  );
}
