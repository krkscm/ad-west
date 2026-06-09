import React from 'react'

const MIN_BIRTH_YEAR = 1900

type BaseProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'placeholder'> & {
  placeholderText?: string
  wrapperStyle?: React.CSSProperties
  /** Applies max=today and a sensible minimum year for date-of-birth fields. */
  birthDate?: boolean
}

function toInputValue(value: BaseProps['value']): string {
  if (value === undefined || value === null) return ''
  return String(value)
}

/** Normalise DD-MM-YYYY or YYYY-MM-DD for native date inputs. */
export function toDateInputValue(raw: string): string {
  const value = raw.trim()
  if (!value) return ''
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value

  const ddMmYyyy = value.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/)
  if (ddMmYyyy) {
    const [, day, month, year] = ddMmYyyy
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
  }

  return ''
}

export function todayDateInputValue(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function minBirthDateInputValue(): string {
  return `${MIN_BIRTH_YEAR}-01-01`
}

export function parseStoredDate(raw: string): Date | null {
  const iso = toDateInputValue(raw)
  if (!iso) return null

  const [year, month, day] = iso.split('-').map(Number)
  const parsed = new Date(year, month - 1, day)
  if (
    parsed.getFullYear() !== year
    || parsed.getMonth() !== month - 1
    || parsed.getDate() !== day
  ) {
    return null
  }

  return parsed
}

export function validateBirthDate(raw: string, fieldLabel = 'Date of birth'): string | null {
  const trimmed = raw.trim()
  if (!trimmed) return null

  const parsed = parseStoredDate(trimmed)
  if (!parsed) return `${fieldLabel} must be a valid date.`

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  if (parsed > today) return `${fieldLabel} cannot be in the future.`
  if (parsed.getFullYear() < MIN_BIRTH_YEAR) return `${fieldLabel} must be after ${MIN_BIRTH_YEAR}.`

  return null
}

export function DateField({
  placeholderText = 'DD-MM-YYYY',
  className,
  value,
  wrapperStyle,
  birthDate,
  max,
  min,
  ...rest
}: BaseProps) {
  const displayValue = toDateInputValue(toInputValue(value))
  const resolvedMax = max ?? (birthDate ? todayDateInputValue() : undefined)
  const resolvedMin = min ?? (birthDate ? minBirthDateInputValue() : undefined)

  return (
    <div className={`date-time-field${displayValue ? ' is-filled' : ''}`} style={wrapperStyle}>
      <input
        {...rest}
        className={className ? `form-input ${className}` : 'form-input'}
        type="date"
        value={displayValue}
        max={resolvedMax}
        min={resolvedMin}
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
