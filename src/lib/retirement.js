// Cenários de aposentadoria (independência financeira). Funções puras.
//
// Tudo em "dinheiro de hoje": usa a taxa REAL (acima da inflação), então R$ 3.000 de renda
// significa o poder de compra de R$ 3.000 hoje.
// Regra da retirada segura: dá para tirar cerca de 4% ao ano do patrimônio sem ele acabar
// (estudo de Bengen/Trinity). Renda de R$ 3.000/mês → precisa de 3.000 × 12 ÷ 4% = R$ 900 mil.
import { goalProjection, monthlyEquivalent, round } from './finance';

export function retirementPlan({ age, retireAge, income, current = 0, monthly = 0, realRate = 4, withdrawRate = 4 }) {
  const n = Math.max(0, Math.round(((Number(retireAge) || 0) - (Number(age) || 0)) * 12));
  const r = monthlyEquivalent(realRate) / 100;
  const target = ((Number(income) || 0) * 12) / ((Number(withdrawRate) || 4) / 100);
  const growth = Math.pow(1 + r, n);
  const annuity = r === 0 ? n : (growth - 1) / r;
  const fromCurrent = (Number(current) || 0) * growth;
  const needed = n > 0 ? Math.max(0, (target - fromCurrent) / annuity) : Math.max(0, target - fromCurrent);
  const reached = fromCurrent + (Number(monthly) || 0) * annuity;
  const months = goalProjection(Number(current) || 0, Number(monthly) || 0, realRate, target);
  return {
    months: n,
    target: round(target),
    monthlyNeeded: round(needed),
    projected: round(reached),
    incomeProjected: round((reached * ((Number(withdrawRate) || 4) / 100)) / 12),
    ageReached: months == null ? null : round((Number(age) || 0) + months / 12)
  };
}
