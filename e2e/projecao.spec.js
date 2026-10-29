import { expect, test } from '@playwright/test';
import { IPCA, goTo, startFresh } from './helpers';

test('projeção usa o IPCA do Banco Central e mostra as metas de patrimônio', async ({ page }) => {
  await startFresh(page);
  await goTo(page, 'projecao');
  await expect(page.getByText(`Usando o IPCA de 12 meses do Banco Central (${IPCA.toLocaleString('pt-BR')}%`)).toBeVisible();

  await page.getByLabel('Aporte mensal (R$)').fill('600');
  const metas = page.locator('section', { has: page.getByRole('heading', { name: 'Metas de patrimônio' }) });
  for (const meta of ['R$ 10.000,00', 'R$ 100.000,00', 'R$ 500.000,00', 'R$ 1.000.000,00']) await expect(metas.getByRole('row', { name: meta })).toBeVisible();
  await expect(page.getByText('Em valor de hoje').first()).toBeVisible();
});
