import React, { useEffect, useState } from 'react'
import { AppNotificationApi, backendApi } from '../../utils/backendApi'

interface Props {
  userType: 'admin' | 'member'
}

export function NotificationCarouselModal({ userType }: Props) {
  const [notifications, setNotifications] = useState<AppNotificationApi[]>([])
  const [index, setIndex] = useState(0)
  const [visible, setVisible] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    backendApi.listNotifications(true)
      .then((res) => {
        const relevant = res.items.filter((n) => n.target === 'all' || n.target === userType)
        if (relevant.length > 0) {
          setNotifications(relevant)
          setVisible(true)
        }
      })
      .catch(() => {})
  }, [userType])

  if (!visible || dismissed || notifications.length === 0) return null

  const current = notifications[index]
  const total = notifications.length

  const prev = () => setIndex((i) => (i - 1 + total) % total)
  const next = () => setIndex((i) => (i + 1) % total)

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 2000, padding: '16px',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) setDismissed(true) }}
    >
      <div
        style={{
          background: 'var(--surface-dark)', border: '1px solid var(--border-dark)',
          borderRadius: '16px', padding: '36px', maxWidth: '500px', width: '100%',
          boxShadow: 'var(--shadow-lg)', position: 'relative',
        }}
      >
        {/* Close */}
        <button
          onClick={() => setDismissed(true)}
          style={{
            position: 'absolute', top: '14px', right: '16px',
            background: 'none', border: 'none', fontSize: '1.3rem',
            cursor: 'pointer', color: 'var(--text-secondary-dark)', lineHeight: 1,
          }}
          aria-label="Close"
        >
          ×
        </button>

        {/* Bell icon */}
        <div style={{ fontSize: '2.5rem', marginBottom: '12px', textAlign: 'center' }}>🔔</div>

        {/* Counter */}
        {total > 1 && (
          <p style={{ textAlign: 'center', margin: '0 0 10px', fontSize: '0.78rem', color: 'var(--text-secondary-dark)' }}>
            {index + 1} of {total}
          </p>
        )}

        {/* Content */}
        <h2 style={{ margin: '0 0 12px', fontSize: '1.2rem', fontWeight: 800, textAlign: 'center', color: 'var(--text-primary-dark)' }}>
          {current.title}
        </h2>
        <p style={{ margin: '0 0 24px', fontSize: '0.9rem', color: 'var(--text-secondary-dark)', lineHeight: 1.7, whiteSpace: 'pre-wrap', textAlign: 'center' }}>
          {current.message}
        </p>

        {/* Dot indicators */}
        {total > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', marginBottom: '20px' }}>
            {notifications.map((_, i) => (
              <button
                key={i}
                onClick={() => setIndex(i)}
                style={{
                  width: i === index ? '20px' : '8px', height: '8px',
                  borderRadius: '4px', border: 'none', padding: 0, cursor: 'pointer',
                  background: i === index ? 'var(--primary)' : 'var(--border-dark)',
                  transition: 'width 0.2s, background 0.2s',
                }}
              />
            ))}
          </div>
        )}

        {/* Navigation */}
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
          {total > 1 && (
            <>
              <button className="btn btn-secondary" style={{ fontSize: '0.85rem', padding: '7px 16px' }} onClick={prev}>← Prev</button>
              <button className="btn btn-secondary" style={{ fontSize: '0.85rem', padding: '7px 16px' }} onClick={next}>Next →</button>
            </>
          )}
          <button className="btn btn-primary" style={{ fontSize: '0.85rem', padding: '7px 20px' }} onClick={() => setDismissed(true)}>
            {total > 1 ? 'Close All' : 'Got it'}
          </button>
        </div>
      </div>
    </div>
  )
}
