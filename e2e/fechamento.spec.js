import { expect, test } from '@playwright/test';
import { goTo, startFresh } from './helpers';

test('fechamento do mês resume gastos e orçamento e navega entre os meses', async ({ page }) => {
  await startFresh(page);
  await goTo(page, 'gastos');
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
  await page.getByRole('button', { name: 'Orçamento' }).click();
  await page.getByLabel('Limite de Assinaturas e contas').fill('150');
  await page.getByRole('button', { name: 'Salvar' }).click();

  await goTo(page, 'fechamento');
  const title = page.getByRole('heading', { name: /^Fechamento de / });
  await expect(title).toBeVisible();
  const resumo = page.locator('section', { has: page.getByRole('heading', { name: 'Resumo' }) });
  await expect(resumo).toContainText('Passou do orçamento em: Assinaturas e contas');
  await expect(page.getByRole('heading', { name: 'Gastos por categoria' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Imprimir / PDF' })).toBeVisible();

  const atual = await title.textContent();
  await page.getByRole('button', { name: 'Mês anterior' }).click();
  await expect(title).not.toHaveText(atual);
  await expect(page.getByText(/^Nada registrado em /)).toBeVisible();
});
