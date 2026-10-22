import { useRef, useState } from 'react';
import { Download, FolderSync, HardDrive, ShieldCheck, Upload } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Notice, PageHeader } from '@/components/ui/Bits';
import { useAction, useToast } from '@/components/ui/Toast';
import { useConfirm } from '@/components/ui/Confirm';
import { db } from '@/db/database';
import { exportBackup, importBackup } from '@/db/backup';
import { downloadFile } from '@/lib/csv';
import { daysSince } from '@/lib/finance';
import { today } from '@/lib/dates';
import { autoBackupSupported, chooseFolder, disableFolder, reactivate } from '@/services/autoBackup';
import { useBackupFolder } from '@/hooks/useAutoBackup';

export async function downloadBackup() {
  const json = await exportBackup();
  downloadFile(`backup-controle-aportes-${today()}.json`, JSON.stringify(json, null, 2), 'application/json');
  await db.settings.put({ key: 'lastBackup', value: new Date().toISOString() });
}

export function readJsonFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => { try { resolve(JSON.parse(reader.result)); } catch { reject(new Error('O arquivo não é um JSON válido.')); } };
    reader.onerror = () => reject(new Error('Não consegui ler o arquivo.'));
    reader.readAsText(file);
  });
}

function AutoBackupCard() {
  const run = useAction(), toast = useToast();
  const { status, folderName, lastAuto, refresh } = useBackupFolder();
  if (!autoBackupSupported()) return (
    <section className="card space-y-2 p-5 text-sm">
      <h2 className="flex items-center gap-2 font-bold"><FolderSync size={18} className="text-muted" /> Backup automático</h2>
      <p className="text-muted">Este navegador não permite gravar numa pasta automaticamente (só Chrome e Edge têm esse recurso). Por isso o app mostra um lembrete no topo quando o último backup passar de 7 dias.</p>
    </section>
  );
  const pick = async () => {
    try { await chooseFolder(); refresh(); toast('Pasta escolhida. Primeiro backup gravado.'); }
    catch (e) { if (e?.name !== 'AbortError') toast(e?.message || 'Não consegui usar essa pasta.', { type: 'error' }); } // AbortError = você cancelou a janela
  };
  return (
    <section className="card space-y-3 p-5">
      <h2 className="flex items-center gap-2 font-bold"><FolderSync size={18} className="text-good" /> Backup automático</h2>
      <p className="text-sm text-muted">Escolha uma pasta do computador (ex.: Documentos ou uma pasta sincronizada com Google Drive/OneDrive). A cada alteração, o app grava <code>backup-controle-aportes-AAAA-MM-DD.json</code> nela: um arquivo por dia, mantendo os 30 mais recentes.</p>
      {status === 'off' && <button onClick={pick} className="btn-primary">Escolher pasta…</button>}
      {status === 'granted' && <Notice tone="good" icon={ShieldCheck}>Ativo na pasta <strong>{folderName}</strong>.{lastAuto && <> Último backup automático: {new Date(lastAuto).toLocaleString('pt-BR')}.</>}</Notice>}
      {status === 'prompt' && <Notice tone="info" icon={FolderSync}>Pausado: por segurança, o navegador pede confirmação cada vez que o app é aberto. Clique em "Reativar".</Notice>}
      {status === 'denied' && <Notice tone="bad">O navegador negou acesso à pasta <strong>{folderName}</strong>. Escolha a pasta de novo.</Notice>}
      {status && status !== 'off' && (
        <div className="flex flex-wrap gap-2">
          {status === 'prompt' && <button className="btn-primary" onClick={() => run(async () => { if (!(await reactivate())) throw new Error('Permissão não concedida.'); refresh(); }, 'Backup automático reativado.')}>Reativar</button>}
          <button className="btn-secondary" onClick={pick}>Trocar pasta</button>
          <button className="btn-ghost" onClick={() => run(async () => { await disableFolder(); refresh(); }, 'Backup automático desativado.')}>Desativar</button>
        </div>
      )}
    </section>
  );
}

export default function Backup() {
  const run = useAction(), confirm = useConfirm();
  const fileRef = useRef(null);
  const [result, setResult] = useState(null);
  const lastBackup = useLiveQuery(async () => (await db.settings.get('lastBackup'))?.value || null, []);
  const counts = useLiveQuery(async () => ({ buckets: await db.buckets.count(), extras: await db.extras.count(), withdrawals: await db.withdrawals.count(), stocks: await db.stocks.count(), expenses: await db.expenses.count() }), []);
  const persisted = useLiveQuery(async () => (navigator.storage?.persisted ? navigator.storage.persisted() : null), []);
  const days = daysSince(lastBackup);

  const onFile = async e => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!(await confirm('Restaurar este backup?', { message: 'Todos os dados atuais do app serão SUBSTITUÍDOS pelos do arquivo. Faça um backup antes, se quiser guardar os atuais.', confirmLabel: 'Substituir dados' }))) return;
    await run(async () => setResult(await importBackup(await readJsonFile(file))), 'Backup restaurado.');
  };

  return (
    <div className="space-y-5">
      <PageHeader title="Backup e dados" subtitle="Seus dados ficam só neste computador, dentro do navegador." />
      {lastBackup == null ? <Notice>Você ainda não fez nenhum backup. Faça um agora e guarde o arquivo em um lugar seguro (pendrive, outra pasta).</Notice>
        : days > 7 ? <Notice>Seu último backup foi há {days} dias.</Notice>
          : <Notice tone="good" icon={ShieldCheck}>Último backup: {new Date(lastBackup).toLocaleString('pt-BR')}.</Notice>}
      <div className="grid gap-4 md:grid-cols-2">
        <section className="card space-y-3 p-5">
          <h2 className="flex items-center gap-2 font-bold"><Download size={18} className="text-accent" /> Fazer backup</h2>
          <p className="text-sm text-muted">Baixa um arquivo <code>.json</code> com todos os seus dados. Use-o para restaurar ou levar para outro computador.</p>
          <button onClick={() => run(downloadBackup, 'Backup baixado. Guarde o arquivo em local seguro.')} className="btn-primary w-full">Baixar backup</button>
        </section>
        <section className="card space-y-3 p-5">
          <h2 className="flex items-center gap-2 font-bold"><Upload size={18} className="text-info" /> Restaurar / importar</h2>
          <p className="text-sm text-muted">Aceita um backup deste app ou o arquivo exportado do Base44.</p>
          <input ref={fileRef} type="file" accept=".json,application/json" onChange={onFile} className="hidden" />
          <button onClick={() => fileRef.current?.click()} className="btn-secondary w-full">Escolher arquivo…</button>
          {result && <p className="text-xs text-good">Importado: {result.buckets} buckets, {result.extras} aportes avulsos, {result.withdrawals} saques, {result.stocks} ativos, {result.expenses} meses de gastos.</p>}
        </section>
      </div>
      <AutoBackupCard />
      <section className="card space-y-2 p-5 text-sm">
        <h2 className="flex items-center gap-2 font-bold"><HardDrive size={18} className="text-muted" /> Onde estão meus dados?</h2>
        <p className="text-muted">No banco <strong>IndexedDB</strong> do navegador, no endereço <code>localhost</code>. Nada é enviado para a internet; as únicas chamadas externas são as cotações (só o ticker e o par USD-BRL).</p>
        <p className="text-muted">Atenção: limpar os "dados de navegação / cookies e dados de sites" do navegador apaga o banco. Use sempre o mesmo navegador e mantenha backups.</p>
        {counts && <p className="text-faint">Registros: {counts.buckets} buckets · {counts.extras} aportes avulsos · {counts.withdrawals} saques/gastos · {counts.stocks} ativos · {counts.expenses} meses de gastos.</p>}
        {persisted != null && <p className="text-faint">Armazenamento persistente: {persisted ? 'ativado ✓ (o navegador não apaga sozinho)' : 'não concedido pelo navegador'}.</p>}
      </section>
    </div>
  );
}
