// Salvar os relatórios na pasta, com uma pasta falsa no lugar da do Chrome.
process.env.TZ = 'America/Sao_Paulo';
import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const files = {};
const fakeDir = (path) => ({
  getDirectoryHandle: async name => fakeDir(`${path}${name}/`),
  getFileHandle: async name => ({ createWritable: async () => ({ write: async c => { files[`${path}${name}`] = c; }, close: async () => {} }) })
});
let status = 'granted';
vi.mock('./autoBackup', () => ({ getFolder: async () => fakeDir(''), folderStatus: async () => status }));

const { db } = await import('@/db/database');
const { getClosed, saveReportsIfPossible } = await import('./monthReports');

describe('salvar relatórios na pasta', () => {
  beforeEach(async () => { await db.expenses.clear(); await db.settings.clear(); for (const k in files) delete files[k]; status = 'granted'; });
  it('grava HTML e CSV em Relatorios/ e marca o mês como fechado', async () => {
    await db.expenses.add({ id: '1', month: '2026-09', income_15: 100, items: [{ name: 'Luz', vale: 50 }] });
    expect(await saveReportsIfPossible(['2026-09'])).toEqual(['2026-09']);
    expect(Object.keys(files).sort()).toEqual(['Relatorios/gastos-2026-09.csv', 'Relatorios/gastos-2026-09.html']);
    expect(files['Relatorios/gastos-2026-09.csv']).toContain('Luz;50,00;0,00;50,00');
    expect((await getClosed())['2026-09'].how).toBe('pasta');
  });
  it('com a permissão pausada não grava nada e não marca (fica pendente para o aviso)', async () => {
    status = 'prompt';
    await db.expenses.add({ id: '1', month: '2026-09', items: [{ name: 'Luz', vale: 50 }] });
    expect(await saveReportsIfPossible(['2026-09'])).toEqual([]);
    expect(files).toEqual({});
    expect(await getClosed()).toEqual({});
  });
});
