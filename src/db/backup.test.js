// Testa a importação do arquivo do Base44 num IndexedDB simulado (fake-indexeddb).
import 'fake-indexeddb/auto';
import { readFileSync, existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { db } from './database';
import { exportBackup, importBackup } from './backup';

const sample = { entities: {
  Bucket: [{ id: 'b1', name: 'Caixa', percentage: 100, created_by_id: 'x', is_sample: false, created_date: '2025-01-01' }],
  ExtraContribution: [{ id: 'e1', bucket_id: 'b1', amount: 10, date: '2025-01-02' }]
} };

describe('backup', () => {
  it('importa o formato do Base44 e remove campos de dono', async () => {
    const counts = await importBackup(sample);
    expect(counts.buckets).toBe(1);
    const b = await db.buckets.get('b1');
    expect(b.created_by_id).toBeUndefined();
    expect(await db.extras.count()).toBe(1);
  });
  it('exporta e reimporta sem perder nada', async () => {
    const json = await exportBackup();
    await db.buckets.clear();
    await importBackup(JSON.parse(JSON.stringify(json)));
    expect(await db.buckets.count()).toBe(1);
  });
  it('recusa arquivo sem buckets', async () => {
    await expect(importBackup({ entities: {} })).rejects.toThrow();
  });
  const real = process.env.DADOS;
  it.runIf(real && existsSync(real))('importa o arquivo real de dados', async () => {
    const counts = await importBackup(JSON.parse(readFileSync(real, 'utf8')));
    expect(counts.buckets).toBeGreaterThan(0);
  });
});
