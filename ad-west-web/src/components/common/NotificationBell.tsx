import React, { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { backendApi, ApprovalNotificationApi } from '../../utils/backendApi';
import { useAuth } from '../../context/auth-context';

const POPOVER_WIDTH = 320;
const POPOVER_GAP = 8;
const VIEWPORT_PADDING = 12;

export const NotificationBell: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [items, setItems] = useState<ApprovalNotificationApi[]>([]);
  const [loading, setLoading] = useState(false);
  const [popoverStyle, setPopoverStyle] = useState<React.CSSProperties>({});
  const { adminUser } = useAuth();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const readStorageKey = adminUser ? `adwest-approval-notifications-read-${adminUser.sub}` : '';
  const [readIds, setReadIds] = useState<string[]>([]);

  useEffect(() => {
    if (!readStorageKey) return;
    try {
      const raw = localStorage.getItem(readStorageKey);
      const parsed = raw ? JSON.parse(raw) : [];
      setReadIds(Array.isArray(parsed) ? parsed.filter((value) => typeof value === 'string') : []);
    } catch {
      setReadIds([]);
    }
  }, [readStorageKey]);

  useEffect(() => {
    if (!isOpen) return;
    const load = async () => {
      setLoading(true);
      try {
        const rows = await backendApi.listMyApprovalNotifications();
        setItems(rows);
      } catch {
        setItems([]);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !readStorageKey) return;

    const ids = Array.from(new Set([...readIds, ...items.map((item) => item.id)]));
    setReadIds(ids);
    localStorage.setItem(readStorageKey, JSON.stringify(ids));
  }, [isOpen, items, readIds, readStorageKey]);

  const updatePopoverPosition = useCallback(() => {
    const button = buttonRef.current;
    if (!button) return;

    const rect = button.getBoundingClientRect();
    const width = Math.min(POPOVER_WIDTH, window.innerWidth - VIEWPORT_PADDING * 2);
    let left = rect.left + rect.width / 2 - width / 2;
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
      if (buttonRef.current?.contains(target)) return;
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

  const unreadCount = items.filter((item) => !readIds.includes(item.id)).length;

  const statusLabel = loading
    ? 'Loading…'
    : unreadCount > 0
      ? `${unreadCount} unread`
      : items.length > 0
        ? 'All caught up'
        : null;

  return (
    <div className="notification-bell">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        aria-label="Notifications"
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        className={`notification-bell__trigger${isOpen ? ' notification-bell__trigger--open' : ''}`}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unreadCount > 0 && (
          <span className="notification-bell__badge">
            <span className="pulse-indicator" style={{ position: 'absolute', inset: '-2px', borderRadius: '999px', opacity: 0.45 }} aria-hidden="true" />
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && createPortal(
        <div
          ref={popoverRef}
          className="notification-popover animate-slide-up"
          style={popoverStyle}
          role="dialog"
          aria-label="Notifications"
        >
          <div className="notification-popover__header">
            <span className="notification-popover__title">Notifications</span>
            {statusLabel && (
              <span className="notification-popover__status">{statusLabel}</span>
            )}
          </div>

          {loading ? (
            <div className="notification-popover__loading">Loading notifications…</div>
          ) : items.length === 0 ? (
            <div className="notification-popover__empty">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
              <p className="notification-popover__empty-title">No notifications yet</p>
              <p className="notification-popover__empty-copy">Approval updates will appear here.</p>
            </div>
          ) : (
            <div className="notification-popover__list">
              {items.map((item, index) => {
                const unread = !readIds.includes(item.id);
                return (
                  <div
                    key={item.id}
                    className={`notification-popover__item${unread ? ' notification-popover__item--unread' : ''}${index < items.length - 1 ? ' notification-popover__item--bordered' : ''}`}
                  >
                    <div className="notification-popover__message">{item.message}</div>
                    <div className="notification-popover__time">
                      {new Date(item.createdAt).toLocaleString()}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>,
        document.body,
      )}
    </div>
  );
};
