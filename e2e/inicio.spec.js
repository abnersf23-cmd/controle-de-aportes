import { expect, test } from '@playwright/test';
import { SELIC, startFresh } from './helpers';

test('previsto x realizado divide o plano de R$ 600 pelos percentuais', async ({ page }) => {
  await startFresh(page);
  const card = page.locator('section', { has: page.getByRole('heading', { name: 'Previsto x realizado' }) });
  await expect(card.getByRole('row', { name: /Caixa/ })).toContainText('R$ 240,00');
  await expect(card.getByRole('row', { name: /Total/ })).toContainText('R$ 600,00');

  // Muda o plano para R$ 1.000 e confere a nova divisão.
  await card.getByRole('button', { name: 'Mudar o aporte planejado' }).click();
  await card.getByLabel('Aporte planejado por mês (R$)').fill('1000');
  await card.getByRole('button', { name: 'Salvar' }).click();
  await expect(card.getByRole('row', { name: /Caixa/ })).toContainText('R$ 400,00');
  await expect(card).toContainText('Faltam R$ 1.000,00');
});

test('avisa quando a Selic do Banco Central muda e atualiza o bucket com um clique', async ({ page }) => {
  await startFresh(page);
  const notice = page.getByText('Taxas novas do Banco Central').locator('..');
  await expect(notice).toContainText(`Tesouro Selic: 14,25% → ${SELIC}%`);
  await notice.getByRole('button', { name: 'Atualizar', exact: true }).first().click();
  await expect(page.getByText('Taxa atualizada.')).toBeVisible();
  await expect(page.getByText('Taxas novas do Banco Central')).toBeHidden(); // nada mais para atualizar
});
