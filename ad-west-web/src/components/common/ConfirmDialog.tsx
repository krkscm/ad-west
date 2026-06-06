import React, { createContext, useContext, useState, useCallback } from 'react';

interface ConfirmOptions {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

type ShowConfirm = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ShowConfirm | undefined>(undefined);

interface PendingConfirm {
  options: ConfirmOptions;
  resolve: (value: boolean) => void;
}

export const ConfirmDialogProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [pending, setPending] = useState<PendingConfirm | null>(null);

  const showConfirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setPending({ options, resolve });
    });
  }, []);

  const respond = useCallback((value: boolean) => {
    setPending((prev) => {
      if (prev) prev.resolve(value);
      return null;
    });
  }, []);

  return (
    <ConfirmContext.Provider value={showConfirm}>
      {children}
      {pending && (
        <div className="modal-overlay" style={{ zIndex: 2000 }} onClick={() => respond(false)}>
          <div
            className="modal-panel animate-slide-up"
            style={{
              width: '100%', maxWidth: '420px',
              color: 'var(--text-primary-dark)',
              padding: '28px',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', marginBottom: '24px' }}>
              <div style={{
                width: '42px', height: '42px', borderRadius: '50%', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.1rem',
                backgroundColor: pending.options.danger
                  ? 'rgba(239, 68, 68, 0.12)'
                  : 'rgba(59, 130, 246, 0.12)',
                border: `1px solid ${pending.options.danger ? 'rgba(239,68,68,0.25)' : 'rgba(59,130,246,0.25)'}`,
              }}>
                {pending.options.danger ? '⚠' : 'ℹ'}
              </div>
              <div style={{ paddingTop: '2px' }}>
                {pending.options.title && (
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '6px', lineHeight: 1.3 }}>
                    {pending.options.title}
                  </h3>
                )}
                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary-dark)', lineHeight: 1.55 }}>
                  {pending.options.message}
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                className="btn btn-secondary"
                onClick={() => respond(false)}
              >
                {pending.options.cancelLabel ?? 'Cancel'}
              </button>
              <button
                className={`btn ${pending.options.danger ? 'btn-danger' : 'btn-primary'}`}
                onClick={() => respond(true)}
              >
                {pending.options.confirmLabel ?? 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
};

export const useConfirm = (): ShowConfirm => {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm must be used within ConfirmDialogProvider');
  return ctx;
};
