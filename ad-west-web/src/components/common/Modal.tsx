import React, { useEffect } from 'react';
import ReactDOM from 'react-dom';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidth?: string;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, maxWidth = '560px' }) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <div
      className="flex-center"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: 'rgba(9, 13, 24, 0.82)',
        backdropFilter: 'blur(6px)',
        zIndex: 9999,
        padding: '20px',
        animation: 'fadeIn 0.25s ease',
      }}
      onClick={onClose}
    >
      <div
        className="modal-panel"
        style={{
          width: '100%',
          maxWidth,
          maxHeight: 'calc(100vh - 40px)',
          overflowY: 'auto',
          color: 'var(--text-primary-dark)',
          padding: '28px',
          animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '20px',
            borderBottom: '1px solid var(--border-dark)',
            paddingBottom: '14px',
          }}
        >
          <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>{title}</h3>
          <button
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              fontSize: '1.4rem',
              color: 'var(--text-secondary-dark)',
              transition: 'var(--transition-fast)',
              lineHeight: 1,
              padding: '0 2px',
            }}
            onClick={onClose}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-primary-dark)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-secondary-dark)')}
          >
            &times;
          </button>
        </div>
        <div>{children}</div>
      </div>
    </div>,
    document.body,
  );
};
