// Estilo comum dos gráficos (Recharts). O balão do Recharts pinta o texto de preto por padrão,
// ilegível no tema escuro: itemStyle/labelStyle forçam a cor do texto do tema.
export const tooltipStyle = {
  background: 'rgb(var(--surface2))',
  border: '1px solid rgb(var(--line))',
  borderRadius: 12,
  color: 'rgb(var(--ink))',
  fontSize: 12,
  boxShadow: '0 10px 25px rgba(0,0,0,.35)'
};
export const tooltipProps = {
  contentStyle: tooltipStyle,
  itemStyle: { color: 'rgb(var(--ink))' },
  labelStyle: { color: 'rgb(var(--muted))', fontWeight: 600 },
  cursor: { stroke: 'rgb(var(--faint))', strokeWidth: 1 }
};
// Eixos discretos: sem linha, texto pequeno e apagado. A grade é só horizontal e bem clara.
export const axisProps = { tick: { fill: 'rgb(var(--muted))', fontSize: 11 }, axisLine: false, tickLine: false };
export const gridProps = { stroke: 'rgb(var(--line))', strokeOpacity: 0.6, vertical: false };
// "R$ 12,5 mil" no eixo, em vez de "R$ 12.500,00".
export const compactBrl = v => (Math.abs(v) >= 1000 ? `R$ ${(v / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mil` : `R$ ${Math.round(v)}`);
// Ponto destacado ao passar o mouse: anel da cor do fundo para separar da linha.
export const activeDot = color => ({ r: 5, fill: color, stroke: 'rgb(var(--surface))', strokeWidth: 2 });
