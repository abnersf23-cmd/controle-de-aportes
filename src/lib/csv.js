// Gera um CSV com ";" (o Excel em português abre direto) e BOM para acentos.
export default function downloadCsv(filename, headers, rows) {
  const escape = v => {
    const s = String(v ?? '');
    return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const text = [headers, ...rows].map(r => r.map(escape).join(';')).join('\r\n');
  downloadFile(filename, `﻿${text}`, 'text/csv;charset=utf-8');
}

export function downloadFile(filename, content, type) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
