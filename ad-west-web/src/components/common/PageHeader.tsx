import React from 'react'

export interface PageStat {
  label: string
  value: string | number
  variant?: 'info' | 'success' | 'warning'
}

interface PageHeaderProps {
  title: string
  icon?: string
  subtitle?: string
  actions?: React.ReactNode
  stats?: PageStat[]
}

export function PageHeader({ title, icon, subtitle, actions, stats }: PageHeaderProps) {
  return (
    <header className="page-header">
      <div className="page-header__main">
        <h2 className="page-title">
          {icon && <span className="page-title__icon" aria-hidden="true">{icon}</span>}
          <span>{title}</span>
        </h2>
        {subtitle && <p className="page-subtitle">{subtitle}</p>}
        {stats && stats.length > 0 && (
          <div className="page-header__stats">
            {stats.map((stat) => (
              <span key={stat.label} className={`page-stat page-stat--${stat.variant ?? 'info'}`}>
                <span className="page-stat__value">{stat.value}</span>
                {stat.label}
              </span>
            ))}
          </div>
        )}
      </div>
      {actions && <div className="page-header__actions">{actions}</div>}
    </header>
  )
}
