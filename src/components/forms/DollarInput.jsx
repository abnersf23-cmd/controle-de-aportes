import { useState } from 'react';
import { Globe, Loader2 } from 'lucide-react';
import { fetchDollarRate } from '@/services/quotes';

// Campo de cotação do dólar com botão "buscar online".
export default function DollarInput({ value, onChange, required = true, label = 'Cotação do dólar (R$)' }) {
  const [loading, setLoading] = useState(false), [error, setError] = useState('');
  const fetchNow = async () => {
    setLoading(true); setError('');
    try { onChange(String(await fetchDollarRate())); } catch (e) { setError(e.message); }
    setLoading(false);
  };
  return (
    <label className="label">{label}
      <div className="mt-1 flex gap-2">
        <input required={required} type="number" min="0.01" step="0.0001" value={value} onChange={e => onChange(e.target.value)} className="field mt-0" />
        <button type="button" onClick={fetchNow} disabled={loading} className="btn-secondary shrink-0 px-3" title="Buscar cotação atual na internet">
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Globe size={16} />}<span className="hidden sm:inline">Buscar</span>
        </button>
      </div>
      {error && <span className="mt-1 block font-normal text-bad">{error}</span>}
    </label>
  );
}
