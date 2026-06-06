import React, { useEffect, useState } from 'react';
import { SthanReportsPage } from './SthanReportsPage';
import { SthanExpensesPage } from './SthanExpensesPage';
import { SthanContactsPage } from './SthanContactsPage';
import { SthanCalendarPage } from './SthanCalendarPage';
import type { SthanSection } from '../utils/adminNavigation';

interface Props {
  locationId: string;
  locationName: string;
  activeSection?: SthanSection;
  onSectionChange?: (section: SthanSection) => void;
}

type SthanTab = SthanSection;

const TABS: Array<{ key: SthanTab; label: string; icon: string }> = [
  { key: 'calendar', label: 'Calendar', icon: '📅' },
  { key: 'reports', label: 'Reports', icon: '📊' },
  { key: 'expenses', label: 'Expenses', icon: '💰' },
  { key: 'contacts', label: 'Contacts', icon: '📋' },
];

export const SthanDetailPage: React.FC<Props> = ({
  locationId,
  locationName,
  activeSection = 'calendar',
  onSectionChange,
}) => {
  const [activeTab, setActiveTab] = useState<SthanTab>(activeSection);

  useEffect(() => {
    setActiveTab(activeSection);
  }, [activeSection, locationId]);

  const selectTab = (tab: SthanTab) => {
    setActiveTab(tab);
    onSectionChange?.(tab);
  };

  return (
    <div className="animate-slide-up">
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0 }}>
          📍 {locationName}
        </h2>
        <p style={{ color: 'var(--text-secondary-dark)', fontSize: '0.875rem', marginTop: '4px', marginBottom: 0 }}>
          Sthan management — calendar, reports, expenses, and contact list.
        </p>
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '24px', borderBottom: '1px solid var(--border-dark)', paddingBottom: '0' }}>
        {TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => selectTab(tab.key)}
              style={{
                padding: '10px 20px',
                fontSize: '0.9rem',
                fontWeight: isActive ? 700 : 500,
                border: 'none',
                borderBottom: isActive ? '2px solid var(--primary)' : '2px solid transparent',
                background: 'transparent',
                color: isActive ? 'var(--primary)' : 'var(--text-secondary-dark)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                marginBottom: '-1px',
                borderRadius: '0',
                transition: 'color 0.15s, border-color 0.15s',
              }}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      {activeTab === 'calendar' && (
        <SthanCalendarPage locationId={locationId} locationName={locationName} />
      )}
      {activeTab === 'reports' && (
        <SthanReportsPage locationId={locationId} locationName={locationName} />
      )}
      {activeTab === 'expenses' && (
        <SthanExpensesPage locationId={locationId} locationName={locationName} />
      )}
      {activeTab === 'contacts' && (
        <SthanContactsPage locationId={locationId} locationName={locationName} />
      )}
    </div>
  );
};
