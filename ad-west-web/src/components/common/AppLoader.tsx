import React from 'react'
import { AuthPageLayout } from './AuthPageLayout'

interface Props {
  title?: string
  message?: string
}

export const AppLoader: React.FC<Props> = ({
  title = 'Preparing your workspace',
  message = 'Signing you in and loading your dashboard.',
}) => (
  <AuthPageLayout title="Loading" backgroundImage="/login-bg.webp">
    <div
      className="login-card login-card--compact app-loader-card animate-slide-up"
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={title}
    >
      <div className="app-loader-visual">
        <div className="app-loader-glow" aria-hidden="true" />
        <img
          src="/loader.png"
          alt=""
          className="app-loader-img"
          aria-hidden="true"
          draggable={false}
        />
      </div>

      <div className="login-card-title-wrap app-loader-copy">
        <p className="login-card-kicker app-loader-kicker">Please wait</p>
        <h1 className="login-card-title">{title}</h1>
        <p className="login-card-copy">{message}</p>
      </div>

      <div className="app-loader-progress" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
    </div>
  </AuthPageLayout>
)
