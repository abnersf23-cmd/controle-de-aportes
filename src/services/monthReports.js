// Salva os relatórios mensais de gastos na subpasta "Relatorios" da pasta de backup automático.
// Reaproveita a mesma autorização do backup (ver autoBackup.js): sem pasta, o relatório é baixado.
import { db } from '@/db/database';
import { downloadFile } from '@/lib/csv';
import { reportCsv, reportFileName, reportHtml } from '@/lib/monthClose';
import { folderStatus, getFolder } from './autoBackup';

export const REPORTS_DIR = 'Relatorios';

export async function getClosed() {
  return (await db.settings.get('closedMonths'))?.value || {};
}

async function markClosed(month, how) {
  const closed = await getClosed();
  await db.settings.put({ key: 'closedMonths', value: { ...closed, [month]: { reportAt: new Date().toISOString(), how } } });
}

const recordOf = async month => (await db.expenses.where('month').equals(month).first()) || { month };

async function writeFile(dir, name, content) {
  const writable = await (await dir.getFileHandle(name, { create: true })).createWritable();
  await writable.write(content);
  await writable.close();
}

// Grava os relatórios dos meses pedidos se a pasta estiver autorizada. Retorna os meses salvos.
export async function saveReportsIfPossible(months) {
  const dir = await getFolder();
  if (!months.length || !dir || (await folderStatus()) !== 'granted') return [];
  const sub = await dir.getDirectoryHandle(REPORTS_DIR, { create: true });
  for (const month of months) {
    const record = await recordOf(month);
    await writeFile(sub, reportFileName(month, 'html'), reportHtml(record));
    await writeFile(sub, reportFileName(month, 'csv'), reportCsv(record));
    await markClosed(month, 'pasta');
  }
  return months;
}

// Sem pasta: baixa os dois arquivos (vão para Downloads) e marca o mês como fechado.
export async function downloadReports(months, { mark = true } = {}) {
  for (const month of months) {
    const record = await recordOf(month);
    downloadFile(reportFileName(month, 'html'), reportHtml(record), 'text/html;charset=utf-8');
    downloadFile(reportFileName(month, 'csv'), reportCsv(record), 'text/csv;charset=utf-8');
    if (mark) await markClosed(month, 'download');
  }
}
