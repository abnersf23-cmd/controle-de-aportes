// Gera um CSV com ";" (o Excel em português abre direto) e BOM para acentos.
export function toCsv(headers, rows) {
  const escape = v => {
    const s = String(v ?? '');
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
