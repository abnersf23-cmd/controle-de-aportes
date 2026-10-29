// Backup e restauração em arquivo JSON.
// Como os dados vivem no navegador, o backup é a sua garantia: se o navegador
// for reinstalado ou os dados do site forem apagados, você restaura daqui.
import { db, TABLES, newId, stamp } from './database';

export const BACKUP_FORMAT = 'controle-aportes-backup';

// Configurações que só valem neste navegador e não entram no backup:
// a pasta do backup automático (uma autorização do navegador, não dá para salvar em arquivo),
// as datas dos últimos backups e o "já passei pela tela de boas-vindas".
const LOCAL_SETTINGS = ['backupDir', 'lastBackup', 'lastAutoBackup', 'backupSnooze', 'onboarded'];
const portable = rows => rows.filter(s => s && typeof s.key === 'string' && !LOCAL_SETTINGS.includes(s.key));

// Versão 2: o backup também leva as configurações (assistente, orçamento, plano de aportes,
// cotações e taxas salvas). Backups da versão 1 continuam sendo aceitos.
export async function exportBackup() {
  const data = {};
  for (const t of TABLES) data[t] = await db[t].toArray();
  return { format: BACKUP_FORMAT, version: 2, exported_at: stamp(), data, settings: portable(await db.settings.toArray()) };
}

// Configurações do arquivo, ou null se ele não tiver (backup antigo ou do Base44).
export const backupSettings = json => (json?.format === BACKUP_FORMAT && Array.isArray(json.settings) ? portable(json.settings) : null);

// Aceita o backup deste app e também o arquivo exportado do Base44
// (que usa os nomes das entidades: Bucket, MonthlyRecord, ...).
const BASE44_NAMES = {
  Bucket: 'buckets',
  MonthlyRecord: 'records',
  ExtraContribution: 'extras',
  Withdrawal: 'withdrawals',
  Goal: 'goals',
  Stock: 'stocks',
  MonthlyExpense: 'expenses'
};

export function normalizeBackup(json) {
  if (!json || typeof json !== 'object') throw new Error('Arquivo inválido.');
  const source = json.format === BACKUP_FORMAT ? json.data : json.entities || json;
  const out = Object.fromEntries(TABLES.map(t => [t, []]));
  for (const [key, rows] of Object.entries(source || {})) {
    const table = BASE44_NAMES[key] || (TABLES.includes(key) ? key : null);
    if (!table || !Array.isArray(rows)) continue;
    out[table] = rows.map(clean);
  }
  if (!out.buckets.length) throw new Error('O arquivo não tem buckets. Confira se é um backup do Controle de Aportes.');
  return out;
}

// Remove campos que só faziam sentido no Base44 (dono, amostra).
function clean(row) {
  const { created_by_id, created_by, is_sample, ...rest } = row;
  return { ...rest, id: rest.id || newId() };
}

export async function importBackup(json) {
  const data = normalizeBackup(json);
  const settings = backupSettings(json);
  // transaction: ou importa tudo, ou nada (se der erro no meio, nada é apagado).
  await db.transaction('rw', [...TABLES.map(t => db[t]), db.settings], async () => {
    for (const t of TABLES) {
      await db[t].clear();
      if (data[t].length) await db[t].bulkPut(data[t]);
    }
    // Arquivo sem configurações: mantém as atuais. Com configurações: troca pelas do arquivo.
    if (settings) {
      await db.settings.bulkDelete(portable(await db.settings.toArray()).map(s => s.key));
      if (settings.length) await db.settings.bulkPut(settings);
    }
  });
  await db.settings.put({ key: 'onboarded', value: true });
  return Object.fromEntries(TABLES.map(t => [t, data[t].length]));
}
