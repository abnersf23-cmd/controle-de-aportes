import { expect } from '@playwright/test';

// Cada teste começa com um navegador limpo (IndexedDB vazio). Estas respostas falsas
// substituem a internet: o teste não depende do Banco Central nem do Yahoo estarem no ar.
export const SELIC = 15, CDI = 14.9, IPCA = 4.5;

export async function mockInternet(page) {
  const sgs = { 432: SELIC, 4389: CDI, 13522: IPCA };
  await page.route('**/api/bcb/**', route => {
    const code = /sgs\.(\d+)/.exec(route.request().url())?.[1];
    return route.fulfill({ json: [{ data: '27/10/2026', valor: String(sgs[code]) }] });
  });
  await page.route('**/api/yahoo/**', route => route.fulfill({ status: 503, body: '' }));
  await page.route('**/api/dolar', route => route.fulfill({ json: { USDBRL: { bid: '5.40' } } }));
}

// Abre o app e clica em "Começar do zero" (buckets padrão: Caixa 40%, Tesouro Selic 22%, Dólar 18%, FIIs e Ações 20%).
export async function startFresh(page) {
  await mockInternet(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Começar do zero' }).click();
  await expect(page.getByRole('heading', { name: 'Previsto x realizado' })).toBeVisible();
}

export const goTo = (page, tab) => page.goto(`/#${tab}`);
