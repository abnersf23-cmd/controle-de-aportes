import { useMemo } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Notice } from '@/components/ui/Bits';
import useSetting from '@/hooks/useSetting';
import { budgetStatus, learnedCategories, totalsByCategory } from '@/lib/categories';
import { brl } from '@/lib/finance';

// Aviso no Início quando alguma categoria do mês chega a 80% do orçamento ou passa dele.
export default function BudgetAlert({ assistant, goTo }) {
  const [budgets] = useSetting('budgets', {});
  const { current, records } = assistant;
  const alerts = useMemo(() => {
    if (!budgets || !current) return [];
    return budgetStatus(totalsByCategory(current.items || [], learnedCategories(records)), budgets).filter(c => c.level === 'over' || c.level === 'warn');
  }, [budgets, current, records]);
  if (!alerts.length) return null;
  const over = alerts.some(c => c.level === 'over');
  return (
    <Notice tone={over ? 'bad' : 'warn'} icon={AlertTriangle}>
      <strong>Orçamento do mês:</strong>{' '}
      {alerts.map((c, i) => <span key={c.id}>{i > 0 && ' · '}{c.label} {c.level === 'over' ? `passou ${brl(-c.left)} do limite` : `já usou ${Math.round(c.ratio * 100)}% (resta ${brl(c.left)})`}</span>)}.{' '}
      <button className="font-semibold underline" onClick={() => goTo('gastos')}>Ver gastos</button>
    </Notice>
  );
}
