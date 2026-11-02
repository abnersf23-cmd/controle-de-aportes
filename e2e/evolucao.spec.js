import { expect, test } from '@playwright/test';
import { goTo, startFresh } from './helpers';

test('evolução: o aporte do mês entra na linha do tempo, no total e no ativo', async ({ page }) => {
  await startFresh(page);
  // Sobrou R$ 1.000: o Caixa (40%) recebe R$ 400.
  await page.getByLabel('Quanto sobrou esse mês').fill('1000');
  await page.getByLabel('Quanto sobrou esse mês').press('Enter');
  await page.getByRole('button', { name: 'aportei' }).first().click(); // primeiro da lista: 💵 Caixa
  await page
    .getByRole('dialog')
    .getByRole('button', { name: /Confirmar/ })
    .click();
  await expect(page.getByText('Aporte de R$ 400,00 registrado em Caixa.')).toBeVisible();

  await goTo(page, 'evolucao');
  await expect(page.getByRole('heading', { name: 'Evolução do patrimônio' })).toBeVisible();
  const bolso = page.locator('.card', { hasText: 'Saiu do seu bolso' });
  await expect(bolso).toContainText('R$ 400,00');
  const timeline = page.locator('article', { hasText: 'Aporte mensal' });
  await expect(timeline).toContainText('Caixa');
  await expect(timeline).toContainText('+R$ 400,00');
  // Marco de R$ 10 mil ainda não alcançado: mostra quanto falta.
  await expect(page.getByText('Faltam R$ 9.600,00')).toBeVisible();

  // Escolhe o ativo: só os que têm lançamento aparecem na lista.
  const select = page.getByLabel('Escolher ativo');
  await expect(select.locator('option')).toHaveText(['Patrimônio total', '💵 Caixa']);
  await select.selectOption({ label: '💵 Caixa' });
  await expect(page.getByRole('heading', { name: /Caixa/ })).toBeVisible();
  await expect(page.getByText('Marcos do patrimônio')).toBeHidden(); // marcos só no total
});

test('evolução: um saque registrado aparece na hora na linha do tempo', async ({ page }) => {
  await startFresh(page);
  await page.getByLabel('Quanto sobrou esse mês').fill('1000');
  await page.getByLabel('Quanto sobrou esse mês').press('Enter');
  await page.getByRole('button', { name: 'aportei' }).first().click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: /Confirmar/ })
    .click();
  await expect(page.getByText('Aporte de R$ 400,00 registrado em Caixa.')).toBeVisible();

  await goTo(page, 'evolucao');
  await expect(page.locator('.card', { hasText: 'Saiu do seu bolso' })).toContainText('R$ 400,00');

  await goTo(page, 'saques');
  await page
    .getByRole('button', { name: /Registrar/ })
    .first()
    .click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('De qual bucket saiu?').selectOption({ label: '💵 Caixa' });
  await dialog.getByRole('button', { name: 'Saque de investimento' }).click();
  await dialog.getByLabel('Valor (R$)').fill('150');
  await dialog.getByRole('button', { name: 'Registrar' }).click();
  await expect(dialog).toBeHidden();

  await goTo(page, 'evolucao');
  await expect(page.locator('article', { hasText: 'Saque/gasto' })).toContainText('-R$ 150,00');
  await expect(page.locator('.card', { hasText: 'Saiu do seu bolso' })).toContainText('R$ 250,00');
});
