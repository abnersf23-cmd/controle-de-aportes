import { expect, test } from '@playwright/test';
import { goTo, startFresh } from './helpers';

test('orçamento por categoria avisa no Início e saldo do mês é projetado', async ({ page }) => {
  await startFresh(page);
  await goTo(page, 'gastos');

  await page.getByLabel('Entrada dia 15 (vale)').fill('1000');
  await page.getByLabel('Entrada dia 30 (pagamento)').fill('2000');
  await page.getByLabel('Entrada dia 30 (pagamento)').blur();
  await page.getByRole('button', { name: 'Adicionar linha' }).click();
  const row = page
    .getByRole('row')
    .filter({ has: page.getByPlaceholder('Ex.: Internet') })
    .last();
  await row.getByPlaceholder('Ex.: Internet').fill('Netflix');
  await row.getByPlaceholder('Ex.: Internet').blur();
  await row.getByPlaceholder('0,00').nth(1).fill('160');
  await row.getByPlaceholder('0,00').nth(1).blur();

  // Limite de R$ 150 em Assinaturas: a conta de R$ 160 passa do limite.
  await page.getByRole('button', { name: 'Orçamento' }).click();
  await page.getByLabel('Limite de Assinaturas e contas').fill('150');
  await page.getByRole('button', { name: 'Salvar' }).click();
  await expect(page.getByText('Passou R$ 10,00 do limite')).toBeVisible();

  await goTo(page, 'inicio');
  await expect(page.getByText('Orçamento do mês:')).toBeVisible();
  await expect(page.getByText('Assinaturas e contas passou R$ 10,00 do limite')).toBeVisible();

  const cash = page.locator('section', { has: page.getByRole('heading', { name: 'Saldo até o fim do mês' }) });
  await expect(cash).toContainText('Sobra no fim do mês');
  await expect(cash.getByText('Sobra no fim do mês').locator('..')).toContainText('R$ 2.840,00');
});

test('simulador: com juros de 3% ao mês, quitar 12 parcelas de R$ 300 economiza R$ 613,80 e vale mais que investir', async ({ page }) => {
  await startFresh(page);
  await goTo(page, 'simuladores/antecipar');
  await page.getByLabel('Valor da parcela (R$)').fill('300');
  await page.getByLabel('Quantas parcelas ainda faltam?').fill('12');
  await page.getByLabel('Juros do contrato (% ao mês)').fill('3');
  await page.getByText('Ajustar detalhes (opcional)').click();
  await page.getByLabel('Quanto seu dinheiro rende investido (% ao ano)').fill('12');
  await expect(page.getByText('Quitando hoje, você economiza R$ 613,80')).toBeVisible();
  await expect(page.getByText(/E vale mais que investir/)).toBeVisible();
});

test('simulador: compra parcelada sem juros não vale antecipar', async ({ page }) => {
  await startFresh(page);
  await goTo(page, 'simuladores/antecipar');
  await page.getByLabel('Valor da parcela (R$)').fill('100');
  await page.getByLabel('Quantas parcelas ainda faltam?').fill('5');
  await page.getByLabel('Juros do contrato (% ao mês)').fill('0');
  await expect(page.getByText('Sem juros: não vale antecipar')).toBeVisible();
});
