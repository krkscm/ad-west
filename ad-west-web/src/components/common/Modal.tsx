import React, { useEffect } from 'react';
import ReactDOM from 'react-dom';
import { CloseIcon, IconButton } from './IconButton';

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
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-panel animate-slide-up"
        style={{
          width: '100%',
          maxWidth,
          maxHeight: 'calc(100vh - 40px)',
          overflowY: 'auto',
          color: 'var(--text-primary-dark)',
          padding: '28px',
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
          <IconButton label="Close" onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
};
