import { CheckCircle2, Circle } from 'lucide-react';

// Valor da conta num dia + botão para marcar como pago (só aparece se tiver valor).
export default function PayCell({ value, paid, onChange, onBlur, onToggle }) {
  const has = Number(value) > 0;
  return (
    <div className="flex items-center gap-1">
      <input
        type="number"
        step="0.01"
        value={value || ''}
        onChange={onChange}
        onBlur={onBlur}
        placeholder="0,00"
        className={`field mt-0 ${has && paid ? 'border-good/40 text-good line-through' : ''}`}
      />
      {has && (
        <button
          onClick={onToggle}
          className={`btn-ghost shrink-0 p-1.5 ${paid ? 'text-good' : ''}`}
          aria-pressed={!!paid}
          aria-label={paid ? 'Pago (clique para desmarcar)' : 'Marcar como pago'}
          title={paid ? 'Pago' : 'Marcar como pago'}
        >
          {paid ? <CheckCircle2 size={18} /> : <Circle size={18} />}
        </button>
      )}
      {!has && <span className="w-[30px] shrink-0" />}
    </div>
  );
}
