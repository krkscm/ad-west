import React, { createContext, useContext, useState, useCallback } from 'react';
import { CloseIcon } from './IconButton';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  addToast: (message: string, type: ToastType) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const addToast = useCallback((message: string, type: ToastType) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);

    // Auto dismiss after 3.5s
    setTimeout(() => {
      removeToast(id);
    }, 3500);
  }, [removeToast]);

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}
      <div className="toast-container">
        {toasts.map(t => (
          <div key={t.id} className={`toast toast-${t.type} animate-slide-up`}>
            <div className="flex-center" style={{ gap: '10px' }}>
              <span style={{ fontSize: '1.25rem' }}>
                {t.type === 'success' && '🟢'}
                {t.type === 'error' && '🔴'}
                {t.type === 'warning' && '🟡'}
                {t.type === 'info' && '🔵'}
              </span>
              <p style={{ fontSize: '0.9rem', fontWeight: 500, lineHeight: 1.4 }}>{t.message}</p>
            </div>
            <button type="button" className="toast-close" onClick={() => removeToast(t.id)} aria-label="Dismiss">
              <CloseIcon />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
