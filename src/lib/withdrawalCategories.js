// Categorias dos saques e gastos.
//
// Antes eram só 6 fixas. Agora você pode digitar qualquer uma (ex.: "carro", "presente").
// A lista de sugestões junta as padrão com as que você já usou, sem repetir:
// "Presente", "presente" e " presénte " viram uma só (comparação pelo nameKey).
import { nameKey } from './text';

export const DEFAULT_WITHDRAWAL_CATEGORIES = ['outros', 'emergência', 'lazer', 'investimento', 'moradia', 'alimentação'];

// Deixa a categoria digitada num formato só: sem espaços sobrando e em minúsculas
// (a tela mostra com a primeira letra maiúscula). Vazio vira "outros".
export const cleanCategory = c =>
  String(c || '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase() || 'outros';

// Padrão primeiro, depois as que você criou, das mais usadas para as menos usadas.
export function withdrawalCategories(withdrawals = []) {
  const seen = new Map(DEFAULT_WITHDRAWAL_CATEGORIES.map(c => [nameKey(c), { name: c, uses: 0, custom: false }]));
  for (const w of withdrawals) {
    if (!w?.category) continue;
    const key = nameKey(w.category);
    if (!key) continue;
    const item = seen.get(key) || { name: cleanCategory(w.category), uses: 0, custom: true };
    item.uses++;
    seen.set(key, item);
  }
  const all = [...seen.values()];
  return [...all.filter(c => !c.custom), ...all.filter(c => c.custom).sort((a, b) => b.uses - a.uses || a.name.localeCompare(b.name))].map(c => c.name);
}

// Se o que foi digitado já existe (mesmo com acento/maiúscula diferente), usa o nome que já existe.
export function matchCategory(typed, known = []) {
  const key = nameKey(typed);
  return known.find(c => nameKey(c) === key) || cleanCategory(typed);
}
