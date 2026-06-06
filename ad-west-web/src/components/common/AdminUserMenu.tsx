import React, { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../../context/auth-context';
import { UserAvatar } from './UserAvatar';

const POPOVER_WIDTH = 260;
const POPOVER_GAP = 8;
const VIEWPORT_PADDING = 12;

interface AdminUserMenuProps {
  name: string;
  email: string;
  picture?: string | null;
  gender?: string | null;
  roleLabel: string;
  roleBadgeClass: string;
}

export const AdminUserMenu: React.FC<AdminUserMenuProps> = ({
  name,
  email,
  picture,
  gender,
  roleLabel,
  roleBadgeClass,
}) => {
  const { logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [popoverStyle, setPopoverStyle] = useState<React.CSSProperties>({});
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const updatePopoverPosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();
    const width = Math.min(POPOVER_WIDTH, window.innerWidth - VIEWPORT_PADDING * 2);
    let left = rect.right - width;
    const maxLeft = window.innerWidth - width - VIEWPORT_PADDING;
    left = Math.max(VIEWPORT_PADDING, Math.min(left, maxLeft));

    setPopoverStyle({
      top: rect.bottom + POPOVER_GAP,
      left,
      width,
    });
  }, []);

  useLayoutEffect(() => {
    if (!isOpen) return;
    updatePopoverPosition();
  }, [isOpen, updatePopoverPosition]);

  useEffect(() => {
    if (!isOpen) return;

    const handleReposition = () => updatePopoverPosition();
    window.addEventListener('resize', handleReposition);
    window.addEventListener('scroll', handleReposition, true);
    return () => {
      window.removeEventListener('resize', handleReposition);
      window.removeEventListener('scroll', handleReposition, true);
    };
  }, [isOpen, updatePopoverPosition]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target)) return;
      if (popoverRef.current?.contains(target)) return;
      setIsOpen(false);
    };
    if (isOpen) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isOpen]);

  const handleLogout = () => {
    setIsOpen(false);
    logout();
  };

  return (
    <div className="admin-user-menu">
      <button
        ref={triggerRef}
        type="button"
        className={`admin-user-menu__trigger${isOpen ? ' admin-user-menu__trigger--open' : ''}`}
        onClick={() => setIsOpen((open) => !open)}
        aria-label="Account menu"
        aria-expanded={isOpen}
        aria-haspopup="menu"
      >
          <UserAvatar
            picture={picture}
            gender={gender}
            name={name}
            className="admin-user-menu__avatar admin-user-menu__avatar--illustration"
            alt=""
          />
        <span className="admin-user-menu__details">
          <span className="admin-user-menu__name">{name}</span>
          <span className="admin-user-menu__email">{email}</span>
          <span className={`badge ${roleBadgeClass} admin-user-menu__role`}>
            🛡️ {roleLabel}
          </span>
        </span>
      </button>

      {isOpen && createPortal(
        <div
          ref={popoverRef}
          className="admin-user-menu__popover animate-slide-up"
          style={popoverStyle}
          role="menu"
          aria-label="Account menu"
        >
          <div className="admin-user-menu__popover-header">
            <UserAvatar
              picture={picture}
              gender={gender}
              name={name}
              className="admin-user-menu__popover-avatar admin-user-menu__avatar--illustration"
              alt=""
            />
            <div className="admin-user-menu__popover-meta">
              <div className="admin-user-menu__popover-name">{name}</div>
              <div className="admin-user-menu__popover-email">{email}</div>
              <span className={`badge ${roleBadgeClass} admin-user-menu__role`}>
                🛡️ {roleLabel}
              </span>
            </div>
          </div>
          <button
            type="button"
            className="admin-user-menu__action admin-user-menu__action--logout"
            role="menuitem"
            onClick={handleLogout}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Log out
          </button>
        </div>,
        document.body,
      )}
    </div>
  );
};
