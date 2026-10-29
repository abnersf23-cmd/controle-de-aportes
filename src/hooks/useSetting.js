import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/database';

// Lê e grava uma configuração guardada em db.settings (entra no backup).
// `defaults` completa o que ainda não foi salvo. Enquanto carrega, `value` é undefined.
export default function useSetting(key, defaults = {}) {
  const saved = useLiveQuery(async () => (await db.settings.get(key))?.value ?? null, [key]);
  const value = saved === undefined ? undefined : { ...defaults, ...(saved || {}) };
  const save = async patch => {
    const current = (await db.settings.get(key))?.value || {};
    await db.settings.put({ key, value: { ...defaults, ...current, ...patch } });
  };
  return [value, save];
}
