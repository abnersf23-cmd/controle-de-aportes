import { createContext, useCallback, useContext, useState } from 'react';
import Modal from './Modal';

// confirm('Excluir?') que devolve uma Promise<boolean>, com visual do app.
const ConfirmContext = createContext(null);

export function ConfirmProvider({ children }) {
  const [state, setState] = useState(null);
  const confirm = useCallback(
    (title, { message = '', confirmLabel = 'Excluir', danger = true } = {}) =>
      new Promise(resolve => setState({ title, message, confirmLabel, danger, resolve })),
    []
  );
  const close = value => {
    state?.resolve(value);
    setState(null);
  };
  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Modal open={!!state} title={state?.title} onClose={() => close(false)}>
        {state?.message && <p className="mb-5 text-sm text-muted">{state.message}</p>}
        <div className="flex justify-end gap-2">
          <button className="btn-secondary" onClick={() => close(false)}>
            Cancelar
          </button>
          <button className={state?.danger ? 'btn-danger' : 'btn-primary'} onClick={() => close(true)} autoFocus>
            {state?.confirmLabel}
          </button>
        </div>
      </Modal>
    </ConfirmContext.Provider>
  );
}

export const useConfirm = () => useContext(ConfirmContext);
