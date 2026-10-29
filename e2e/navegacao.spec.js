import { expect, test } from '@playwright/test';
import { goTo, startFresh } from './helpers';

test('Ctrl+K abre a busca e leva direto para um simulador', async ({ page }) => {
  await startFresh(page);
  await page.keyboard.press('Control+k');
  await expect(page.getByRole('dialog', { name: 'Busca rápida' })).toBeVisible();
  const busca = page.getByRole('dialog', { name: 'Busca rápida' });
  await busca.getByLabel('Buscar').fill('aposent');
  // Espera o resultado aparecer selecionado antes do Enter (a lista filtra enquanto digita).
  await expect(busca.getByRole('option', { selected: true })).toContainText('Aposentadoria');
  await busca.getByLabel('Buscar').press('Enter');
  await expect(busca).toBeHidden();
  await expect(page).toHaveURL(/#simuladores\/aposentadoria$/);
  await expect(page.getByLabel('Quantos anos você tem?')).toBeVisible();
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
  await page.getByLabel('Quantos anos você tem?').fill('22');
  await page.getByRole('button', { name: 'R$ 3.000', exact: true }).click();
  await expect(page.getByText(/Assim você junta R\$\s900\.000,00/)).toBeVisible();
});

test('onde investir: destaca a opção segura que mais rende e mostra a LCI isenta de IR', async ({ page }) => {
  await startFresh(page);
  await goTo(page, 'simuladores/comparador');
  await expect(page.getByText('Mais seguro que rende mais: LCI/LCA 90% do CDI')).toBeVisible();
  await expect(page.getByText(/Isenta de IR/)).toBeVisible();
  // 1 ano = 365 dias: CDB e Tesouro já pagam 17,5% de IR, não 20%.
  await expect(page.getByText(/IR de 17,5%/).first()).toBeVisible();
});

test('patrimônio líquido explica a diferença para o total da carteira', async ({ page }) => {
  await startFresh(page);
  await goTo(page, 'inicio/carteira');
  await page.getByRole('button', { name: 'Editar outras dívidas' }).click();
  await page.getByLabel('Nome da dívida').fill('Cartão');
  await page.getByLabel('Saldo devedor').fill('500');
  await page.getByRole('button', { name: 'Salvar' }).click();
  await expect(page.getByText(/porque desconta os R\$\s500,00 que você ainda vai pagar/)).toBeVisible();
});
