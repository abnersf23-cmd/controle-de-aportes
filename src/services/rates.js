// Busca Selic, CDI e IPCA na API pública do Banco Central e guarda no banco local
// (db.settings 'marketRates'). Passa pelo proxy do Vite (vite.config.js), como as cotações.
// Nada seu é enviado: só o código da série.
import { db } from '@/db/database';
import { SERIES, parseSgs } from '@/lib/rates';

async function fetchSeries(code) {
  const res = await fetch(`/api/bcb/bcdata.sgs.${code}/dados/ultimos/1?formato=json`);
  if (!res.ok) throw new Error(`Banco Central indisponível (HTTP ${res.status}).`);
  return parseSgs(await res.json());
}

// Busca as três séries. As que falharem mantêm o último valor salvo (modo offline).
export async function fetchMarketRates() {
  const saved = (await db.settings.get('marketRates'))?.value || {};
  const entries = await Promise.all(
    Object.entries(SERIES).map(async ([key, s]) => {
      try {
        return [key, await fetchSeries(s.code)];
      } catch {
        return [key, saved[key] || null];
      }
    })
  );
  const next = Object.fromEntries(entries);
  const ok = entries.some(([key, v]) => v && v !== saved[key]);
  if (!ok && !Object.values(next).some(Boolean)) throw new Error('Não consegui buscar as taxas do Banco Central. Confira a internet.');
  // fetched_at só avança se pelo menos uma série veio nova; assim ele tenta de novo depois.
  const value = { ...next, fetched_at: ok ? Date.now() : saved.fetched_at || null };
  await db.settings.put({ key: 'marketRates', value });
  return value;
}
