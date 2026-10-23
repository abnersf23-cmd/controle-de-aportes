import { useEffect, useRef, useState } from 'react';
import { liveQuery } from 'dexie';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, TABLES } from '@/db/database';
import { backupIfPossible, chooseFolder, folderStatus } from '@/services/autoBackup';
import { useToast } from '@/components/ui/Toast';

// Observa o banco: quando qualquer dado muda, espera 5 s sem novas mudanças
// (debounce, para não gravar a cada tecla) e grava o backup na pasta escolhida.
export default function useAutoBackup(enabled) {
  const timer = useRef(null);
  useEffect(() => {
    if (!enabled) return;
    let first = true;
    // Ler todas as tabelas dentro do liveQuery faz o Dexie avisar quando qualquer uma mudar.
    const sub = liveQuery(() => Promise.all(TABLES.map(t => db[t].toArray()))).subscribe({
      next: () => {
        if (first) { first = false; return; }
        clearTimeout(timer.current);
        timer.current = setTimeout(() => backupIfPossible().catch(() => {}), 5000);
      }
    });
    backupIfPossible().catch(() => {}); // um backup ao abrir o app
    return () => { sub.unsubscribe(); clearTimeout(timer.current); };
  }, [enabled]);
}

// Estado da pasta de backup ('off' | 'granted' | 'prompt' | 'denied') e dados da pasta.
// A permissão é consultada fora do liveQuery (é uma API do navegador, não do Dexie)
// e de novo quando a janela volta ao foco.
export function useBackupFolder() {
  const info = useLiveQuery(async () => ({
    dir: (await db.settings.get('backupDir'))?.value || null,
    lastAuto: (await db.settings.get('lastAutoBackup'))?.value || null
  }), []);
  const [status, setStatus] = useState(undefined);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!info) return;
    let alive = true;
    folderStatus().then(s => alive && setStatus(s));
    return () => { alive = false; };
  }, [info, tick]);
  useEffect(() => {
    const onFocus = () => setTick(t => t + 1);
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);
  return { status, folderName: info?.dir?.name || null, lastAuto: info?.lastAuto || null, refresh: () => setTick(t => t + 1) };
}

// Abre a janela "escolher pasta" e avisa o resultado.
// Importante: cancelar a janela (ou o Chrome recusar a pasta) não pode passar em silêncio,
// senão parece que o backup foi ativado quando não foi.
export function usePickFolder(onDone) {
  const toast = useToast();
  return async () => {
    try {
      const name = await chooseFolder();
      toast(`Backup automático ativado na pasta "${name}". Primeiro backup gravado.`);
      onDone?.();
      return true;
    } catch (e) {
      if (e?.name === 'AbortError') toast('Nenhuma pasta foi escolhida, o backup automático NÃO foi ativado. Dica: o Chrome não aceita Documentos, Área de Trabalho ou Downloads direto; crie uma subpasta (ex.: Documentos\\Backup Aportes) e escolha ela.', { type: 'info', duration: 12000 });
      else toast(e?.message || 'Não consegui usar essa pasta.', { type: 'error' });
      return false;
    }
  };
}
