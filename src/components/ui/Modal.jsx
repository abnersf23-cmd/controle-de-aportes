import { useEffect } from 'react';
import { X } from 'lucide-react';

// Janela sobreposta. Fecha com Esc ou clicando fora.
export default function Modal({ open, title, subtitle, onClose, children, wide = false }) {
  useEffect(() => {
    if (!open) return;
    const onKey = e => e.key === 'Escape' && onClose?.();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onMouseDown={e => e.target === e.currentTarget && onClose?.()}
    >
      <div
        role="dialog"
        aria-modal="true"
        className={`card max-h-[92vh] w-full overflow-y-auto rounded-b-none p-5 shadow-2xl sm:rounded-2xl ${wide ? 'sm:max-w-2xl' : 'sm:max-w-md'}`}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold">{title}</h2>
            {subtitle && <p className="text-sm text-muted">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="btn-ghost -mr-2 -mt-1" aria-label="Fechar">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
