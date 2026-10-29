// Empréstimo consignado: parcela pela tabela Price, custo total, margem e CET. Funções puras.
import { round } from './finance';

// Parcela fixa (tabela Price) de um empréstimo de `principal` a `rate`% ao mês por `months` meses.
export function pricePayment(principal, rate, months) {
  const P = Number(principal) || 0,
    n = Math.floor(Number(months) || 0),
    i = (Number(rate) || 0) / 100;
  if (P <= 0 || n <= 0) return 0;
  return i === 0 ? P / n : (P * i) / (1 - Math.pow(1 + i, -n));
}

// Taxa mensal que faz o valor que caiu na conta igualar as parcelas trazidas a valor presente.
// É o Custo Efetivo Total (CET): junta juros, IOF e tarifas numa taxa só. Busca por bisseção.
export function effectiveMonthlyRate(received, payment, months) {
  const pv = r => Array.from({ length: months }, (_, t) => payment / Math.pow(1 + r, t + 1)).reduce((a, b) => a + b, 0);
  if (!(received > 0) || !(payment > 0) || months <= 0 || payment * months <= received) return 0;
  let lo = 0,
    hi = 1;
  for (let k = 0; k < 100; k++) {
    const mid = (lo + hi) / 2;
    if (pv(mid) > received) lo = mid;
    else hi = mid;
  }
  return ((lo + hi) / 2) * 100;
}

// IOF de empréstimo para pessoa física: 0,38% fixo + 0,0082% ao dia (no máximo 365 dias).
// O banco cobra o diário sobre cada parcela de amortização; aqui é uma estimativa por cima.
export const estimateIof = (amount, months) => round((Number(amount) || 0) * (0.0038 + 0.000082 * Math.min(365, (Number(months) || 0) * 30)));

export function simulateConsigned({ amount, rate, months, salary, marginPct = 35, otherConsigned = 0, fees, currentRate }) {
  const A = Number(amount) || 0,
    n = Math.floor(Number(months) || 0);
  const costs = fees === '' || fees == null ? estimateIof(A, n) : Number(fees) || 0;
  const financed = A + costs; // IOF e tarifas costumam entrar no valor financiado
  const payment = pricePayment(financed, rate, n);
  const total = payment * n;
  const margin = ((Number(salary) || 0) * (Number(marginPct) || 0)) / 100 - (Number(otherConsigned) || 0);
  const cet = effectiveMonthlyRate(A, payment, n);
  const out = {
    payment: round(payment),
    total: round(total),
    interest: round(total - A),
    costs: round(costs),
    margin: round(margin),
    fits: payment <= margin + 0.005,
    cetMonthly: round(cet * 100) / 100,
    cetYearly: round((Math.pow(1 + cet / 100, 12) - 1) * 10000) / 100
  };
  // Se for para trocar uma dívida mais cara: quanto você pagaria pelo mesmo valor e prazo na dívida atual.
  if (currentRate !== '' && currentRate != null && Number(currentRate) > 0) {
    const currentTotal = pricePayment(A, currentRate, n) * n;
    out.currentPayment = round(pricePayment(A, currentRate, n));
    out.savings = round(currentTotal - total);
  }
  return out;
}
