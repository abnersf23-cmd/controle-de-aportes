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
  { value: 'antecipar', label: 'Antecipar parcelas', hint: 'Juros que você economiza antecipando ou quitando' },
  { value: 'consignado', label: 'Consignado', hint: 'Parcela, CET e margem do salário' },
  { value: 'aposentadoria', label: 'Aposentadoria', hint: 'Quanto juntar para viver de renda' },
  { value: 'comparador', label: 'Comparador', hint: 'Tesouro, CDB, LCI, FIIs e ações lado a lado' }
];

// Todas as contas de "e se…?" num lugar só, separadas em abas.
export default function Simuladores({ data }) {
  const [tab, setTab] = useSubTab('simuladores', SIMULATORS.map(s => s.value), 'antecipar');
  const { fixed } = useExpenses();
  const { rates } = useMarketRates();
  const [plan] = useSetting('contributionPlan', PLAN_DEFAULTS);
  const current = totalBalance(data.buckets, data.records, data.extras, data.withdrawals, new Date(), data.stocks);
  const info = SIMULATORS.find(s => s.value === tab);
  return (
    <div className="space-y-5">
      <PageHeader title="Simuladores" subtitle={info.hint} />
      <div className="overflow-x-auto pb-1"><Segmented value={tab} onChange={setTab} options={SIMULATORS} /></div>
      {tab === 'antecipar' && <div className="max-w-2xl"><DebtSimulator fixed={fixed} month={monthKey()} /></div>}
      {tab === 'consignado' && <Consignado />}
      {tab === 'aposentadoria' && <Aposentadoria current={current} monthly={plan?.monthly ?? PLAN_DEFAULTS.monthly} />}
      {tab === 'comparador' && <Comparador rates={rates} />}
    </div>
  );
}
