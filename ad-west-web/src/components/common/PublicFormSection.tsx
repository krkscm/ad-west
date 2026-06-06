import React from 'react'

interface PublicFormSectionProps {
  title: string
  description?: string
  children: React.ReactNode
}

export function PublicFormSection({ title, description, children }: PublicFormSectionProps) {
  return (
    <section className="public-form-section animate-slide-up">
      <h2 className="public-form-section__title">{title}</h2>
      {description && <p className="public-form-section__copy">{description}</p>}
      {children}
    </section>
  )
}
