// Simulador "antecipar parcelas x investir o dinheiro". Funções puras.
//
// Ideia: antecipar uma parcela que vence daqui a t meses custa o VALOR PRESENTE dela,
// parcela / (1 + juros do contrato)^t (o Código de Defesa do Consumidor garante esse desconto).
// Antecipar é como "investir" à taxa de juros do contrato, sem imposto. Então a comparação é:
// juros do contrato x rendimento LÍQUIDO (depois do IR) do investimento.
import { monthlyEquivalent, round } from './finance';

// Imposto de renda regressivo da renda fixa (Tesouro, CDB): quanto mais tempo, menor.
export const IR_TABLE = [
  [180, 22.5],
  [360, 20],
  [720, 17.5],
  [Infinity, 15]
];
export const irRate = days => IR_TABLE.find(([limit]) => days <= limit)[1];
// Meses → dias corridos (o IR conta dias de verdade). Com "× 30", 12 meses davam 360 dias e caíam
// na faixa de 20%, quando um ano (365 dias) já paga 17,5%.
export const daysOf = months => Math.round(((Number(months) || 0) * 365.25) / 12);

// Valor investido por `months` meses, já descontando o IR sobre o ganho.
export function investNet(amount, annualRate, months, taxFree = false) {
  const gross = amount * Math.pow(1 + monthlyEquivalent(annualRate) / 100, months);
  const tax = taxFree || months <= 0 ? 0 : ((gross - amount) * irRate(daysOf(months))) / 100;
  return gross - tax;
}

// Antecipa as `count` ÚLTIMAS parcelas (as mais distantes têm o maior desconto) de uma dívida com
// `remaining` parcelas de `parcel` reais ainda por vencer (a próxima vence em 1 mês).
// Compara, na data da última parcela:
//  - investir: o mesmo dinheiro que a antecipação custa hoje fica aplicado até lá;
//  - antecipar: nos meses em que a parcela não vem mais, você aplica o valor dela até lá.
export function simulateAnticipation({ parcel, remaining, count = remaining, debtRate, investRate, taxFree = false }) {
  const P = Number(parcel) || 0,
    n = Math.max(0, Math.floor(Number(remaining) || 0));
  const k = Math.min(n, Math.max(0, Math.floor(Number(count) || 0)));
  const i = (Number(debtRate) || 0) / 100;
  let cost = 0,
    anticipateFinal = 0;
  for (let t = n - k + 1; t <= n; t++) {
    cost += P / Math.pow(1 + i, t);
    anticipateFinal += investNet(P, investRate, n - t, taxFree);
  }
  const investFinal = investNet(cost, investRate, n, taxFree);
  const advantage = round(anticipateFinal - investFinal);
  const investNetMonthly = cost > 0 && n > 0 ? (Math.pow(investFinal / cost, 1 / n) - 1) * 100 : 0;
  return {
    count: k,
    nominal: round(k * P),
    cost: round(cost),
    discount: round(k * P - cost),
    investFinal: round(investFinal),
    anticipateFinal: round(anticipateFinal),
    advantage,
    better: Math.abs(advantage) < 0.01 ? 'empate' : advantage > 0 ? 'antecipar' : 'investir',
    investNetMonthly: round(investNetMonthly * 100) / 100
  };
}

// Economia de juros: quanto você deixa de pagar antecipando as `count` últimas parcelas
// e quanto deixaria quitando tudo hoje. É a diferença entre o valor das parcelas e o valor presente.
export function interestSavings({ parcel, remaining, count = remaining, debtRate }) {
  const base = { parcel, remaining, debtRate, investRate: 0 };
  const some = simulateAnticipation({ ...base, count }),
    all = simulateAnticipation({ ...base, count: remaining });
  return { anticipate: some.discount, anticipateCost: some.cost, payoff: all.discount, payoffCost: all.cost, totalLeft: all.nominal };
}
