interface SwitchToggleProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label?: string
  labelOn?: string
  labelOff?: string
  disabled?: boolean
  /** Full-width form control (default) or compact track-only for lists/toolbars */
  variant?: 'field' | 'inline'
  ariaLabel?: string
  className?: string
}

export function SwitchToggle({
  checked,
  onChange,
  label,
  labelOn,
  labelOff,
  disabled,
  variant = 'field',
  ariaLabel,
  className,
}: SwitchToggleProps) {
  const displayLabel = label ?? (checked ? (labelOn ?? 'On') : (labelOff ?? 'Off'))
  const showLabel = variant === 'field' || Boolean(label)

  return (
    <button
      type="button"
      className={[
        'switch-toggle',
        checked ? 'is-on' : '',
        variant === 'inline' ? 'switch-toggle--inline' : '',
        className ?? '',
      ].filter(Boolean).join(' ')}
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      aria-pressed={checked}
      aria-label={ariaLabel ?? (variant === 'inline' && !label ? displayLabel : undefined)}
      style={disabled ? { opacity: 0.5, cursor: 'not-allowed' } : undefined}
    >
      {showLabel && (
        <span className={`switch-toggle-label${checked ? ' is-on' : ''}`}>{displayLabel}</span>
      )}
      <span className={`switch-toggle-track${checked ? ' is-on' : ''}`}>
        <span className={`switch-toggle-thumb${checked ? ' is-on' : ''}`} />
      </span>
    </button>
  )
}
