// Busca da paleta Ctrl+K: acha abas, contas, ativos e simuladores pelo que você digitar,
// sem ligar para acento ou maiúscula. Função pura.
import { nameKey } from './text';

// Cada item: { label, hint?, keywords? }. Quem começa com o texto vem antes de quem só contém.
export function searchItems(items, query, limit = 8) {
  const q = nameKey(query);
  if (!q) return items.filter(i => i.group === 'Abas').slice(0, limit);
  const words = q.split(' ');
  return items.map(item => {
    const label = nameKey(item.label), all = `${label} ${nameKey(item.keywords || '')} ${nameKey(item.hint || '')}`;
    if (!words.every(w => all.includes(w))) return null;
    const score = label.startsWith(q) ? 0 : label.includes(q) ? 1 : 2;
    return { item, score };
  }).filter(Boolean).sort((a, b) => a.score - b.score).slice(0, limit).map(r => r.item);
}
