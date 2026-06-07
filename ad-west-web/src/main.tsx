import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './styles/index.scss'

function isBenignExtensionRejection(reason: unknown): boolean {
  const message = reason instanceof Error ? reason.message : String(reason ?? '')
  return (
    message.includes('message channel closed before a response was received') ||
    message.includes('Extension context invalidated')
  )
}

window.addEventListener('unhandledrejection', (event) => {
  if (isBenignExtensionRejection(event.reason)) {
    event.preventDefault()
  }
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
