// Fechamento automático dos meses na aba Gastos mensais.
//
// Regra (pedido do Abner): no dia 1 gera o relatório do mês anterior e salva na pasta;
// a partir do dia 2 o mês anterior sai da tela. Como o app roda no navegador, ele só
// "acorda" quando está aberto: por isso vale "a primeira abertura a partir do dia 1/2".
// Os dados NÃO são apagados: o mês só fica oculto e volta com "Ver meses anteriores".
import { addMonths, monthKey } from './dates';
import { brl, monthLabel, round } from './finance';
import { toCsv } from './csv';

// Um mês "tem dados" se tem pelo menos uma conta com nome ou alguma entrada.
export const hasExpenseData = r => !!r && ((r.items || []).some(i => String(i.name || '').trim()) || Number(r.income_15) > 0 || Number(r.income_30) > 0);

// Meses que já passaram, têm dados e ainda não tiveram relatório gerado.
// "closed" é o mapa { '2026-09': { reportAt } } salvo nas configurações.
export function pendingReports(records, closed = {}, now = new Date()) {
  const current = monthKey(now);
  return records
    .filter(r => r.month < current && hasExpenseData(r) && !closed[r.month])
    .map(r => r.month)
    .sort();
}

// Um mês passado fica oculto quando:
//  - já tem relatório (ou não tem dados, então não há o que relatar) E
//  - não é o mês anterior no dia 1 (no dia 1 ele ainda aparece; some no dia 2).
// Trava de segurança: mês com dados e SEM relatório continua visível.
export function isArchived(month, { records = [], closed = {}, now = new Date() } = {}) {
  const current = monthKey(now);
  if (month >= current) return false;
  if (month === addMonths(current, -1) && now.getDate() < 2) return false;
  const record = records.find(r => r.month === month);
  return !!closed[month] || !hasExpenseData(record);
}

// Números do mês, os mesmos que a tela mostra.
export function expenseSummary(record = {}) {
  const items = (record.items || [])
    .filter(i => String(i.name || '').trim())
    .map(i => ({ name: i.name.trim(), vale: Number(i.vale) || 0, pagamento: Number(i.pagamento) || 0 }));
  const in15 = Number(record.income_15) || 0,
    in30 = Number(record.income_30) || 0;
  const totalVale = round(items.reduce((s, i) => s + i.vale, 0));
  const totalPag = round(items.reduce((s, i) => s + i.pagamento, 0));
  const total = round(totalVale + totalPag),
    income = round(in15 + in30);
  return {
    items,
    in15,
    in30,
    totalVale,
    totalPag,
    total,
    income,
    resta15: round(in15 - totalVale),
    resta30: round(in30 - totalPag),
    resta: round(income - total),
    comprometido: income > 0 ? Math.round((total / income) * 100) : null
  };
}

export const reportFileName = (month, ext) => `gastos-${month}.${ext}`;

const num = v => v.toFixed(2).replace('.', ',');

export function reportCsv(record) {
  const s = expenseSummary(record);
  const rows = s.items.map(i => [i.name, num(i.vale), num(i.pagamento), num(round(i.vale + i.pagamento))]);
  rows.push(
    [],
    ['Total', num(s.totalVale), num(s.totalPag), num(s.total)],
    ['Entradas', num(s.in15), num(s.in30), num(s.income)],
    ['O que sobra', num(s.resta15), num(s.resta30), num(s.resta)]
  );
  return toCsv(['Conta', 'Dia 15 (vale)', 'Dia 30 (pagamento)', 'Total'], rows);
}

// O nome da conta é texto digitado: escapar evita que um "<" quebre (ou injete algo no) HTML.
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

export function reportHtml(record, generatedAt = new Date()) {
  const s = expenseSummary(record),
    title = `Gastos de ${monthLabel(record.month)}`;
  const money = (v, color) => `<td class="n${color && v < 0 ? ' bad' : ''}">${brl(v)}</td>`;
  const rows = s.items.map(i => `<tr><td>${esc(i.name)}</td>${money(i.vale)}${money(i.pagamento)}${money(round(i.vale + i.pagamento))}</tr>`).join('');
  return `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<style>
body{font-family:system-ui,Segoe UI,Arial,sans-serif;color:#1f2937;max-width:760px;margin:32px auto;padding:0 16px;background:#fff}
h1{margin:0 0 4px;font-size:24px}.sub{color:#6b7280;margin:0 0 24px;font-size:13px}
.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px;margin-bottom:24px}
.card{border:1px solid #e5e7eb;border-radius:12px;padding:12px}.card p{margin:0;color:#6b7280;font-size:12px}.card strong{font-size:18px}
table{width:100%;border-collapse:collapse;font-size:14px}th,td{padding:8px;border-bottom:1px solid #e5e7eb;text-align:left}
th{color:#6b7280;font-size:12px}.n{text-align:right;white-space:nowrap}tfoot td{font-weight:700;background:#f9fafb}
.bad{color:#dc2626}.good{color:#16a34a}@media print{body{margin:0}}
</style></head><body>
<h1>${esc(title)}</h1>
<p class="sub">Relatório gerado automaticamente pelo Controle de Aportes em ${generatedAt.toLocaleString('pt-BR')}. Para PDF: Ctrl+P → Salvar como PDF.</p>
<div class="cards">
<div class="card"><p>Entradas (15 + 30)</p><strong>${brl(s.income)}</strong></div>
<div class="card"><p>Total de contas</p><strong>${brl(s.total)}</strong></div>
<div class="card"><p>Sobrou no fim do mês</p><strong class="${s.resta < 0 ? 'bad' : 'good'}">${brl(s.resta)}</strong></div>
<div class="card"><p>Renda comprometida</p><strong>${s.comprometido == null ? '—' : `${s.comprometido}%`}</strong></div>
</div>
<table><thead><tr><th>Conta</th><th class="n">Dia 15 (vale)</th><th class="n">Dia 30 (pagamento)</th><th class="n">Total</th></tr></thead>
<tbody>${rows || '<tr><td colspan="4">Nenhuma conta cadastrada.</td></tr>'}</tbody>
<tfoot><tr><td>Total</td>${money(s.totalVale)}${money(s.totalPag)}${money(s.total)}</tr>
<tr><td>Entradas</td>${money(s.in15)}${money(s.in30)}${money(s.income)}</tr>
<tr><td>O que sobra</td>${money(s.resta15, true)}${money(s.resta30, true)}${money(s.resta, true)}</tr></tfoot></table>
</body></html>
`;
}
