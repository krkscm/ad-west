import React, { forwardRef } from 'react';

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  children: React.ReactNode;
  variant?: 'secondary' | 'ghost';
}

export const CloseIcon: React.FC = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

export const MoreVerticalIcon: React.FC = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <circle cx="12" cy="5" r="1.8" />
    <circle cx="12" cy="12" r="1.8" />
    <circle cx="12" cy="19" r="1.8" />
  </svg>
);

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  {
    label,
    children,
    className = '',
    title,
    disabled = false,
    variant = 'secondary',
    type = 'button',
    ...rest
  },
  ref,
) {
  const variantClass = variant === 'ghost' ? 'btn-icon--ghost' : 'btn btn-secondary';
  return (
    <button
      ref={ref}
      type={type}
      className={`btn-icon ${variantClass} ${className}`.trim()}
      aria-label={label}
      title={title ?? label}
      disabled={disabled}
      {...rest}
    >
      {children}
    </button>
  );
});
