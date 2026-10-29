// Categorias da planilha de gastos mensais.
import { round } from './finance';
import { nameKey } from './text';

export const CATEGORIES = [
  { id: 'familia', label: 'Família', color: '#EC4899' },
  { id: 'dividas', label: 'Dívidas e parcelas', color: '#DC2626' },
  { id: 'devolucoes', label: 'Devoluções', color: '#F97316' },
  { id: 'assinaturas', label: 'Assinaturas e contas', color: '#6366F1' },
  { id: 'estudos', label: 'Estudos', color: '#06B6D4' },
  { id: 'pet', label: 'Pet', color: '#84CC16' },
  { id: 'saude', label: 'Saúde e cuidados', color: '#8B5CF6' },
  { id: 'outros', label: 'Outros', color: '#64748B' }
];
export const categoryById = id => CATEGORIES.find(c => c.id === id) || CATEGORIES[CATEGORIES.length - 1];

const plain = nameKey;

// Palavras que indicam a categoria (sem acento, em minúsculas). A primeira que bater vence.
const KEYWORDS = [
  ['familia', ['mae', 'pai', 'vo', 'avo', 'irma', 'irmao', 'familia']],
  ['dividas', ['santander', 'pan', 'cobbucio', 'ipanema', 'parcela', 'acordo', 'cartao', 'fatura', 'financiamento', 'consignado']],
  ['devolucoes', ['devolucao', 'devolver', 'emprestimo', 'devo']],
  ['assinaturas', ['apple', 'youtube', 'netflix', 'spotify', 'internet', 'nucell', 'celular', 'ngcash', 'luz', 'agua', 'assinatura', 'plano']],
  ['estudos', ['faculdade', 'curso', 'livro', 'escola']],
  ['pet', ['racao', 'pet', 'veterinario', 'vet']],
  ['saude', ['suplement', 'perfume', 'farmacia', 'remedio', 'academia', 'barbe', 'medic', 'dentista']]
];

// Sugere pela palavra-chave (palavra inteira, ou começo de palavra para radicais como "suplement").
export function guessCategory(name) {
  const words = plain(name).split(/[^a-z0-9]+/).filter(Boolean);
  for (const [id, keys] of KEYWORDS) if (keys.some(k => words.some(w => w === k || (k.length >= 5 && w.startsWith(k))))) return id;
  return null;
}

// Aprende com o que você já escolheu: o nome da conta → a categoria escolhida no mês mais recente.
export function learnedCategories(records) {
  const map = {};
  for (const r of [...records].sort((a, b) => a.month.localeCompare(b.month))) {
    for (const i of r.items || []) if (i.category && i.name) map[plain(i.name)] = i.category;
  }
  return map;
}

// Categoria de uma linha: a escolhida nela, senão a aprendida, senão a da palavra-chave, senão "Outros".
export const categoryOf = (item, learned = {}) => item.category || learned[plain(item.name)] || guessCategory(item.name) || 'outros';

// Total por categoria (dia 15 + dia 30), do maior para o menor, só das que têm valor.
export function totalsByCategory(items, learned = {}) {
  const totals = {};
  for (const i of items) {
    const v = (Number(i.vale) || 0) + (Number(i.pagamento) || 0);
    if (v > 0) { const c = categoryOf(i, learned); totals[c] = round((totals[c] || 0) + v); }
  }
  const sum = Object.values(totals).reduce((s, v) => s + v, 0);
  return Object.entries(totals).map(([id, value]) => ({ ...categoryById(id), value, pct: sum ? (value / sum) * 100 : 0 })).sort((a, b) => b.value - a.value);
}

// Orçamento: compara o total de cada categoria com o limite definido (em R$ por mês).
// level: 'over' (passou do limite), 'warn' (chegou a 80%), 'ok', ou null (sem limite).
export const BUDGET_WARN = 0.8;
export function budgetStatus(byCategory = [], limits = {}) {
  const ids = new Set([...byCategory.map(c => c.id), ...Object.keys(limits).filter(id => Number(limits[id]) > 0)]);
  return [...ids].map(id => {
    const value = byCategory.find(c => c.id === id)?.value || 0;
    const limit = Number(limits[id]) || 0;
    const ratio = limit > 0 ? value / limit : null;
    const level = limit > 0 ? (value > limit ? 'over' : ratio >= BUDGET_WARN ? 'warn' : 'ok') : null;
    return { ...categoryById(id), value, limit, ratio, level, left: limit > 0 ? round(limit - value) : null };
  }).sort((a, b) => (b.ratio ?? -1) - (a.ratio ?? -1) || b.value - a.value);
}
