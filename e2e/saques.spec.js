import { expect, test } from '@playwright/test';
import { goTo, startFresh } from './helpers';

test('saque com categoria nova digitada: grava e passa a ser sugerida', async ({ page }) => {
  await startFresh(page);
  await goTo(page, 'saques');
  await page.getByRole('button', { name: /Registrar/ }).first().click();
  let dialog = page.getByRole('dialog');
  await dialog.getByLabel('Valor (R$)').fill('80');
  await dialog.getByLabel('Categoria').fill('  Presente de aniversário ');
  await dialog.getByRole('button', { name: 'Registrar' }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByText('Presente de aniversário').first()).toBeVisible();

  // Na próxima vez, a categoria criada aparece como sugestão para um clique.
  await page.getByRole('button', { name: /Registrar/ }).first().click();
  dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('button', { name: 'Presente de aniversário' })).toBeVisible();
  await dialog.getByRole('button', { name: 'Lazer' }).click();
  await expect(dialog.getByLabel('Categoria')).toHaveValue('lazer');
});
