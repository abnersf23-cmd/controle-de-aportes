import { today } from '@/lib/dates';

// Buckets e ativos usados quando você escolhe "Começar do zero".
export function defaultBuckets() {
  const t = today();
  return [
    { name: 'Caixa', category: 'Caixa', color: '#16A34A', icon: '💵', percentage: 40, protected: true, kind: 'normal', rate_type: 'custom', base_rate: 0, management_fee: 0, cdi_percentage: 100, rate_updated_date: t, rate_history: [{ rate: 0, start_date: t }] },
    { name: 'Tesouro Selic', category: 'Tesouro Direto', color: '#2563EB', icon: '🏛️', percentage: 22, protected: false, kind: 'normal', rate_type: 'selic', base_rate: 14.25, management_fee: 0.4, cdi_percentage: 100, rate_updated_date: t, rate_history: [{ rate: 14.25, start_date: t }] },
    { name: 'Dólar (Wise Rende+)', category: 'Moeda Estrangeira', color: '#CA8A04', icon: '💲', percentage: 18, protected: false, kind: 'normal', rate_type: 'fed', base_rate: 3.75, management_fee: 0.4, cdi_percentage: 100, rate_updated_date: t, rate_history: [{ rate: 3.35, start_date: t }], current_dollar_rate: 5.4, dollar_rate_updated_date: t, last_dollar_rate: 5.4 },
    { name: 'FIIs e Ações', category: 'Renda variável', color: '#DC2626', icon: '📊', percentage: 20, protected: false, kind: 'stocks', rate_type: 'custom', base_rate: 0, management_fee: 0, cdi_percentage: 100, rate_updated_date: t, rate_history: [{ rate: 0, start_date: t }] }
  ];
}

const allMonths = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
export function defaultStocks() {
  return [
    { ticker: 'MXRF11', name: 'Maxi Renda', type: 'fii', color: '#3B82F6', dividend_months: allMonths, contributions: [] },
    { ticker: 'BBAS3', name: 'Banco do Brasil', type: 'acao', color: '#F59E0B', dividend_months: [3, 5, 6, 8, 9, 11, 12], contributions: [] },
    { ticker: 'KLBN11', name: 'Klabin', type: 'acao', color: '#8B5CF6', dividend_months: [1, 5, 9], contributions: [] },
    { ticker: 'ITSA4', name: 'Itaúsa', type: 'acao', color: '#EC4899', dividend_months: [1, 3, 4, 7, 8, 10], contributions: [] },
    { ticker: 'GARE11', name: 'Guardian Real Estate', type: 'fii', color: '#10B981', dividend_months: allMonths, contributions: [] },
    { ticker: 'BTCI11', name: 'BTG Crédito Imobiliário', type: 'fii', color: '#06B6D4', dividend_months: allMonths, contributions: [] }
  ];
}
