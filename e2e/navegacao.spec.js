import { expect, test } from '@playwright/test';
import { goTo, startFresh } from './helpers';

test('Ctrl+K abre a busca e leva direto para um simulador', async ({ page }) => {
  await startFresh(page);
  await page.keyboard.press('Control+k');
  const busca = page.getByRole('dialog', { name: 'Busca rápida' });
  await busca.getByLabel('Buscar').fill('aposent');
  await page.keyboard.press('Enter');
  await expect(busca).toBeHidden();
  await expect(page).toHaveURL(/#simuladores\/aposentadoria$/);
  await expect(page.getByLabel('Sua idade')).toBeVisible();
});

test('as abas do Início ficam no endereço e voltam ao recarregar', async ({ page }) => {
  await startFresh(page);
  await page.getByRole('button', { name: 'Carteira', exact: true }).click();
  await expect(page).toHaveURL(/#inicio\/carteira$/);
  await expect(page.getByText('Patrimônio líquido').first()).toBeVisible();
  await page.reload();
  await expect(page.getByText('Patrimônio líquido').first()).toBeVisible();
});

test('aposentadoria: R$ 3.000 por mês com a regra dos 4% pede R$ 900 mil', async ({ page }) => {
  await startFresh(page);
  await goTo(page, 'simuladores/aposentadoria');
  await page.getByLabel('Sua idade').fill('22');
  await page.getByLabel('Renda por mês (R$ de hoje)').fill('3000');
  await expect(page.getByText('Precisa juntar').locator('..')).toContainText('R$ 900.000,00');
});

test('comparador mostra a LCI isenta de IR', async ({ page }) => {
  await startFresh(page);
  await goTo(page, 'simuladores/comparador');
  const lci = page.getByRole('row', { name: /LCI\/LCA/ });
  await expect(lci).toContainText('Isenta de IR');
  await expect(lci).toContainText('R$ 0,00');
});
