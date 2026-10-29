import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/database';
import { applyFixed } from '@/db/expenses';
import { ASSISTANT_DEFAULTS, averageMonthlyBills, monthLeftover, suggestContribution } from '@/lib/assistant';
import { monthKey } from '@/lib/dates';

// Lê a planilha de gastos do mês atual e as preferências do assistente (guardadas em settings).
export default function useAssistant() {
  const month = monthKey();
  const data = useLiveQuery(async () => {
    const [records, fixed, saved] = await Promise.all([db.expenses.toArray(), db.fixed.toArray(), db.settings.get('assistant')]);
    const raw = records.find(r => r.month === month);
    // Contas com 📌 contam mesmo que você ainda não tenha aberto o mês na planilha.
    const current = applyFixed(fixed, month, raw) || raw;
    return { records: records.map(r => (r.month === month ? current : r)).filter(Boolean), current, settings: { ...ASSISTANT_DEFAULTS, ...saved?.value } };
  }, [month]);
  const settings = data?.settings || ASSISTANT_DEFAULTS;
  const saveSettings = patch => db.settings.put({ key: 'assistant', value: { ...settings, ...patch } });
  const hasMonth = !!data?.current && (data.current.items || []).some(i => i.name) && (Number(data.current.income_15) || Number(data.current.income_30)) > 0;
  return {
    loading: !data, month, settings, saveSettings, hasMonth, current: data?.current || null, records: data?.records || [],
    suggestion: suggestContribution(hasMonth ? monthLeftover(data.current) : 0, settings),
    bills: averageMonthlyBills(data?.records || [], month)
  };
}
