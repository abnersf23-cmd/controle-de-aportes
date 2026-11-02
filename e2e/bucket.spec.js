import { expect, test } from '@playwright/test';
import { goTo, startFresh } from './helpers';

test('carteira: clicar no bucket abre a página dele, sem botão de aporte no card', async ({ page }) => {
  await startFresh(page);
  await goTo(page, 'inicio/carteira');
  // O card não tem mais "Marcar aporte": o aporte do mês é feito no "Quanto sobrou esse mês?".
  await expect(page.getByRole('button', { name: /Marcar aporte/ })).toHaveCount(0);
  await page.getByRole('button', { name: 'Abrir Caixa' }).click();
  await expect(page).toHaveURL(/#bucket\/.+/);
  await expect(page.getByRole('heading', { name: 'Caixa', level: 1 })).toBeVisible();
  await expect(page.getByText('Nenhum lançamento ainda neste bucket.')).toBeVisible();

  // Aporte avulso feito pela página do bucket entra nos lançamentos e no saldo.
  await page.getByRole('button', { name: 'Aporte avulso' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Valor (R$)').fill('100');
  await dialog.getByRole('button', { name: 'Adicionar aporte' }).click();
  await expect(dialog).toBeHidden();
  await expect(page.locator('article', { hasText: 'Aporte avulso' })).toContainText('+R$ 100,00');
  await expect(page.locator('.card', { hasText: 'Total aportado' })).toContainText('R$ 100,00');

  // Voltar leva para a Carteira.
  await page.getByRole('button', { name: 'Carteira' }).first().click();
  await expect(page).toHaveURL(/#inicio\/carteira$/);
});

test('"aportei" no Quanto sobrou registra o aporte e a página do bucket mostra feito', async ({ page }) => {
  await startFresh(page);
  await page.getByLabel('Quanto sobrou esse mês').fill('1000');
  await page.getByLabel('Quanto sobrou esse mês').press('Enter');
  await page.getByRole('button', { name: 'aportei' }).first().click(); // 💵 Caixa, 40%
  await expect(page.getByText('Aporte de R$ 400,00 registrado em Caixa.')).toBeVisible();

  await goTo(page, 'inicio/carteira');
  const card = page.getByRole('button', { name: 'Abrir Caixa' });
  await expect(card).toContainText('Aporte do mês feito');
  await card.click();
  await expect(page.getByText('R$ 400,00 registrado', { exact: true })).toBeVisible();
  await expect(page.locator('article', { hasText: 'Aporte mensal' })).toContainText('+R$ 400,00');

  // Desmarcar pela página do bucket desfaz o aporte do mês.
  await page.getByRole('button', { name: 'Desmarcar' }).click();
  await expect(page.getByText('Aporte do mês desmarcado.')).toBeVisible();
  await expect(page.getByRole('button', { name: /Quanto sobrou esse mês/ })).toBeVisible();
});

test('desfazer o "aportei" direto no Quanto sobrou', async ({ page }) => {
  await startFresh(page);
  await page.getByLabel('Quanto sobrou esse mês').fill('1000');
  await page.getByLabel('Quanto sobrou esse mês').press('Enter');
  await page.getByRole('button', { name: 'aportei' }).first().click();
  await expect(page.getByText('feito')).toBeVisible();
  await page.getByRole('button', { name: 'Desfazer aporte em Caixa' }).click();
  await expect(page.getByText('Aporte do mês desmarcado.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'aportei' })).toHaveCount(3); // Caixa, Tesouro Selic, Dólar
});

test('menu lateral não mostra FIIs e Ações nem os buckets: só abrem pela Carteira', async ({ page }) => {
  await startFresh(page);
  const menu = page.locator('aside nav');
  await expect(menu.getByRole('button', { name: 'Início' })).toBeVisible();
  await expect(menu.getByRole('button', { name: 'FIIs e Ações' })).toHaveCount(0);
  await expect(menu.getByRole('button', { name: 'Caixa' })).toHaveCount(0);

  await goTo(page, 'inicio/carteira');
  await page.getByRole('button', { name: /Ver ativos/ }).click();
  await expect(page).toHaveURL(/#acoes$/);
  await expect(page.getByRole('heading', { name: 'FIIs e Ações' })).toBeVisible();
  await expect(menu.getByRole('button', { name: 'Início' })).toHaveClass(/text-accent/); // Início fica marcado
});
