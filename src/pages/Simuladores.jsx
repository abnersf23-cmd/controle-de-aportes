import DebtSimulator from '@/components/cards/DebtSimulator';
import Consignado from '@/components/simuladores/Consignado';
import Aposentadoria from '@/components/simuladores/Aposentadoria';
import Comparador from '@/components/simuladores/Comparador';
import { PageHeader, Segmented } from '@/components/ui/Bits';
import useExpenses from '@/hooks/useExpenses';
import useMarketRates from '@/hooks/useMarketRates';
import useSetting from '@/hooks/useSetting';
import useSubTab from '@/hooks/useSubTab';
import { PLAN_DEFAULTS } from '@/lib/plan';
import { monthKey, totalBalance } from '@/lib/finance';

export const SIMULATORS = [
  { value: 'antecipar', label: 'Antecipar parcelas', hint: 'Vale a pena pagar as parcelas antes? Veja quanto de juros você economiza.' },
  { value: 'consignado', label: 'Consignado', hint: 'Quanto fica a parcela de um empréstimo consignado e se cabe no seu salário.' },
  { value: 'aposentadoria', label: 'Aposentadoria', hint: 'Quanto guardar por mês para um dia viver de renda.' },
  { value: 'comparador', label: 'Onde investir', hint: 'Quanto o mesmo dinheiro rende no Tesouro, CDB, LCI, FIIs e ações, já sem imposto.' }
];

// Todas as contas de "e se…?" num lugar só, separadas em abas.
export default function Simuladores({ data }) {
  const [tab, setTab] = useSubTab(
    'simuladores',
    SIMULATORS.map(s => s.value),
    'antecipar'
  );
  const { fixed } = useExpenses();
  const { rates } = useMarketRates();
  const [plan] = useSetting('contributionPlan', PLAN_DEFAULTS);
  const current = totalBalance(data.buckets, data.records, data.extras, data.withdrawals, new Date(), data.stocks);
  const info = SIMULATORS.find(s => s.value === tab);
  return (
    <div className="space-y-5">
      <PageHeader title="Simuladores" subtitle={info.hint} />
      <div className="overflow-x-auto pb-1">
        <Segmented value={tab} onChange={setTab} options={SIMULATORS} />
      </div>
      {tab === 'antecipar' && <DebtSimulator fixed={fixed} month={monthKey()} />}
      {tab === 'consignado' && <Consignado />}
      {tab === 'aposentadoria' && <Aposentadoria current={current} monthly={plan?.monthly ?? PLAN_DEFAULTS.monthly} />}
      {tab === 'comparador' && <Comparador rates={rates} />}
    </div>
  );
}
