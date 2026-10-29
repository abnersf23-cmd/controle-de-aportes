// Slider com campo para digitar: arrasta para explorar, digita quando sabe o número exato.
// O campo numérico leva o rótulo (é ele que leitores de tela e testes encontram); o slider
// é o atalho visual e anuncia o valor já formatado (aria-valuetext).
export default function Slider({ label, hint, value, onChange, min, max, step = 1, format = v => v, unit, placeholder }) {
  const num = Number(value);
  const has = value !== '' && value != null && Number.isFinite(num);
  // Fora da faixa (digitou um valor maior), o slider fica no limite e o campo mostra o valor real.
  const pos = has ? Math.min(max, Math.max(min, num)) : min;
  const fill = ((pos - min) / (max - min)) * 100;
  return (
    <div className="space-y-2">
      <label className="label flex items-end justify-between gap-2">
        <span>{label}</span>
        <span className="flex items-center gap-1">
          {unit === 'R$' && <span className="text-xs font-normal text-muted">R$</span>}
          <input
            type="number"
            min={min}
            step={step}
            value={value}
            onChange={e => onChange(e.target.value)}
            placeholder={placeholder}
            className="field mt-0 w-28 py-1.5 text-right text-sm font-bold"
          />
          {unit && unit !== 'R$' && <span className="text-xs font-normal text-muted">{unit}</span>}
        </span>
      </label>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={pos}
        onChange={e => onChange(e.target.value)}
        className="range"
        style={{ '--fill': `${fill}%` }}
        aria-label="Arraste para ajustar"
        aria-valuetext={has ? String(format(num)) : 'vazio'}
      />
      <div className="flex justify-between text-[11px] text-faint">
        <span>{format(min)}</span>
        {hint && <span className="px-2 text-center">{hint}</span>}
        <span>{format(max)}</span>
      </div>
    </div>
  );
}
