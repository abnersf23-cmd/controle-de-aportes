import { expect, test } from '@playwright/test';
import { goTo, startFresh } from './helpers';

// O saque precisa de saldo no bucket: coloca R$ 200 na Caixa por um aporte avulso.
async function fundCaixa(page) {
  await goTo(page, 'inicio/carteira');
  await page.getByRole('button', { name: 'Abrir Caixa' }).click();
  await page.getByRole('button', { name: 'Aporte avulso' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Valor (R$)').fill('200');
  await dialog.getByRole('button', { name: 'Adicionar aporte' }).click();
  await expect(dialog).toBeHidden();
}

test('saque maior que o saldo do bucket é recusado com explicação', async ({ page }) => {
  await startFresh(page);
  await fundCaixa(page);
  await goTo(page, 'saques');
  await page
    .getByRole('button', { name: /Registrar/ })
    .first()
    .click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Valor (R$)').fill('500');
  await dialog.getByRole('button', { name: 'Registrar' }).click();
  await expect(page.getByText(/maior que o saldo de Caixa/)).toBeVisible();
  await expect(dialog).toBeVisible();
});

test('saque com categoria nova digitada: grava e passa a ser sugerida', async ({ page }) => {
  await startFresh(page);
  await fundCaixa(page);
  await goTo(page, 'saques');
  await page
    .getByRole('button', { name: /Registrar/ })
    .first()
    .click();
  let dialog = page.getByRole('dialog');
  await dialog.getByLabel('Valor (R$)').fill('80');
  await dialog.getByLabel('Categoria').fill('  Presente de aniversário ');
  await dialog.getByRole('button', { name: 'Registrar' }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByText('Presente de aniversário').first()).toBeVisible();

  // Na próxima vez, a categoria criada aparece como sugestão para um clique.
  await page
    .getByRole('button', { name: /Registrar/ })
    .first()
    .click();
  dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('button', { name: 'Presente de aniversário' })).toBeVisible();
  await dialog.getByRole('button', { name: 'Lazer' }).click();
  await expect(dialog.getByLabel('Categoria')).toHaveValue('lazer');
});
