// Gera um CSV com ";" (o Excel em português abre direto) e BOM para acentos.
//
// Segurança (injeção de fórmula / "CSV injection"): o Excel trata como FÓRMULA qualquer
// célula que começa com = + - @ (ou tab/enter). Um nome de gasto como =HYPERLINK("http://...")
// viraria um link clicável ou, em casos piores, executaria comandos. Por isso, todo TEXTO que
// começa com esses caracteres ganha um apóstrofo na frente: o Excel mostra como texto puro.
// Números (ex.: -12,50) não são alterados.
const NUMBER = /^-?[\d.]+(,\d+)?$/;
export const safeCell = v => (typeof v === 'string' && /^[=+\-@\t\r]/.test(v) && !NUMBER.test(v) ? `'${v}` : v);

export function toCsv(headers, rows) {
  const escape = v => {
    const s = String(safeCell(v) ?? '');
    return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return `\uFEFF${[headers, ...rows].map(r => r.map(escape).join(';')).join('\r\n')}`;
}

export default function downloadCsv(filename, headers, rows) {
  downloadFile(filename, toCsv(headers, rows), 'text/csv;charset=utf-8');
}

export function downloadFile(filename, content, type) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
