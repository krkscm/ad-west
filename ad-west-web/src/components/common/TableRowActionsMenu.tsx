import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { IconButton, MoreVerticalIcon } from './IconButton';

export interface TableRowAction {
  label: string;
  onClick: () => void;
  tone?: 'default' | 'warning' | 'danger' | 'success';
  disabled?: boolean;
}

interface Props {
  actions: TableRowAction[];
  ariaLabel?: string;
}

const toneColor: Record<NonNullable<TableRowAction['tone']>, string> = {
  default: 'var(--text-primary-dark)',
  warning: 'var(--warning)',
  danger: 'var(--error)',
  success: 'var(--success)',
};

const MENU_WIDTH = 156;
const VIEWPORT_PADDING = 12;

export const TableRowActionsMenu: React.FC<Props> = ({ actions, ariaLabel = 'Row actions' }) => {
  const [open, setOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({});
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const enabledActions = actions.filter((action) => !action.disabled);

  const updateMenuPosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();
    const width = Math.min(MENU_WIDTH, window.innerWidth - VIEWPORT_PADDING * 2);
    let left = rect.right - width;
    const maxLeft = window.innerWidth - width - VIEWPORT_PADDING;
    left = Math.max(VIEWPORT_PADDING, Math.min(left, maxLeft));

    const estimatedHeight = enabledActions.length * 36 + 8;
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUpward = spaceBelow < estimatedHeight + VIEWPORT_PADDING && rect.top > estimatedHeight;

    setMenuStyle({
      position: 'fixed',
      top: openUpward ? rect.top - estimatedHeight - 4 : rect.bottom + 4,
      left,
      width,
      zIndex: 1200,
    });
  }, [enabledActions.length]);

  useLayoutEffect(() => {
    if (!open) return;
    updateMenuPosition();
  }, [open, updateMenuPosition]);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    const onReposition = () => updateMenuPosition();

    document.addEventListener('mousedown', onPointerDown);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('resize', onReposition);
    window.addEventListener('scroll', onReposition, true);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('resize', onReposition);
      window.removeEventListener('scroll', onReposition, true);
    };
  }, [open, updateMenuPosition]);

  if (enabledActions.length === 0) {
    return null;
  }

  return (
    <>
      <IconButton
        ref={triggerRef}
        label={ariaLabel}
        title="Actions"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
      >
        <MoreVerticalIcon />
      </IconButton>

      {open && createPortal(
        <div
          ref={menuRef}
          role="menu"
          className="dropdown-menu"
          style={menuStyle}
        >
          {enabledActions.map((action) => {
            const tone = action.tone ?? 'default';
            return (
              <button
                key={action.label}
                type="button"
                role="menuitem"
                className={`dropdown-menu__item${tone === 'danger' ? ' dropdown-menu__item--danger' : ''}`}
                style={tone !== 'danger' ? { color: toneColor[tone] } : undefined}
                onClick={() => {
                  setOpen(false);
                  action.onClick();
                }}
              >
                {action.label}
              </button>
            );
          })}
        </div>,
        document.body,
      )}
    </>
  );
};
