// Patrimônio líquido = o que você tem investido − o que você ainda deve. Funções puras.
//
// As dívidas vêm de dois lugares:
//  - contas fixas parceladas dos Gastos mensais (📌 com "3/10"): o que falta pagar delas;
//  - "outras dívidas" digitadas à mão (cartão, empréstimo, alguém a quem você deve), com o saldo devedor.
import { round } from './finance';

const num = v => Number(v) || 0;
const monthIndex = m => { const [y, mm] = m.split('-').map(Number); return y * 12 + mm - 1; };

// Parcelas que ainda faltam de cada conta fixa parcelada, contando a do mês atual
// (a não ser que ela já esteja marcada como paga na planilha deste mês).
export function parcelDebts(fixed = [], currentRecord, month) {
  const items = currentRecord?.items || [];
  return fixed.filter(f => f.parcels && f.first && f.start <= month).map(f => {
    const now = monthIndex(month) - monthIndex(f.first) + 1;
    const parcel = num(f.vale) + num(f.pagamento);
    const row = items.find(i => i.fixed_id === f.id);
    const paidNow = !!row && (!(num(row.vale) > 0) || row.paid_15) && (!(num(row.pagamento) > 0) || row.paid_30) && num(row.vale) + num(row.pagamento) > 0;
    const left = Math.max(0, f.parcels - Math.max(now, 1) + 1 - (now >= 1 && paidNow ? 1 : 0));
    return { id: f.id, name: f.name, parcel, left, amount: round(left * parcel), kind: 'parcelas' };
  }).filter(d => d.left > 0 && d.parcel > 0);
}

export function netWorth(assets, debts = []) {
  const owed = round(debts.reduce((s, d) => s + num(d.amount), 0));
  return { assets: round(num(assets)), owed, net: round(num(assets) - owed) };
}
