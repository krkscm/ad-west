import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/auth-context';
import { useAdminDefinitions } from '../context/admin-definitions-context';
import { PageHeader } from '../components/common/PageHeader';
import { backendApi, LocationDefinitionApi, SreniAttendanceListingItemApi } from '../utils/backendApi';

interface Props {
  sreniId: string;
  sreniName: string;
}

const loadManualSthanAccess = (adminId?: string): string[] => {
  if (!adminId) return [];
  try {
    const stored = localStorage.getItem(`adwest-calendar-sthan-access-${adminId}`);
    if (!stored) return [];
    const parsed = JSON.parse(stored) as string[];
    return Array.isArray(parsed) ? parsed.filter((v) => typeof v === 'string' && v.length > 0) : [];
  } catch {
    return [];
  }
};

const toInputValue = (value: string | number | boolean | null | undefined): string => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  return String(value);
};

export const SreniAttendancePage: React.FC<Props> = ({ sreniId, sreniName }) => {
  const { adminUser } = useAuth();
  const { activeSthanLocations } = useAdminDefinitions();

  const hasZoneRights = useMemo(() => {
    const scopes = adminUser?.roles?.map((role) => role.scopeType) ?? [];
    return scopes.includes('global') || scopes.includes('zone');
  }, [adminUser]);

  const [rows, setRows] = useState<SreniAttendanceListingItemApi[]>([]);
  const [sthanLocations, setSthanLocations] = useState<LocationDefinitionApi[]>([]);
  const [accessibleSthanIds, setAccessibleSthanIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const sthans = activeSthanLocations;
      const manualSthanIds = loadManualSthanAccess(adminUser?.sub);
      const allowedSthanIds = hasZoneRights ? sthans.map((loc) => loc.id) : manualSthanIds;

      setSthanLocations(sthans);
      setAccessibleSthanIds(allowedSthanIds);

      const listing = await backendApi.listSreniAttendanceListing(sreniId, allowedSthanIds);
      setRows(listing);
    } catch {
      setRows([]);
      setSthanLocations([]);
      setAccessibleSthanIds([]);
    } finally {
      setIsLoading(false);
    }
  }, [adminUser?.sub, hasZoneRights, sreniId, activeSthanLocations]);

  useEffect(() => {
    void load();
  }, [load]);

  const sthanById = useMemo(() => {
    const map = new Map<string, string>();
    sthanLocations.forEach((loc) => map.set(loc.id, loc.name));
    return map;
  }, [sthanLocations]);

  const handleValueChange = (
    eventId: string,
    metricId: string,
    key: string,
    value: string,
  ) => {
    setRows((prev) => prev.map((item) => {
      if (item.event.id !== eventId) return item;
      return {
        ...item,
        metrics: item.metrics.map((metricItem) => {
          if (metricItem.metric.id !== metricId) return metricItem;
          const nextValues = { ...(metricItem.capture?.values ?? {}) };
          nextValues[key] = value === '' ? null : value;
          return {
            ...metricItem,
            capture: {
              id: metricItem.capture?.id ?? `${eventId}:${metricId}`,
              sreniId,
              eventId,
              metricId,
              values: nextValues,
              capturedBy: metricItem.capture?.capturedBy ?? '',
              capturedAt: metricItem.capture?.capturedAt ?? '',
              updatedAt: metricItem.capture?.updatedAt ?? '',
            },
          };
        }),
      };
    }));
  };

  const saveCapture = async (eventId: string, metricId: string, values: Record<string, string | number | boolean | null>) => {
    const key = `${eventId}:${metricId}`;
    setSavingKey(key);
    try {
      const saved = await backendApi.upsertEventAttendanceCapture(sreniId, eventId, { metricId, values });
      setRows((prev) => prev.map((item) => {
        if (item.event.id !== eventId) return item;
        return {
          ...item,
          metrics: item.metrics.map((metricItem) => (
            metricItem.metric.id === metricId ? { ...metricItem, capture: saved } : metricItem
          )),
        };
      }));
    } finally {
      setSavingKey(null);
    }
  };

  return (
    <div className="animate-slide-up">
      <PageHeader
        icon="✅"
        title={`${sreniName} — Attendance`}
        subtitle="Fill attendance values from calendar events using the configurable metric keys."
        stats={!hasZoneRights && accessibleSthanIds.length === 0 ? [{ label: 'sthan access empty', value: '⚠', variant: 'warning' }] : undefined}
      />

      {isLoading ? (
        <div className="glass-panel" style={{ padding: '40px 24px', textAlign: 'center', color: 'var(--text-secondary-dark)', fontSize: '0.9rem' }}>
          Loading attendance listing…
        </div>
      ) : rows.length === 0 ? (
        <div className="glass-panel" style={{ padding: '60px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '16px' }}>📅</div>
          <h3 style={{ fontWeight: 700, marginBottom: '8px' }}>No attendance data</h3>
          <p style={{ color: 'var(--text-secondary-dark)', fontSize: '0.875rem', maxWidth: '420px', margin: '0 auto' }}>
            No visible calendar events with active attendance metrics found for this Sreni.
            Add events in the Calendar tab and configure metrics in Settings → Attendance Metrics.
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '16px' }}>
          {rows.map((row) => (
            <div key={row.event.id} className="glass-panel" style={{ padding: '20px 24px' }}>
              {/* Event header */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', marginBottom: '18px', flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '1rem' }}>{row.event.title}</div>
                  <div style={{ color: 'var(--text-secondary-dark)', fontSize: '0.85rem', marginTop: '3px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    <span>📅 {row.event.date}</span>
                    <span>·</span>
                    <span>🕐 {row.event.startTime}–{row.event.endTime}</span>
                    {row.event.scope === 'zone' && (
                      <span className="badge badge-info" style={{ padding: '1px 8px', fontSize: '0.75rem' }}>Zone</span>
                    )}
                    {row.event.scope === 'sthan' && row.event.sthanIds.length > 0 && (
                      <span style={{ color: 'var(--text-secondary-dark)' }}>
                        · {row.event.sthanIds.map((id) => sthanById.get(id) ?? id).join(', ')}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {row.metrics.length === 0 ? (
                <div style={{ color: 'var(--text-secondary-dark)', fontSize: '0.875rem', padding: '12px 0' }}>
                  No active attendance metrics configured for this event.
                </div>
              ) : (
                <div style={{ display: 'grid', gap: '12px' }}>
                  {row.metrics.map((metricItem) => {
                    const metric = metricItem.metric;
                    const values = metricItem.capture?.values ?? {};
                    const rowKey = `${row.event.id}:${metric.id}`;
                    return (
                      <div key={metric.id} className="glass-panel" style={{ padding: '16px 18px', borderLeft: '3px solid var(--primary)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap' }}>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{metric.name}</div>
                            {metric.description && (
                              <div style={{ color: 'var(--text-secondary-dark)', fontSize: '0.8rem', marginTop: '2px' }}>{metric.description}</div>
                            )}
                          </div>
                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            style={{ flexShrink: 0 }}
                            onClick={() => void saveCapture(row.event.id, metric.id, values)}
                            disabled={savingKey === rowKey}
                          >
                            {savingKey === rowKey ? 'Updating…' : 'Update'}
                          </button>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px' }}>
                          {metric.keys.map((key) => (
                            <div key={key}>
                              <label className="form-label">{key}</label>
                              <input
                                className="form-input"
                                value={toInputValue(values[key])}
                                onChange={(event) => handleValueChange(row.event.id, metric.id, key, event.target.value)}
                                placeholder={`Enter ${key}`}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
