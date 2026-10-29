import { useEffect, useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  BarChart3,
  Calculator,
  CalendarCheck,
  CalendarRange,
  Database,
  Home,
  LineChart,
  Moon,
  Receipt,
  Search,
  Settings2,
  Sun,
  TrendingUp
} from 'lucide-react';
import { db } from '@/db/database';
import useFinanceData from '@/hooks/useFinanceData';
import useAutoBackup from '@/hooks/useAutoBackup';
import useMonthClose from '@/hooks/useMonthClose';
import BackupBanner from '@/components/BackupBanner';
import CommandPalette from '@/components/CommandPalette';
import MonthCloseBanner from '@/components/MonthCloseBanner';
import Inicio from '@/pages/Inicio';
import Acoes from '@/pages/Acoes';
import Saques from '@/pages/Saques';
import GastosMensais from '@/pages/GastosMensais';
import Relatorio from '@/pages/Relatorio';
import Fechamento from '@/pages/Fechamento';
import Gerenciar from '@/pages/Gerenciar';
import Projecao from '@/pages/Projecao';
import Simuladores, { SIMULATORS } from '@/pages/Simuladores';
import Backup from '@/pages/Backup';
import Boasvindas from '@/pages/Boasvindas';
import { brl, monthKey, totalBalance } from '@/lib/finance';
import CountUp from '@/components/ui/CountUp';

// Abas agrupadas no menu: o dia a dia em cima, análises no meio, configuração embaixo.
const PAGES = [
  { id: 'inicio', label: 'Início', icon: Home, Component: Inicio, group: 'Dia a dia', keywords: 'aporte sobra assistente carteira metas' },
  {
    id: 'gastos',
    label: 'Gastos mensais',
    icon: CalendarRange,
    Component: GastosMensais,
    group: 'Dia a dia',
    keywords: 'contas planilha vale pagamento orçamento'
  },
  { id: 'acoes', label: 'FIIs e Ações', icon: TrendingUp, Component: Acoes, group: 'Dia a dia', keywords: 'dividendos cotação compra venda' },
  { id: 'saques', label: 'Saques e gastos', icon: Receipt, Component: Saques, group: 'Dia a dia', keywords: 'retirada' },
  { id: 'fechamento', label: 'Fechamento do mês', icon: CalendarCheck, Component: Fechamento, group: 'Análises', keywords: 'resumo imprimir pdf' },
  { id: 'relatorio', label: 'Relatório', icon: BarChart3, Component: Relatorio, group: 'Análises', keywords: 'evolução csv lançamentos' },
  { id: 'projecao', label: 'Projeção', icon: LineChart, Component: Projecao, group: 'Análises', keywords: 'futuro crescimento inflação metas milhão' },
  {
    id: 'simuladores',
    label: 'Simuladores',
    icon: Calculator,
    Component: Simuladores,
    group: 'Análises',
    keywords: 'aposentadoria consignado comparador antecipar juros'
  },
  { id: 'gerenciar', label: 'Gerenciar ativos', icon: Settings2, Component: Gerenciar, group: 'Ajustes', keywords: 'buckets taxas percentuais' },
  { id: 'backup', label: 'Backup', icon: Database, Component: Backup, group: 'Ajustes', keywords: 'exportar importar senha' }
];
const GROUPS = ['Dia a dia', 'Análises', 'Ajustes'];
const MOBILE = ['inicio', 'gastos', 'acoes', 'simuladores'];

const readTab = () => {
  const t = window.location.hash.slice(1).split('/')[0];
  return PAGES.some(p => p.id === t) ? t : 'inicio';
};

function ThemeToggle() {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'));
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    try {
      localStorage.setItem('tema', dark ? 'escuro' : 'claro');
    } catch {
      /* sem localStorage: só não lembra o tema */
    }
  }, [dark]);
  return (
    <button onClick={() => setDark(d => !d)} className="btn-ghost" title="Alternar tema">
      {dark ? <Sun size={18} /> : <Moon size={18} />}
      <span className="lg:inline hidden">{dark ? 'Tema claro' : 'Tema escuro'}</span>
    </button>
  );
}

export default function App() {
  const onboarded = useLiveQuery(async () => (await db.settings.get('onboarded'))?.value || (await db.buckets.count()) > 0, []);
  const data = useFinanceData();
  const [tab, setTab] = useState(readTab);
  const [search, setSearch] = useState(false);
  const month = monthKey();
  const bills = useLiveQuery(async () => (await db.expenses.where('month').equals(month).first())?.items || [], [month]);
  useAutoBackup(!!onboarded);
  useMonthClose(!!onboarded);
  useEffect(() => {
    const onHash = () => setTab(readTab());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);
  // Ctrl+K (ou ⌘K no Mac) abre a busca rápida de qualquer tela.
  useEffect(() => {
    const onKey = e => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearch(v => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  // Pede ao navegador para não apagar o banco sozinho quando faltar espaço.
  useEffect(() => {
    navigator.storage?.persist?.();
  }, []);
  const goTo = id => {
    window.location.hash = id;
    window.scrollTo({ top: 0 });
  };
  const searchItems = useMemo(
    () => [
      ...PAGES.map(p => ({ group: 'Abas', label: p.label, icon: p.icon, keywords: p.keywords, run: () => goTo(p.id) })),
      ...[
        ['mes', 'Este mês'],
        ['carteira', 'Carteira'],
        ['metas', 'Metas']
      ].map(([id, label]) => ({
        group: 'Início',
        label: `Início: ${label}`,
        icon: Home,
        keywords: id === 'carteira' ? 'patrimônio líquido dívidas gráfico' : id === 'metas' ? 'reserva emergência meta' : 'previsto realizado saldo fim do mês',
        run: () => goTo(`inicio/${id}`)
      })),
      ...SIMULATORS.map(x => ({ group: 'Simulador', label: x.label, hint: x.hint, icon: Calculator, run: () => goTo(`simuladores/${x.value}`) })),
      ...data.buckets.map(b => ({ group: 'Bucket', label: b.name, emoji: b.icon, run: () => goTo(b.kind === 'stocks' ? 'acoes' : 'inicio/carteira') })),
      ...data.stocks.map(st => ({ group: 'Ativo', label: st.ticker, hint: st.name, emoji: '📈', run: () => goTo('acoes') })),
      ...(bills || [])
        .filter(i => String(i.name || '').trim())
        .map(i => ({ group: 'Conta', label: i.name, hint: 'Gastos mensais', emoji: '🧾', run: () => goTo('gastos') }))
    ],
    [data.buckets, data.stocks, bills]
  );

  if (onboarded === undefined || (onboarded && data.loading))
    return (
      <div className="grid min-h-screen place-items-center">
        <div className="h-9 w-9 animate-spin rounded-full border-4 border-line border-t-accent" />
      </div>
    );
  if (!onboarded) return <Boasvindas />;

  const page = PAGES.find(p => p.id === tab);
  const Page = page.Component;
  const total = totalBalance(data.buckets, data.records, data.extras, data.withdrawals, new Date(), data.stocks);

  return (
    <div className="min-h-screen lg:pl-64 print:pl-0">
      {/* Menu lateral (computador) */}
      <aside className="fixed inset-y-0 left-0 hidden w-64 print:!hidden flex-col border-r border-line bg-surface p-4 lg:flex">
        <div className="mb-6 flex items-center gap-2.5 px-2">
          <img src="/favicon.svg" alt="" className="h-8 w-8" />
          <div>
            <p className="font-bold leading-tight">Controle de Aportes</p>
            <p className="text-xs text-muted">versão local</p>
          </div>
        </div>
        <div className="mb-4 rounded-xl bg-surface2 p-3">
          <p className="text-xs text-muted">Patrimônio</p>
          <p className="text-lg font-bold">
            <CountUp value={brl(total)} />
          </p>
        </div>
        <button
          onClick={() => setSearch(true)}
          className="mb-3 flex w-full items-center gap-2 rounded-xl border border-line px-3 py-2 text-sm text-muted transition hover:text-ink"
        >
          <Search size={16} /> Buscar<kbd className="ml-auto rounded border border-line px-1.5 text-[10px]">Ctrl K</kbd>
        </button>
        <nav className="flex-1 space-y-4 overflow-y-auto">
          {GROUPS.map(g => (
            <div key={g}>
              <p className="mb-1 px-3 text-[10px] font-bold uppercase tracking-wider text-faint">{g}</p>
              <div className="space-y-0.5">
                {PAGES.filter(p => p.group === g).map(p => (
                  <button
                    key={p.id}
                    onClick={() => goTo(p.id)}
                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold transition ${tab === p.id ? 'bg-accent/10 text-accent' : 'text-muted hover:bg-surface2 hover:text-ink'}`}
                  >
                    <p.icon size={18} /> {p.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </nav>
        <ThemeToggle />
      </aside>

      {/* Topo (celular/tablet) */}
      <header className="sticky top-0 z-30 flex print:hidden items-center justify-between border-b border-line bg-surface/90 px-4 py-3 backdrop-blur lg:hidden">
        <div className="flex items-center gap-2">
          <img src="/favicon.svg" alt="" className="h-7 w-7" />
          <span className="font-bold">{page.label}</span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setSearch(true)} className="btn-ghost p-2" aria-label="Buscar">
            <Search size={18} />
          </button>
          <select value={tab} onChange={e => goTo(e.target.value)} className="field mt-0 w-auto py-1.5 text-xs" aria-label="Ir para">
            {PAGES.map(p => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-28 pt-6 sm:px-6 lg:pb-10 lg:pt-8">
        {tab !== 'backup' && (
          <div className="print:hidden">
            <BackupBanner goTo={goTo} />
          </div>
        )}
        <div className="print:hidden">
          <MonthCloseBanner />
        </div>
        {/* key: ao trocar de aba a página remonta e a animação de entrada (.page-enter) roda de novo. */}
        <div key={tab} className="page-enter">
          <Page data={data} goTo={goTo} />
        </div>
      </main>
      <CommandPalette open={search} onClose={() => setSearch(false)} items={searchItems} />

      {/* Barra inferior (celular) */}
      <nav className="fixed inset-x-0 bottom-0 z-30 print:hidden grid grid-cols-4 border-t border-line bg-surface/95 backdrop-blur lg:hidden">
        {PAGES.filter(p => MOBILE.includes(p.id)).map(p => (
          <button
            key={p.id}
            onClick={() => goTo(p.id)}
            className={`flex flex-col items-center gap-0.5 py-2 text-[10px] font-semibold ${tab === p.id ? 'text-accent' : 'text-muted'}`}
          >
            <p.icon size={20} />
            {p.label.split(' ')[0]}
          </button>
        ))}
      </nav>
    </div>
  );
}
