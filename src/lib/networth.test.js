import { describe, expect, it } from 'vitest';
import { netWorth, parcelDebts } from './networth';

const celular = { id: 'f1', name: 'Celular', vale: 0, pagamento: 150, start: '2026-08', first: '2026-08', parcels: 10 };

describe('patrimônio líquido', () => {
  it('conta as parcelas que faltam, incluindo a do mês atual', () => {
    // outubro é a parcela 3 de 10: faltam 3..10 = 8 parcelas
    const [d] = parcelDebts([celular], { items: [] }, '2026-10');
    expect(d).toMatchObject({ name: 'Celular', left: 8, amount: 1200 });
  });
  it('se a parcela do mês já foi paga, ela sai da conta', () => {
    const rec = { items: [{ fixed_id: 'f1', vale: 0, pagamento: 150, paid_30: true }] };
    expect(parcelDebts([celular], rec, '2026-10')[0].left).toBe(7);
  });
  it('conta fixa sem fim (sem parcelas) e dívida já quitada não entram', () => {
    expect(parcelDebts([{ ...celular, parcels: undefined }], null, '2026-10')).toEqual([]);
    expect(parcelDebts([celular], null, '2027-06')).toEqual([]);
  });
  it('patrimônio líquido = investimentos − dívidas', () => {
    expect(netWorth(10000, [{ amount: 1200 }, { amount: '300.5' }])).toEqual({ assets: 10000, owed: 1500.5, net: 8499.5 });
  });
});
