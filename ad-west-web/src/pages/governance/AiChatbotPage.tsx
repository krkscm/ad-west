import React, { useMemo, useState } from 'react'
import { useToast } from '../../components/common/Toast'
import { backendApi } from '../../utils/backendApi'

type ChatMessage = {
  id: string
  role: 'user' | 'assistant'
  text: string
  meta?: string
}

const toUiError = (error: unknown, fallback: string): string => {
  if (!(error instanceof Error)) return fallback
  const match = error.message.match(/^API error \(\d+\):\s*(.*)$/i)
  if (match?.[1]) return match[1]
  return error.message || fallback
}

export const AiChatbotPage: React.FC = () => {
  const { addToast } = useToast()
  const [prompt, setPrompt] = useState('Give me insights for contacts, attendance, and reporting trends across Sreni and Sthan for last 30 days.')
  const [contextText, setContextText] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])

  const placeholderExamples = useMemo(() => [
    'Which Sreni units have low reporting activity this month?',
    'Summarize attendance insights by zone and recommend actions.',
    'List top governance risks from available insights data.',
  ], [])

  const handleSend = async () => {
    const message = prompt.trim()
    if (!message) {
      addToast('Enter a prompt for the AI assistant.', 'warning')
      return
    }

    const userMessage: ChatMessage = {
      id: `${Date.now()}-user`,
      role: 'user',
      text: message,
    }

    setMessages((prev) => [...prev, userMessage])
    setIsSubmitting(true)

    try {
      const response = await backendApi.chatWithAi({
        message,
        context: contextText.trim() || undefined,
      })

      const assistantMessage: ChatMessage = {
        id: `${Date.now()}-assistant`,
        role: 'assistant',
        text: response.answer,
        meta: `${response.provider} • ${response.model}`,
      }
      setMessages((prev) => [...prev, assistantMessage])
      setPrompt('')
    } catch (error) {
      addToast(toUiError(error, 'AI assistant is unavailable right now.'), 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="animate-slide-up" style={{ display: 'grid', gap: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
        <div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>AI Chatbot</h2>
        <p style={{ marginTop: '6px', fontSize: '0.88rem', color: 'var(--text-secondary-dark)' }}>
          Ask governance questions and get AI-generated insight summaries. Access is controlled through menu grants.
        </p>
        </div>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => setMessages([])}
          disabled={isSubmitting || messages.length === 0}
          style={{ fontSize: '0.84rem' }}
        >
          Clear Chat
        </button>
      </div>

      <div className="glass-panel" style={{ padding: '20px 24px', borderLeft: '3px solid var(--primary)', animation: 'slideUp 0.22s ease' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 14px' }}>Ask Governance AI</h3>
        <div style={{ display: 'grid', gap: '14px' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--text-secondary-dark)' }}>Prompt</label>
            <textarea
              className="form-input"
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              rows={3}
              placeholder={placeholderExamples[0]}
              style={{ resize: 'vertical', fontSize: '0.875rem' }}
            />
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--text-secondary-dark)' }}>Optional Context</label>
            <textarea
              className="form-input"
              value={contextText}
              onChange={(event) => setContextText(event.target.value)}
              rows={4}
              placeholder="Paste metrics snapshot or key notes to improve AI response quality."
              style={{ resize: 'vertical', fontSize: '0.875rem' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => void handleSend()}
              disabled={isSubmitting}
              style={{ fontSize: '0.875rem' }}
            >
              {isSubmitting ? 'Thinking…' : 'Ask AI'}
            </button>
          </div>
        </div>
      </div>

      <div className="glass-panel" style={{ padding: '20px 24px', display: 'grid', gap: '10px', minHeight: '260px' }}>
        <div style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary-dark)' }}>Conversation</div>

        {messages.length === 0 ? (
          <div style={{ fontSize: '0.84rem', color: 'var(--text-secondary-dark)' }}>
            Try asking:
            <div style={{ marginTop: '8px', display: 'grid', gap: '5px' }}>
              {placeholderExamples.map((example) => (
                <button
                  key={example}
                  type="button"
                  className="btn btn-secondary"
                  style={{ justifyContent: 'flex-start' }}
                  onClick={() => setPrompt(example)}
                  disabled={isSubmitting}
                >
                  {example}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '10px' }}>
            {messages.map((message) => (
              <div
                key={message.id}
                style={{
                  border: '1px solid var(--border-dark)',
                  borderRadius: '8px',
                  padding: '12px 14px',
                  background: message.role === 'assistant' ? 'var(--panel-soft-bg)' : 'rgba(59,130,246,0.08)',
                }}
              >
                <div style={{ fontSize: '0.72rem', fontWeight: 700, marginBottom: '6px', color: 'var(--text-secondary-dark)' }}>
                  {message.role === 'assistant' ? 'AI Assistant' : 'You'}
                  {message.meta ? ` • ${message.meta}` : ''}
                </div>
                <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.45, fontSize: '0.86rem' }}>{message.text}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
