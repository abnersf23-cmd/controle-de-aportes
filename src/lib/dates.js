// Datas no fuso LOCAL do computador.
// O app original usava new Date().toISOString(), que é UTC: no Brasil, depois das 21h,
// o "hoje" virava o dia seguinte (e no último dia do mês, o mês seguinte).
const pad = n => String(n).padStart(2, '0');

export const toDateKey = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const today = () => toDateKey(new Date());
export const monthKey = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
export const addMonths = (month, offset) => {
  const [y, m] = month.split('-').map(Number);
  return monthKey(new Date(y, m - 1 + offset, 1));
};
