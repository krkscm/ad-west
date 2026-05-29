import React from 'react'

interface DateTimePickerProps {
  value: string          // "YYYY-MM-DDTHH:mm" or ISO string
  onChange: (value: string) => void
  required?: boolean
  minDate?: string       // "YYYY-MM-DD"
  label?: string
}

function splitValue(value: string): { date: string; time: string } {
  if (!value) return { date: '', time: '' }
  const [date, timePart = ''] = value.slice(0, 16).split('T')
  const time = timePart.slice(0, 5)
  return { date, time }
}

function combine(date: string, time: string): string {
  if (!date) return ''
  return time ? `${date}T${time}` : `${date}T00:00`
}

export function DateTimePicker({ value, onChange, required, minDate, label }: DateTimePickerProps) {
  const { date, time } = splitValue(value)

  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: '0.82rem', fontWeight: 600,
    color: 'var(--text-secondary-dark)', marginBottom: '4px',
  }

  return (
    <div>
      {label && <label style={labelStyle}>{label}{required && <span style={{ color: 'var(--error)' }}> *</span>}</label>}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '8px', alignItems: 'stretch' }}>
        <input
          className="form-input"
          type="date"
          value={date}
          min={minDate}
          required={required}
          onChange={(e) => onChange(combine(e.target.value, time))}
        />
        <input
          className="form-input"
          type="time"
          value={time}
          style={{ width: '120px' }}
          onChange={(e) => onChange(combine(date, e.target.value))}
        />
      </div>
    </div>
  )
}

interface DateRangePickerProps {
  startValue: string
  endValue: string
  onStartChange: (value: string) => void
  onEndChange: (value: string) => void
  startLabel?: string
  endLabel?: string
  startRequired?: boolean
}

export function DateRangePicker({ startValue, endValue, onStartChange, onEndChange, startLabel = 'Start Date & Time', endLabel = 'End Date & Time', startRequired }: DateRangePickerProps) {
  const startDate = splitValue(startValue).date

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
      <DateTimePicker
        value={startValue}
        onChange={onStartChange}
        label={startLabel}
        required={startRequired}
      />
      <DateTimePicker
        value={endValue}
        onChange={onEndChange}
        label={endLabel}
        minDate={startDate || undefined}
      />
    </div>
  )
}
