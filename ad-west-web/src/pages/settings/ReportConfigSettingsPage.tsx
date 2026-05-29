import React, { useEffect, useState } from 'react';
import { backendApi, SreniDefinitionApi } from '../../utils/backendApi';
import { SreniReportConfigPage } from '../SreniReportConfigPage';

export const ReportConfigSettingsPage: React.FC = () => {
  const [srenies, setSrenies] = useState<SreniDefinitionApi[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    backendApi.listSreniDefinitions()
      .then(list => {
        const active = list.filter(s => s.active);
        setSrenies(active);
        if (active.length > 0) setSelectedId(active[0].id);
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  const selected = srenies.find(s => s.id === selectedId);

  return (
    <div className="animate-slide-up">
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0 }}>📊 Report Config</h2>
        <p style={{ color: 'var(--text-secondary-dark)', fontSize: '0.875rem', marginTop: '4px', marginBottom: 0 }}>
          Define report parameters per Sreni and submission type. These fields appear when a Sreni member submits a report.
        </p>
      </div>

      {/* Sreni selector */}
      <div className="glass-panel" style={{ padding: '16px 20px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
        <label style={{ fontWeight: 600, fontSize: '0.9rem', whiteSpace: 'nowrap' }}>Select Sreni:</label>
        {isLoading ? (
          <span style={{ color: 'var(--text-secondary-dark)', fontSize: '0.875rem' }}>Loading…</span>
        ) : srenies.length === 0 ? (
          <span style={{ color: 'var(--text-secondary-dark)', fontSize: '0.875rem' }}>No active srenies found.</span>
        ) : (
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {srenies.map(s => (
              <button
                key={s.id}
                type="button"
                onClick={() => setSelectedId(s.id)}
                style={{
                  padding: '7px 16px', borderRadius: '8px', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer',
                  border: `1px solid ${selectedId === s.id ? 'var(--primary)' : 'var(--border-dark)'}`,
                  background: selectedId === s.id ? 'rgba(99,102,241,0.12)' : 'transparent',
                  color: selectedId === s.id ? 'var(--primary)' : 'var(--text-secondary-dark)',
                }}
              >
                🏘️ {s.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {selected && (
        <SreniReportConfigPage sreniId={selected.id} sreniName={selected.name} />
      )}
    </div>
  );
};
