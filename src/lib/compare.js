// Comparador: o mesmo dinheiro, pelo mesmo prazo, em Tesouro Selic, CDB, LCI/LCA, FIIs e ações.
// Mostra o valor final já descontado o imposto. Funções puras.
//
// Regras de IR usadas (vigentes em 2025; confira se mudaram):
//  - Tesouro e CDB: tabela regressiva (22,5% até 6 meses ... 15% depois de 2 anos) sobre o ganho.
//  - LCI/LCA: isentas para pessoa física.
//  - FIIs: rendimentos mensais isentos; 20% sobre o lucro na venda das cotas.
//  - Ações: dividendos isentos; 15% sobre o lucro na venda (isento se vender até R$ 20 mil no mês).
// Os proventos de FIIs e ações são reinvestidos. Taxa de custódia da B3 no Tesouro: 0,2% ao ano
// sobre o que passar de R$ 10 mil (Tesouro Selic).
import { daysOf, irRate } from './debt';
import { pct, round } from './finance';

const grow = (rate, years) => Math.pow(1 + (Number(rate) || 0) / 100, years);

function fixedIncome(amount, annual, years, months, taxFree) {
  const gross = amount * grow(annual, years);
  const tax = taxFree ? 0 : ((gross - amount) * irRate(daysOf(months))) / 100;
  return { gross, tax };
}
// `exemptUpTo`: ações vendidas até R$ 20 mil no mês não pagam IR sobre o lucro.
function variableIncome(amount, dy, growth, years, taxPct, exemptUpTo = 0) {
  const basis = amount * grow(dy, years); // cada provento reinvestido vira custo de compra
  const gross = basis * grow(growth, years);
  const tax = gross <= exemptUpTo ? 0 : (Math.max(0, gross - basis) * taxPct) / 100;
  return { gross, tax };
}

export function compareInvestments({ amount, months, selic, cdi, cdbPct = 100, lciPct = 90, fiiDy = 10, fiiGrowth = 0, stockDy = 6, stockGrowth = 5 }) {
  const A = Number(amount) || 0,
    m = Math.max(1, Math.floor(Number(months) || 0)),
    y = m / 12;
  const custody = A > 10000 ? (0.2 * (A - 10000)) / A : 0;
  const rows = [
    {
      id: 'tesouro',
      label: 'Tesouro Selic',
      rate: (Number(selic) || 0) - custody,
      ...fixedIncome(A, (Number(selic) || 0) - custody, y, m, false),
      note: `IR de ${pct(irRate(daysOf(m)))}`
    },
    {
      id: 'cdb',
      label: `CDB ${cdbPct}% do CDI`,
      rate: (cdi * cdbPct) / 100,
      ...fixedIncome(A, (cdi * cdbPct) / 100, y, m, false),
      note: `IR de ${pct(irRate(daysOf(m)))}`
    },
    { id: 'lci', label: `LCI/LCA ${lciPct}% do CDI`, rate: (cdi * lciPct) / 100, ...fixedIncome(A, (cdi * lciPct) / 100, y, m, true), note: 'Isenta de IR' },
    {
      id: 'fii',
      label: 'FIIs',
      rate: (1 + fiiDy / 100) * (1 + fiiGrowth / 100) * 100 - 100,
      ...variableIncome(A, fiiDy, fiiGrowth, y, 20),
      note: 'Rendimentos isentos; 20% sobre o lucro na venda'
    },
    {
      id: 'acoes',
      label: 'Ações',
      rate: (1 + stockDy / 100) * (1 + stockGrowth / 100) * 100 - 100,
      ...variableIncome(A, stockDy, stockGrowth, y, 15, 20000),
      note: 'Dividendos isentos; lucro isento se vender até R$ 20 mil no mês'
    }
  ];
  return rows
    .map(r => {
      const net = r.gross - r.tax;
      return {
        ...r,
        gross: round(r.gross),
        tax: round(r.tax),
        net: round(net),
        profit: round(net - A),
        netYearly: A > 0 ? round((Math.pow(net / A, 1 / y) - 1) * 100) : 0,
        risk: r.id === 'fii' || r.id === 'acoes'
      };
    })
    .sort((a, b) => b.net - a.net);
}
