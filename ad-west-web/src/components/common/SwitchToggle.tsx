
interface SwitchToggleProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label?: string
  labelOn?: string
  labelOff?: string
  disabled?: boolean
}

export function SwitchToggle({ checked, onChange, label, labelOn, labelOff, disabled }: SwitchToggleProps) {
  const displayLabel = label ?? (checked ? (labelOn ?? 'On') : (labelOff ?? 'Off'))

  return (
    <button
      type="button"
      className={`switch-toggle${checked ? ' is-on' : ''}`}
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      style={disabled ? { opacity: 0.5, cursor: 'not-allowed' } : undefined}
    >
      <span className={`switch-toggle-label${checked ? ' is-on' : ''}`}>{displayLabel}</span>
      <span className={`switch-toggle-track${checked ? ' is-on' : ''}`}>
        <span className={`switch-toggle-thumb${checked ? ' is-on' : ''}`} />
      </span>
    </button>
  )
}
