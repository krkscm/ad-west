import React from 'react'

type InlineAlertVariant = 'error' | 'warning' | 'info' | 'success'

interface InlineAlertProps {
  variant?: InlineAlertVariant
  children: React.ReactNode
}

export function InlineAlert({ variant = 'error', children }: InlineAlertProps) {
  return (
    <div className={`inline-alert inline-alert--${variant}`} role="alert">
      {children}
    </div>
  )
}
