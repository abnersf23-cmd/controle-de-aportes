import { useRef } from 'react';
import { Sparkles, Upload } from 'lucide-react';
import { db, newId, stamp } from '@/db/database';
import { defaultBuckets, defaultStocks } from '@/db/defaults';
import { importBackup } from '@/db/backup';
import { useAction } from '@/components/ui/Toast';
import { readJsonFile } from './Backup';

// Primeira vez abrindo o app: importar dados ou começar do zero.
export default function Boasvindas() {
  const run = useAction();
  const fileRef = useRef(null);
  const startFresh = () => run(async () => {
    await db.transaction('rw', db.buckets, db.stocks, db.settings, async () => {
      await db.buckets.bulkAdd(defaultBuckets().map((b, i) => ({ ...b, id: newId(), created_date: new Date(Date.now() + i).toISOString() /* carimbo de criação: UTC é o certo aqui */ })));
      await db.stocks.bulkAdd(defaultStocks().map(s => ({ ...s, id: newId(), created_date: stamp() })));
      await db.settings.put({ key: 'onboarded', value: true });
    });
  }, 'Tudo pronto! Ajuste seus buckets em "Gerenciar ativos".');
  const onFile = async e => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) await run(async () => importBackup(await readJsonFile(file)), 'Dados importados com sucesso!');
  };
  return (
    <div className="grid min-h-screen place-items-center bg-bg p-4">
      <div className="card w-full max-w-lg p-8 text-center">
        <img src="/favicon.svg" alt="" className="mx-auto h-14 w-14" />
        <h1 className="mt-4 text-2xl font-bold">Controle de Aportes</h1>
        <p className="mt-2 text-sm text-muted">Versão local: seus dados ficam só neste computador. Como você quer começar?</p>
        <div className="mt-6 grid gap-3">
          <input ref={fileRef} type="file" accept=".json,application/json" onChange={onFile} className="hidden" />
          <button onClick={() => fileRef.current?.click()} className="btn-primary py-3"><Upload size={18} /> Importar meus dados (arquivo .json)</button>
          <button onClick={startFresh} className="btn-secondary py-3"><Sparkles size={18} /> Começar do zero</button>
        </div>
        <p className="mt-4 text-xs text-faint">Dica: o arquivo <code>dados-base44.json</code> que veio junto com o projeto tem os seus dados do Base44.</p>
      </div>
    </div>
  );
}
