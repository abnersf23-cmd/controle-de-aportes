// Backup automático numa pasta do seu computador.
//
// Como funciona: o navegador não pode gravar arquivos onde quiser (segurança).
// A "File System Access API" (Chrome e Edge) deixa VOCÊ escolher uma pasta uma vez;
// o app guarda essa autorização no banco e, a cada alteração, grava
// backup-controle-aportes-AAAA-MM-DD.json nessa pasta (um arquivo por dia, mantém os 30 últimos).
//
// Limitação: por segurança, o navegador pode pedir para você confirmar a permissão
// de novo quando reabre o app (um clique). Firefox não tem essa API: lá vale o lembrete semanal.
import { db } from '@/db/database';
import { exportBackup } from '@/db/backup';
import { today } from '@/lib/dates';

export const autoBackupSupported = () => typeof window !== 'undefined' && 'showDirectoryPicker' in window;
const KEEP = 30;
const PREFIX = 'backup-controle-aportes-';

export async function getFolder() {
  return (await db.settings.get('backupDir'))?.value || null;
}

// 'off' (sem pasta) | 'granted' (funcionando) | 'prompt' (precisa de um clique) | 'denied'
export async function folderStatus() {
  const dir = await getFolder();
  if (!dir) return 'off';
  try {
    return await dir.queryPermission({ mode: 'readwrite' });
  } catch {
    return 'denied';
  }
}

export async function chooseFolder() {
  const dir = await window.showDirectoryPicker({ id: 'backup-aportes', mode: 'readwrite', startIn: 'documents' });
  await db.settings.put({ key: 'backupDir', value: dir });
  await writeBackupToFolder(dir);
  return dir.name;
}

// Precisa ser chamada a partir de um clique (regra do navegador).
export async function reactivate() {
  const dir = await getFolder();
  if (!dir) return false;
  const ok = (await dir.requestPermission({ mode: 'readwrite' })) === 'granted';
  if (ok) await writeBackupToFolder(dir);
  return ok;
}

export async function disableFolder() {
  await db.settings.delete('backupDir');
}

export async function writeBackupToFolder(dir) {
  const file = await dir.getFileHandle(`${PREFIX}${today()}.json`, { create: true });
  const writable = await file.createWritable();
  await writable.write(JSON.stringify(await exportBackup(), null, 2));
  await writable.close();
  const now = new Date().toISOString();
  await db.settings.bulkPut([
    { key: 'lastBackup', value: now },
    { key: 'lastAutoBackup', value: now }
  ]);
  await prune(dir);
}

// Apaga os backups mais antigos, mantendo os 30 dias mais recentes.
async function prune(dir) {
  const names = [];
  for await (const [name, handle] of dir.entries()) if (handle.kind === 'file' && name.startsWith(PREFIX) && name.endsWith('.json')) names.push(name);
  names.sort().reverse();
  for (const name of names.slice(KEEP)) await dir.removeEntry(name).catch(() => {});
}

// Grava se a pasta estiver autorizada. Retorna true se gravou.
export async function backupIfPossible() {
  const dir = await getFolder();
  if (!dir || (await folderStatus()) !== 'granted') return false;
  await writeBackupToFolder(dir);
  return true;
}
