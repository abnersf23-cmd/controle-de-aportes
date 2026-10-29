import { FileText } from 'lucide-react';
import { monthLabel } from '@/lib/finance';
import { autoBackupSupported, reactivate } from '@/services/autoBackup';
import { downloadReports, saveReportsIfPossible } from '@/services/monthReports';
import { useBackupFolder, usePickFolder } from '@/hooks/useAutoBackup';
import { useClosedMonths } from '@/hooks/useMonthClose';
import { useAction } from '@/components/ui/Toast';

// Aparece só quando o relatório do mês NÃO pôde ser salvo sozinho
// (pasta pausada, sem pasta ou navegador sem suporte). Com a pasta ativa, tudo é automático.
export default function MonthCloseBanner() {
  const run = useAction();
  const { pending } = useClosedMonths();
  const { status, refresh } = useBackupFolder();
  const pick = usePickFolder(refresh);
  if (!pending.length || status === undefined || status === 'granted') return null;
  const names = pending.map(monthLabel).join(', ');
  return (
    <div className="mb-5 flex flex-wrap items-center gap-3 rounded-2xl border border-info/30 bg-info/10 p-3 text-sm text-info">
      <FileText size={18} className="shrink-0" />
      <span className="flex-1">O mês fechou: o relatório de gastos de <strong>{names}</strong> está pronto.{status === 'prompt' ? ' O navegador pede uma confirmação para salvar na pasta.' : ' Escolha uma pasta para ele ser salvo sozinho, ou baixe agora.'}</span>
      {status === 'prompt'
        ? <button className="btn-primary py-1.5" onClick={() => run(async () => { if (!(await reactivate())) throw new Error('Permissão não concedida.'); await saveReportsIfPossible(pending); refresh(); }, 'Relatório salvo na pasta.')}>Salvar relatório</button>
        : <>
            <button className="btn-primary py-1.5" onClick={() => run(() => downloadReports(pending), 'Relatório baixado (HTML e CSV).')}>Baixar relatório</button>
            {autoBackupSupported() && <button className="btn-ghost py-1.5" onClick={pick}>Escolher pasta</button>}
          </>}
    </div>
  );
}
