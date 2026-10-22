import { useEffect, useState } from 'react';
import { GripVertical, Pencil, Plus, ShieldCheck, Trash2 } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import { PageHeader } from '@/components/ui/Bits';
import { useAction } from '@/components/ui/Toast';
import { useConfirm } from '@/components/ui/Confirm';
import BucketForm from '@/components/forms/BucketForm';
import { pct, effectiveRate, dateLabel, round } from '@/lib/finance';

export default function Gerenciar({ data }) {
  const { buckets } = data;
  const run = useAction(), confirm = useConfirm();
  const [modal, setModal] = useState(null);
  const [values, setValues] = useState({});
  useEffect(() => setValues(Object.fromEntries(buckets.map(b => [b.id, b.percentage]))), [buckets]);
  const sum = round(Object.values(values).reduce((a, b) => a + Number(b || 0), 0));
  const valid = Math.abs(sum - 100) < 0.01;
  const changed = buckets.some(b => Number(values[b.id]) !== Number(b.percentage));
  const close = () => setModal(null);
  const done = async (fn, msg) => { if (await run(fn, msg)) close(); };

  const remove = async b => {
    if (await confirm(`Excluir ${b.name}?`, { message: 'O percentual dele será redistribuído entre os buckets não protegidos. Os lançamentos já feitos continuam no histórico.' })) run(() => data.removeBucket(b), 'Bucket excluído.');
  };

  return (
    <div className="space-y-5">
      <PageHeader title="Gerenciar ativos" subtitle="Seus buckets, taxas de referência e a divisão do aporte.">
        <button onClick={() => setModal({ kind: 'add' })} className="btn-primary"><Plus size={16} /> Adicionar bucket</button>
      </PageHeader>

      <div className={`flex items-center justify-between rounded-2xl border p-4 ${valid ? 'border-good/30 bg-good/10 text-good' : 'border-bad/30 bg-bad/10 text-bad'}`}>
        <span className="font-semibold">Soma dos percentuais</span>
        <strong>{pct(sum)} {valid ? '✓' : '— precisa fechar em 100%'}</strong>
      </div>
      <div className="flex h-3 overflow-hidden rounded-full bg-surface2">{buckets.map(b => <div key={b.id} style={{ width: `${Number(values[b.id]) || 0}%`, backgroundColor: b.color }} />)}</div>

      <div className="space-y-2.5">
        {buckets.map(b => (
          <article key={b.id} className="card flex flex-wrap items-center gap-3 p-4">
            <GripVertical size={16} className="hidden text-faint sm:block" />
            <span className="grid h-10 w-10 place-items-center rounded-xl text-xl" style={{ backgroundColor: `${b.color}1f` }}>{b.icon}</span>
            <div className="min-w-40 flex-1">
              <strong>{b.name}</strong>
              <p className="text-xs text-muted">{b.kind === 'stocks' ? 'Renda variável · detalhes na aba FIIs e Ações' : `${b.category || 'Outros'} · taxa ${pct(effectiveRate(b))} a.a. · atualizada em ${dateLabel(b.rate_updated_date)}`}</p>
            </div>
            <div className="flex items-center gap-1">
              <input aria-label={`Percentual de ${b.name}`} type="number" step="0.01" value={values[b.id] ?? ''} onChange={e => setValues(v => ({ ...v, [b.id]: e.target.value }))} className="field mt-0 w-24 text-right" />
              <span className="text-sm text-muted">%</span>
            </div>
            <div className="flex items-center">
              <button title={b.protected ? 'Protegido: não é reduzido no rebalanceamento' : 'Tornar protegido'} onClick={() => !b.protected && run(() => data.setProtected(b.id), `${b.name} agora é o bucket protegido.`)} className={`btn-ghost p-2 ${b.protected ? 'text-good' : ''}`}><ShieldCheck size={18} /></button>
              <button onClick={() => setModal({ kind: 'edit', bucket: b })} className="btn-ghost p-2" aria-label="Editar"><Pencil size={18} /></button>
              {b.kind !== 'stocks' && <button onClick={() => remove(b)} className="btn-ghost p-2 hover:text-bad" aria-label="Excluir"><Trash2 size={18} /></button>}
            </div>
          </article>
        ))}
      </div>
      <div className="flex justify-end gap-2">
        {changed && <button onClick={() => setValues(Object.fromEntries(buckets.map(b => [b.id, b.percentage])))} className="btn-secondary">Desfazer alterações</button>}
        <button disabled={!valid || !changed} onClick={() => run(() => data.savePercentages(values), 'Percentuais salvos.')} className="btn-primary">Salvar percentuais</button>
      </div>

      <Modal open={!!modal} wide onClose={close} title={modal?.kind === 'add' ? 'Novo bucket' : `Editar ${modal?.bucket?.name}`}>
        {modal?.kind === 'add' && <BucketForm onCancel={close} onSave={f => done(() => data.addBucket(f), 'Bucket criado e percentuais rebalanceados.')} />}
        {modal?.kind === 'edit' && <BucketForm bucket={modal.bucket} onCancel={close} onSave={f => done(() => data.updateBucket(modal.bucket.id, { name: f.name, icon: f.icon, color: f.color, category: f.category, rate_type: f.rate_type, base_rate: Number(f.base_rate), management_fee: Number(f.management_fee), cdi_percentage: Number(f.cdi_percentage) }), 'Bucket atualizado.')} />}
      </Modal>
    </div>
  );
}
