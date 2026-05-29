import React from 'react'

type BaseProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'placeholder'> & {
  placeholderText?: string
  wrapperStyle?: React.CSSProperties
}

function toInputValue(value: BaseProps['value']): string {
  if (value === undefined || value === null) return ''
  return String(value)
}

export function DateField({ placeholderText = 'DD-MM-YYYY', className, value, wrapperStyle, ...rest }: BaseProps) {
  const displayValue = toInputValue(value)

  return (
    <div className={`date-time-field${displayValue ? ' is-filled' : ''}`} style={wrapperStyle}>
      <input
        {...rest}
        className={className ? `form-input ${className}` : 'form-input'}
        type="date"
        value={displayValue}
      />
      <span className="date-time-field__placeholder">{placeholderText}</span>
    </div>
  )
}

export function TimeField({ placeholderText = 'HH:MM', className, value, wrapperStyle, ...rest }: BaseProps) {
  const displayValue = toInputValue(value)

  return (
    <div className={`date-time-field${displayValue ? ' is-filled' : ''}`} style={wrapperStyle}>
      <input
        {...rest}
        className={className ? `form-input ${className}` : 'form-input'}
        type="time"
        value={displayValue}
      />
      <span className="date-time-field__placeholder">{placeholderText}</span>
    </div>
  )
}
