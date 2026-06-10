import React from 'react';
import type { LocationDefinitionApi } from '../../utils/backendApi';

type LocationLevel = LocationDefinitionApi['level'];

const LEVEL_META: Record<LocationLevel, { icon: string; label: string; badgeClass: string }> = {
  ZONE: { icon: '🏢', label: 'Zone', badgeClass: 'badge-info' },
  STHAN: { icon: '📍', label: 'Sthan', badgeClass: 'badge-warning' },
  DIVISION: { icon: '🗂️', label: 'Division', badgeClass: 'badge-success' },
};

export const LocationLevelBadge: React.FC<{ level: LocationLevel }> = ({ level }) => {
  const meta = LEVEL_META[level] ?? { icon: '📌', label: level, badgeClass: 'badge-info' };
  return (
    <span
      className={`badge ${meta.badgeClass}`}
      style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 8px', fontSize: '0.75rem', fontWeight: 600, border: '1px solid currentColor', background: 'transparent' }}
    >
      <span>{meta.icon}</span>
      <span>{meta.label}</span>
    </span>
  );
};
