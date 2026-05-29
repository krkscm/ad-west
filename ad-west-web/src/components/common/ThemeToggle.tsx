import React from 'react';
import { useTheme } from '../../context/ThemeContext';

interface ThemeToggleProps {
  iconOnly?: boolean;
  placement?: 'floating' | 'header';
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({
  iconOnly = false,
  placement = 'floating',
}) => {
  const { theme, toggleTheme } = useTheme();
  const label = `${theme === 'dark' ? 'Dark' : 'Light'} mode`;

  return (
    <button
      type="button"
      className={`theme-toggle theme-toggle-${placement}${iconOnly ? ' theme-toggle-icon-only' : ''}`}
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      onClick={toggleTheme}
    >
      {!iconOnly && <span>{label}</span>}
      <strong>{theme === 'dark' ? '☀️' : '🌙'}</strong>
    </button>
  );
};
