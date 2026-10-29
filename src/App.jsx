import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { BarChart3, CalendarCheck, CalendarRange, Database, Home, LineChart, Moon, Receipt, Settings2, Sun, TrendingUp } from 'lucide-react';
import { db } from '@/db/database';
import useFinanceData from '@/hooks/useFinanceData';
import useAutoBackup from '@/hooks/useAutoBackup';
import BackupBanner from '@/components/BackupBanner';
import Inicio from '@/pages/Inicio';
import Acoes from '@/pages/Acoes';
import Saques from '@/pages/Saques';
import GastosMensais from '@/pages/GastosMensais';
import Relatorio from '@/pages/Relatorio';
import Fechamento from '@/pages/Fechamento';
import Gerenciar from '@/pages/Gerenciar';
import Projecao from '@/pages/Projecao';
import Backup from '@/pages/Backup';
import Boasvindas from '@/pages/Boasvindas';
import { brl, totalBalance } from '@/lib/finance';

// As 7 abas do app original + Fechamento do mês e Backup.
const PAGES = [
  { id: 'inicio', label: 'Início', icon: Home, Component: Inicio },
  { id: 'acoes', label: 'FIIs e Ações', icon: TrendingUp, Component: Acoes },
  { id: 'saques', label: 'Saques e gastos', icon: Receipt, Component: Saques },
  { id: 'gastos', label: 'Gastos mensais', icon: CalendarRange, Component: GastosMensais },
  { id: 'relatorio', label: 'Relatório', icon: BarChart3, Component: Relatorio },
  { id: 'fechamento', label: 'Fechamento do mês', icon: CalendarCheck, Component: Fechamento },
  { id: 'projecao', label: 'Projeção', icon: LineChart, Component: Projecao },
  { id: 'gerenciar', label: 'Gerenciar ativos', icon: Settings2, Component: Gerenciar },
  { id: 'backup', label: 'Backup', icon: Database, Component: Backup }
];
const MOBILE = ['inicio', 'acoes', 'saques', 'relatorio', 'gerenciar'];

const readTab = () => { const t = window.location.hash.slice(1); return PAGES.some(p => p.id === t) ? t : 'inicio'; };

function ThemeToggle() {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'));
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    try { localStorage.setItem('tema', dark ? 'escuro' : 'claro'); } catch { /* sem localStorage: só não lembra o tema */ }
  }, [dark]);
  return <button onClick={() => setDark(d => !d)} className="btn-ghost" title="Alternar tema">{dark ? <Sun size={18} /> : <Moon size={18} />}<span className="lg:inline hidden">{dark ? 'Tema claro' : 'Tema escuro'}</span></button>;
}

export default function App() {
  const onboarded = useLiveQuery(async () => (await db.settings.get('onboarded'))?.value || (await db.buckets.count()) > 0, []);
  const data = useFinanceData();
  const [tab, setTab] = useState(readTab);
  useAutoBackup(!!onboarded);
  useEffect(() => {
    const onHash = () => setTab(readTab());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);
  // Pede ao navegador para não apagar o banco sozinho quando faltar espaço.
  useEffect(() => { navigator.storage?.persist?.(); }, []);
  const goTo = id => { window.location.hash = id; window.scrollTo({ top: 0 }); };

  if (onboarded === undefined || (onboarded && data.loading)) return <div className="grid min-h-screen place-items-center"><div className="h-9 w-9 animate-spin rounded-full border-4 border-line border-t-accent" /></div>;
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
          <div><p className="font-bold leading-tight">Controle de Aportes</p><p className="text-xs text-muted">versão local</p></div>
        </div>
        <div className="mb-4 rounded-xl bg-surface2 p-3">
          <p className="text-xs text-muted">Patrimônio</p>
          <p className="text-lg font-bold">{brl(total)}</p>
        </div>
        <nav className="flex-1 space-y-1">
          {PAGES.map(p => (
            <button key={p.id} onClick={() => goTo(p.id)} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${tab === p.id ? 'bg-accent/10 text-accent' : 'text-muted hover:bg-surface2 hover:text-ink'}`}>
              <p.icon size={18} /> {p.label}
            </button>
          ))}
        </nav>
        <ThemeToggle />
      </aside>

      {/* Topo (celular/tablet) */}
      <header className="sticky top-0 z-30 flex print:hidden items-center justify-between border-b border-line bg-surface/90 px-4 py-3 backdrop-blur lg:hidden">
        <div className="flex items-center gap-2"><img src="/favicon.svg" alt="" className="h-7 w-7" /><span className="font-bold">{page.label}</span></div>
        <div className="flex items-center gap-1">
          <select value={tab} onChange={e => goTo(e.target.value)} className="field mt-0 w-auto py-1.5 text-xs" aria-label="Ir para">{PAGES.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}</select>
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-28 pt-6 sm:px-6 lg:pb-10 lg:pt-8">
        {tab !== 'backup' && <div className="print:hidden"><BackupBanner goTo={goTo} /></div>}
        <Page data={data} goTo={goTo} />
      </main>

      {/* Barra inferior (celular) */}
      <nav className="fixed inset-x-0 bottom-0 z-30 print:hidden grid grid-cols-5 border-t border-line bg-surface/95 backdrop-blur lg:hidden">
        {PAGES.filter(p => MOBILE.includes(p.id)).map(p => (
          <button key={p.id} onClick={() => goTo(p.id)} className={`flex flex-col items-center gap-0.5 py-2 text-[10px] font-semibold ${tab === p.id ? 'text-accent' : 'text-muted'}`}><p.icon size={20} />{p.label.split(' ')[0]}</button>
        ))}
      </nav>
    </div>
  );
}
