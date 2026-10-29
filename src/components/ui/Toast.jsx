import { createContext, useCallback, useContext, useState } from 'react';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';

// Avisos rápidos no canto da tela (sucesso, erro e "Desfazer").
const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [items, setItems] = useState([]);
  const dismiss = useCallback(id => setItems(list => list.filter(t => t.id !== id)), []);
  const push = useCallback(
    (message, { type = 'success', action, duration = 4500 } = {}) => {
      const id = Math.random().toString(36).slice(2);
      setItems(list => [...list.slice(-3), { id, message, type, action }]);
      setTimeout(() => dismiss(id), duration);
    },
    [dismiss]
  );
  return (
    <ToastContext.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed bottom-20 right-4 z-[60] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2 lg:bottom-4">
        {items.map(t => (
          <div key={t.id} className="card pointer-events-auto flex items-center gap-3 p-3 shadow-xl">
            {t.type === 'error' ? (
              <AlertTriangle size={18} className="shrink-0 text-bad" />
            ) : t.type === 'info' ? (
              <Info size={18} className="shrink-0 text-info" />
            ) : (
              <CheckCircle2 size={18} className="shrink-0 text-good" />
            )}
            <span className="flex-1 text-sm">{t.message}</span>
            {t.action && (
              <button
                className="text-sm font-semibold text-accent"
                onClick={() => {
                  t.action.onClick();
                  dismiss(t.id);
                }}
              >
                {t.action.label}
              </button>
            )}
            <button onClick={() => dismiss(t.id)} className="text-faint hover:text-ink" aria-label="Fechar aviso">
              <X size={16} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);

// Executa uma ação e mostra sucesso ou o erro de forma amigável.
export function useAction() {
  const toast = useToast();
  return useCallback(
    async (fn, successMessage, options) => {
      try {
        await fn();
        if (successMessage) toast(successMessage, options);
        return true;
      } catch (e) {
        toast(e?.message || 'Não foi possível concluir.', { type: 'error' });
        return false;
      }
    },
    [toast]
  );
}
