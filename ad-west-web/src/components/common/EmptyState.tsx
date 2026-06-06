import React from 'react'

interface EmptyStateProps {
  icon?: string
  title: string
  copy?: string
  action?: React.ReactNode
}

export function EmptyState({ icon = '📭', title, copy, action }: EmptyStateProps) {
  return (
    <div className="empty-state">
      <div className="empty-state__icon" aria-hidden="true">{icon}</div>
      <h3 className="empty-state__title">{title}</h3>
      {copy && <p className="empty-state__copy">{copy}</p>}
      {action && <div style={{ marginTop: '20px' }}>{action}</div>}
    </div>
  )
}
