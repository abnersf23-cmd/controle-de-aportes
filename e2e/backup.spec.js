import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { goTo, startFresh } from './helpers';

test('backup com senha: baixa criptografado e restaura só com a senha certa', async ({ page }) => {
  await startFresh(page);
  await goTo(page, 'backup');

  await page.getByLabel('Proteger com senha').check();
  await page.getByLabel('Senha do backup').fill('minha-senha-123');
  await page.getByLabel('Repita a senha').fill('minha-senha-123');
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Baixar backup protegido' }).click()]);
  expect(download.suggestedFilename()).toMatch(/-protegido\.json$/);
  const path = await download.path();
  const text = readFileSync(path, 'utf8');
  expect(JSON.parse(text).format).toBe('controle-aportes-backup-criptografado');
  expect(text).not.toContain('Tesouro Selic'); // os dados não aparecem em texto puro

  // Restaurar: senha errada é recusada, a certa funciona.
  await page.locator('input[type=file]').setInputFiles(path);
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Senha do backup').fill('senha-errada-000');
  await dialog.getByRole('button', { name: 'Abrir' }).click();
  await expect(page.getByText('Senha incorreta ou arquivo corrompido.')).toBeVisible();
  await dialog.getByLabel('Senha do backup').fill('minha-senha-123');
  await dialog.getByRole('button', { name: 'Abrir' }).click();
  await page.getByRole('button', { name: 'Substituir dados' }).click();
  await expect(page.getByText('Backup restaurado.')).toBeVisible();
});
