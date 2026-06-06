import React from 'react'

interface FormActionsProps {
  children: React.ReactNode
  hint?: string
  sticky?: boolean
}

export function FormActions({ children, hint, sticky = false }: FormActionsProps) {
  return (
    <div className={`form-actions-bar${sticky ? ' form-actions-bar--sticky' : ''}`}>
      {hint && <span className="form-actions-bar__hint">{hint}</span>}
      <div className="form-actions-bar__buttons">{children}</div>
    </div>
  )
}
