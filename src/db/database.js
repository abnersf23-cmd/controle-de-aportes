// Banco de dados local (IndexedDB) via Dexie.
// O IndexedDB é um banco que já vem dentro do navegador: os dados ficam gravados
// no seu computador, no perfil do navegador, e nunca vão para a internet.
import Dexie from 'dexie';

export const db = new Dexie('controle-aportes');

// Cada tabela lista a chave primária (id) e os campos indexados (usados em buscas/ordenação).
// Os demais campos são guardados normalmente, só não são indexados.
db.version(1).stores({
  buckets: 'id, kind, created_date',
  records: 'id, &month',          // MonthlyRecord: um por mês (& = único)
  extras: 'id, bucket_id, date',   // ExtraContribution: aportes avulsos
  withdrawals: 'id, bucket_id, date, type',
  goals: 'id',
  stocks: 'id, &ticker',
  expenses: 'id, &month',          // MonthlyExpense: planilha de gastos
  settings: 'key'                  // configurações e cache (ex.: últimas cotações)
});

export const TABLES = ['buckets', 'records', 'extras', 'withdrawals', 'goals', 'stocks', 'expenses'];

export const newId = () => (globalThis.crypto?.randomUUID ? crypto.randomUUID() : `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`);
export const stamp = () => new Date().toISOString();
