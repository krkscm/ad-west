import React, { useState, useRef, useEffect } from 'react';
import { backendApi, ApprovalNotificationApi } from '../../utils/backendApi';
import { useAuth } from '../../context/auth-context';

export const NotificationBell: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [items, setItems] = useState<ApprovalNotificationApi[]>([]);
  const [loading, setLoading] = useState(false);
  const { adminUser } = useAuth();
  const ref = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen]);

  const unreadCount = items.filter((item) => !readIds.includes(item.id)).length;

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setIsOpen(v => !v)}
        aria-label="Notifications"
        style={{
          position: 'relative',
          background: isOpen ? 'rgba(148,163,184,0.1)' : 'transparent',
          border: 'none',
          cursor: 'pointer',
          color: isOpen ? 'var(--text-primary-dark)' : 'var(--text-secondary-dark)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '36px',
          height: '36px',
          borderRadius: '8px',
          transition: 'background 0.15s, color 0.15s',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.background = 'rgba(148,163,184,0.1)';
          e.currentTarget.style.color = 'var(--text-primary-dark)';
        }}
        onMouseLeave={e => {
          if (!isOpen) {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = 'var(--text-secondary-dark)';
          }
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unreadCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: '4px',
              right: '4px',
              minWidth: '16px',
              height: '16px',
              padding: '0 4px',
              borderRadius: '999px',
              background: 'var(--error)',
              color: '#fff',
              fontSize: '0.68rem',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              lineHeight: 1,
            }}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: 0,
            width: '320px',
            zIndex: 500,
            padding: 0,
            overflow: 'hidden',
            background: 'var(--surface-dark-elevated)',
            border: '1px solid var(--border-dark)',
            borderRadius: '14px',
            boxShadow: '0 16px 40px -8px rgba(0,0,0,0.3)',
          }}
        >
          <div style={{
            padding: '14px 18px',
            borderBottom: '1px solid var(--border-dark)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>Notifications</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary-dark)' }}>{unreadCount} unread</span>
          </div>
          {loading ? (
            <div style={{ padding: '20px 18px', textAlign: 'center', color: 'var(--text-secondary-dark)', fontSize: '0.85rem' }}>
              Loading notifications...
            </div>
          ) : items.length === 0 ? (
            <div style={{ padding: '40px 18px', textAlign: 'center', color: 'var(--text-secondary-dark)' }}>
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.35, display: 'block', margin: '0 auto 10px' }}>
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
              <p style={{ margin: 0, fontSize: '0.85rem' }}>No notifications yet</p>
            </div>
          ) : (
            <div style={{ maxHeight: '320px', overflowY: 'auto' }}>
              {items.map((item, index) => {
                const unread = !readIds.includes(item.id);
                return (
                  <div
                    key={item.id}
                    style={{
                      padding: '12px 14px',
                      borderBottom: index < items.length - 1 ? '1px solid var(--border-dark)' : 'none',
                      background: unread ? 'rgba(59, 130, 246, 0.12)' : 'transparent',
                    }}
                  >
                    <div style={{ fontSize: '0.84rem', fontWeight: unread ? 700 : 600, color: 'var(--text-primary-dark)' }}>
                      {item.message}
                    </div>
                    <div style={{ marginTop: '4px', fontSize: '0.74rem', color: 'var(--text-secondary-dark)' }}>
                      {new Date(item.createdAt).toLocaleString()}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
