// Chave para comparar nomes digitados à mão: sem acento, sem maiúscula e sem espaços sobrando.
// Assim "MÃE", "Mae" e " mãe " são a mesma conta. Usada em todo lugar que compara nomes.
export const nameKey = s =>
  String(s || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
