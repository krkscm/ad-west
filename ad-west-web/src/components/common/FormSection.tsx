import React from 'react'

export type FormSectionAccent = 'primary' | 'success' | 'warning' | 'violet' | 'info' | 'none'

interface FormSectionProps {
  title: string
  description?: string
  accent?: FormSectionAccent
  children: React.ReactNode
  className?: string
  flatHover?: boolean
}

export function FormSection({
  title,
  description,
  accent = 'primary',
  children,
  className,
  flatHover = false,
}: FormSectionProps) {
  const accentClass = accent !== 'none' ? `glass-panel--accent-${accent}` : ''
  const toneClass = accent !== 'none' && accent !== 'primary' ? `form-section--${accent}` : ''

  return (
    <section
      className={[
        'form-section',
        'glass-panel',
        accentClass,
        toneClass,
        flatHover ? 'glass-panel--flat' : '',
        className ?? '',
      ].filter(Boolean).join(' ')}
    >
      <header className="form-section__header">
        <div className="form-section__kicker">{title}</div>
        {description && <p className="form-section__copy">{description}</p>}
      </header>
      {children}
    </section>
  )
}
