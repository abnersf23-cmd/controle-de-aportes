import { useEffect, useRef, useState } from 'react';

// Número que "conta" até o valor novo (ex.: R$ 9.500,00 → R$ 9.951,47) em vez de trocar de repente.
// Recebe o texto já formatado e anima só a parte numérica: "R$ 1.234,56", "12,5%", "4" funcionam.
// Textos sem número ("—", "…") aparecem como estão. Sem animação para quem pediu menos movimento.
// Ao terminar, mostra exatamente o texto recebido (leitores de tela e testes leem o valor final).
const NUMBER = /-?\d{1,3}(?:\.\d{3})*(?:,\d+)?|-?\d+(?:,\d+)?/;
const parse = text => {
  const m = NUMBER.exec(String(text));
  if (!m) return null;
  const decimals = m[0].includes(',') ? m[0].split(',')[1].length : 0;
  return {
    value: Number(m[0].replace(/\./g, '').replace(',', '.')),
    decimals,
    before: String(text).slice(0, m.index),
    after: String(text).slice(m.index + m[0].length)
  };
};
const reduced = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

export default function CountUp({ value, duration = 700 }) {
  const target = parse(value);
  const [shown, setShown] = useState(target ? 0 : null);
  const from = useRef(0);
  const goal = target?.value;

  useEffect(() => {
    if (goal == null) return;
    if (reduced()) {
      setShown(goal);
      from.current = goal;
      return;
    }
    const start = performance.now(),
      a = from.current;
    let frame;
    const tick = now => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3); // começa rápido e freia no fim
      setShown(a + (goal - a) * eased);
      if (t < 1) frame = requestAnimationFrame(tick);
      else from.current = goal;
    };
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      from.current = goal;
    };
  }, [goal, duration]);

  if (!target || shown == null || shown === goal) return value;
  // Durante a animação mostra o número intermediário com o mesmo prefixo/sufixo; no fim, o texto original.
  const n = shown.toLocaleString('pt-BR', { minimumFractionDigits: target.decimals, maximumFractionDigits: target.decimals });
  return `${target.before}${n}${target.after}`;
}
