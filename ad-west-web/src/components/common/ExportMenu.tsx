import React, { useEffect, useRef, useState } from 'react';
import type { ExportFormat } from '../../utils/tableExport';
import { formatLabels } from '../../utils/tableExport';

export const EXPORT_FORMATS: ExportFormat[] = ['csv', 'xlsx', 'pdf'];

export interface ExportMenuOption {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}

export interface ExportMenuSection {
  title: string;
  options: ExportMenuOption[];
}

interface Props {
  options?: ExportMenuOption[];
  sections?: ExportMenuSection[];
  label?: string;
  disabled?: boolean;
}

interface FlattenedOption extends ExportMenuOption {
  sectionTitle?: string;
}

export const ExportMenu: React.FC<Props> = ({
  options = [],
  sections = [],
  label = 'Export',
  disabled = false,
}) => {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const flatOptions: FlattenedOption[] = sections.length > 0
    ? sections.flatMap((section) =>
      section.options.map((option) => ({ ...option, sectionTitle: section.title })),
    )
    : options;

  const enabledOptions = flatOptions.filter((option) => !option.disabled);
  const groupedSections = sections.length > 0
    ? sections
      .map((section) => ({
        ...section,
        options: section.options.filter((option) => !option.disabled),
      }))
      .filter((section) => section.options.length > 0)
    : [];

  return (
    <div ref={rootRef} style={{ position: 'relative' }}>
      <button
        type="button"
        className="btn btn-secondary"
        style={{ fontSize: '0.84rem', padding: '7px 16px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
        disabled={disabled || enabledOptions.length === 0}
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
        {label}
      </button>

      {open && enabledOptions.length > 0 && (
        <div
          role="menu"
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            right: 0,
            minWidth: '260px',
            maxHeight: '360px',
            overflowY: 'auto',
            background: 'var(--glass-bg)',
            border: '1px solid var(--border-dark)',
            borderRadius: '10px',
            boxShadow: '0 12px 32px rgba(0,0,0,0.18)',
            padding: '6px',
            zIndex: 40,
          }}
        >
          {groupedSections.length > 0 ? groupedSections.map((section, sectionIndex) => (
            <div key={section.title}>
              {sectionIndex > 0 && (
                <div style={{ height: '1px', background: 'var(--border-dark)', margin: '6px 0' }} />
              )}
              <div style={{
                padding: '6px 12px 4px',
                fontSize: '0.72rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: 'var(--text-secondary-dark)',
              }}>
                {section.title}
              </div>
              {section.options.map((option) => (
                <button
                  key={option.label}
                  type="button"
                  role="menuitem"
                  className="btn btn-secondary"
                  style={{
                    width: '100%',
                    justifyContent: 'flex-start',
                    padding: '10px 12px',
                    fontSize: '0.84rem',
                    border: 'none',
                    background: 'transparent',
                  }}
                  onClick={() => {
                    option.onClick();
                    setOpen(false);
                  }}
                >
                  {option.label}
                </button>
              ))}
            </div>
          )) : flatOptions.filter((option) => !option.disabled).map((option) => (
            <button
              key={option.label}
              type="button"
              role="menuitem"
              className="btn btn-secondary"
              style={{
                width: '100%',
                justifyContent: 'flex-start',
                padding: '10px 12px',
                fontSize: '0.84rem',
                border: 'none',
                background: 'transparent',
              }}
              onClick={() => {
                option.onClick();
                setOpen(false);
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

interface RowExportProps {
  title: string;
  disabled?: boolean;
  onExport: (format: ExportFormat) => void;
}

export const RowExportButton: React.FC<RowExportProps> = ({ title, disabled = false, onExport }) => {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [open]);

  return (
    <div ref={rootRef} style={{ position: 'relative' }}>
      <button
        type="button"
        className="btn btn-secondary"
        style={{ padding: '6px 10px', fontSize: '0.82rem' }}
        title={title}
        disabled={disabled}
        onClick={() => setOpen((prev) => !prev)}
      >
        ⬇
      </button>
      {open && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 4px)',
          right: 0,
          minWidth: '120px',
          background: 'var(--glass-bg)',
          border: '1px solid var(--border-dark)',
          borderRadius: '8px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.16)',
          padding: '4px',
          zIndex: 30,
        }}>
          {EXPORT_FORMATS.map((format) => (
            <button
              key={format}
              type="button"
              className="btn btn-secondary"
              style={{
                width: '100%',
                justifyContent: 'flex-start',
                padding: '8px 10px',
                fontSize: '0.8rem',
                border: 'none',
                background: 'transparent',
              }}
              onClick={() => {
                onExport(format);
                setOpen(false);
              }}
            >
              {formatLabels[format]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export const formatExportSections = (
  scopes: Array<{ title: string; disabled?: boolean; onExport: (format: ExportFormat) => void }>,
): ExportMenuSection[] =>
  scopes.map((scope) => ({
    title: scope.title,
    options: EXPORT_FORMATS.map((format) => ({
      label: formatLabels[format],
      disabled: scope.disabled,
      onClick: () => scope.onExport(format),
    })),
  }));
