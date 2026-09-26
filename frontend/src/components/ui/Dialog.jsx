import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Button } from './Button';

// Figma "Dialog": native <dialog> + showModal() gives the focus trap, Esc to
// cancel and inert background for free. Replaces window.confirm()/alert().
const ConfirmContext = createContext(null);

export const ConfirmProvider = ({ children }) => {
  const [request, setRequest] = useState(null);
  const dialogRef = useRef(null);
  const cancelRef = useRef(null);
  const confirmRef = useRef(null);

  const confirm = useCallback(
    (options) => new Promise((resolve) => setRequest({ ...options, resolve })),
    []
  );

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!request || !dialog) return;
    if (!dialog.open) dialog.showModal();
    // Destructive dialogs start on Cancel so Enter can't delete by accident.
    (request.tone === 'danger' ? cancelRef : confirmRef).current?.focus();
  }, [request]);

  const close = (result) => {
    request?.resolve(result);
    dialogRef.current?.close();
    setRequest(null);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <dialog
        ref={dialogRef}
        role="alertdialog"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-body"
        onCancel={(e) => { e.preventDefault(); close(false); }}
        className="w-[min(420px,calc(100vw-32px))] rounded-xl bg-surface text-ink p-6 shadow-2xl"
      >
        {request && (
          <>
            <h2 id="confirm-title" className="font-display text-title text-ink">{request.title}</h2>
            <p id="confirm-body" className="mt-2 font-sans text-body text-ink-2">{request.body}</p>
            <div className="mt-6 flex justify-end gap-2">
              <Button ref={cancelRef} variant="secondary" onClick={() => close(false)}>Cancel</Button>
              <Button
                ref={confirmRef}
                variant={request.tone === 'danger' ? 'danger' : 'primary'}
                onClick={() => close(true)}
              >
                {request.confirmLabel || 'Confirm'}
              </Button>
            </div>
          </>
        )}
      </dialog>
    </ConfirmContext.Provider>
  );
};

export const useConfirm = () => {
  const confirm = useContext(ConfirmContext);
  if (!confirm) throw new Error('useConfirm must be used inside <ConfirmProvider>');
  return confirm;
};
