// Taxas oficiais do Banco Central (API SGS: Sistema Gerenciador de Séries Temporais).
// Funções puras para ler a resposta e comparar com os buckets. A busca fica em services/rates.js.
import { round } from './finance';

// Código de cada série no SGS (consulta em https://www3.bcb.gov.br/sgspub).
export const SERIES = {
  selic: { code: 432, label: 'Selic (meta)', unit: '% a.a.' },
  cdi: { code: 4389, label: 'CDI', unit: '% a.a.' },
  ipca: { code: 13522, label: 'IPCA 12 meses', unit: '%' }
};

// A API devolve [{ "data": "28/10/2026", "valor": "15.00" }]. Pega o último ponto.
export function parseSgs(json) {
  const last = Array.isArray(json) ? json[json.length - 1] : null;
  const value = Number(String(last?.valor ?? '').replace(',', '.'));
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(String(last?.data || ''));
  if (!m || !Number.isFinite(value) || last.valor === '') throw new Error('Resposta inesperada do Banco Central.');
  return { value: round(value), date: `${m[3]}-${m[2]}-${m[1]}` };
}

// Mais de 12 horas desde a última busca: hora de buscar de novo.
export const ratesStale = (saved, now = Date.now()) => saved?.fetched_at == null || now - saved.fetched_at > 12 * 3600 * 1000;

// Buckets cuja taxa base está diferente da taxa oficial: Tesouro Selic usa a Selic, CDI usa o CDI.
export function rateSuggestions(buckets = [], rates) {
  if (!rates) return [];
  const source = { selic: rates.selic, cdi: rates.cdi };
  return buckets
    .filter(b => source[b.rate_type]?.value != null && round(Number(b.base_rate) || 0) !== source[b.rate_type].value)
    .map(b => ({ bucket: b, from: Number(b.base_rate) || 0, to: source[b.rate_type].value, date: source[b.rate_type].date, label: SERIES[b.rate_type].label }));
}
