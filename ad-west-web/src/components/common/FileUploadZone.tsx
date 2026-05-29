import React, { useRef, useState } from 'react'

interface FileUploadZoneProps {
  accept?: string
  maxBytes?: number
  allowedExtensions?: string[]
  hint?: string
  file: File | null
  error?: string
  onChange: (file: File | null, error?: string) => void
}

const UploadIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="16 16 12 12 8 16" />
    <line x1="12" y1="12" x2="12" y2="21" />
    <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
  </svg>
)

const FileIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
  </svg>
)

export function FileUploadZone({ accept, maxBytes, allowedExtensions, hint, file, error, onChange }: FileUploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  const validate = (f: File): string | null => {
    if (allowedExtensions) {
      const ext = f.name.toLowerCase().match(/\.[^.]+$/)?.[0] ?? ''
      if (!allowedExtensions.includes(ext)) {
        return `Allowed types: ${allowedExtensions.join(', ')}`
      }
    }
    if (maxBytes && f.size > maxBytes) {
      return `File must not exceed ${Math.round(maxBytes / 1024)} KB`
    }
    return null
  }

  const handle = (f: File | null) => {
    if (!f) { onChange(null); return }
    const err = validate(f)
    onChange(err ? null : f, err ?? undefined)
    if (err && inputRef.current) inputRef.current.value = ''
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) handle(f)
  }

  const borderColor = dragging
    ? 'var(--primary)'
    : error
    ? 'var(--error)'
    : file
    ? 'var(--success, #10b981)'
    : 'var(--border-dark)'

  const bgColor = dragging
    ? 'rgba(99,102,241,0.07)'
    : file
    ? 'rgba(16,185,129,0.05)'
    : 'transparent'

  return (
    <div>
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        style={{
          border: `2px dashed ${borderColor}`,
          borderRadius: '10px',
          background: bgColor,
          padding: '20px 16px',
          cursor: 'pointer',
          transition: 'border-color 0.15s, background 0.15s',
          textAlign: 'center',
          userSelect: 'none',
        }}
      >
        {file ? (
          /* ── Selected state ── */
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', justifyContent: 'center' }}>
            <span style={{ color: 'var(--success, #10b981)', flexShrink: 0 }}><FileIcon /></span>
            <div style={{ textAlign: 'left', minWidth: 0 }}>
              <p style={{ margin: 0, fontWeight: 600, fontSize: '0.88rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '260px' }}>
                {file.name}
              </p>
              <p style={{ margin: '2px 0 0', fontSize: '0.76rem', color: 'var(--text-secondary-dark)' }}>
                {Math.max(1, Math.round(file.size / 1024))} KB
              </p>
            </div>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onChange(null); if (inputRef.current) inputRef.current.value = '' }}
              style={{
                marginLeft: 'auto', flexShrink: 0,
                background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)',
                borderRadius: '6px', padding: '4px 10px',
                fontSize: '0.76rem', fontWeight: 600, color: 'var(--error)',
                cursor: 'pointer', lineHeight: 1.4,
              }}
            >
              Remove
            </button>
          </div>
        ) : (
          /* ── Empty state ── */
          <div>
            <div style={{ color: dragging ? 'var(--primary)' : 'var(--text-secondary-dark)', marginBottom: '8px', display: 'flex', justifyContent: 'center' }}>
              <UploadIcon />
            </div>
            <p style={{ margin: '0 0 4px', fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary-dark)' }}>
              {dragging ? 'Drop file here' : 'Drag & drop or click to browse'}
            </p>
            {hint && (
              <p style={{ margin: 0, fontSize: '0.76rem', color: 'var(--text-secondary-dark)' }}>{hint}</p>
            )}
          </div>
        )}
      </div>

      {error && (
        <p style={{ margin: '6px 0 0', fontSize: '0.78rem', color: 'var(--error)', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          {error}
        </p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        style={{ display: 'none' }}
        onChange={(e) => handle(e.target.files?.[0] ?? null)}
      />
    </div>
  )
}
