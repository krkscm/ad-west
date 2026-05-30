import React, { useCallback, useEffect, useState } from 'react';
import { backendApi, ReportMetricDefinitionApi, SthanReportApi } from '../utils/backendApi';
import { useToast } from '../components/common/Toast';

interface Props {
  locationId: string;
  locationName: string;
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

export const SthanReportsPage: React.FC<Props> = ({ locationId, locationName: _locationName }) => {
  const { addToast } = useToast();

  const [metrics, setMetrics] = useState<ReportMetricDefinitionApi[]>([]);
  const [reports, setReports] = useState<SthanReportApi[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const now = new Date();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formYear, setFormYear] = useState(now.getFullYear());
  const [formMonth, setFormMonth] = useState(now.getMonth() + 1);
  const [formEntries, setFormEntries] = useState<Record<string, string>>({});
  const [formNotes, setFormNotes] = useState('');

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      // Metrics are shared across ALL sthans — defined once in Report Config > Location
      const [m, r] = await Promise.all([
        backendApi.listLocationReportMetrics(),
        backendApi.listSthanReports(locationId),
      ]);
      setMetrics(m.filter((x) => x.active));
      setReports(r);
    } catch {
      addToast('Failed to load reports.', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [locationId, addToast]);

  useEffect(() => { void load(); }, [load]);

  const existingReport = reports.find((r) => r.periodYear === formYear && r.periodMonth === formMonth);

  const openForm = (year: number, month: number, existing?: SthanReportApi) => {
    setFormYear(year);
    setFormMonth(month);
    setFormEntries(existing?.entries ?? {});
    setFormNotes(existing?.notes ?? '');
    setIsFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    for (const m of metrics) {
      if (m.isRequired && !formEntries[m.id]?.trim()) {
        addToast(`"${m.name}" is required.`, 'warning');
        return;
      }
    }
    setSubmitting(true);
    try {
      await backendApi.upsertSthanReport(locationId, {
        periodYear: formYear,
        periodMonth: formMonth,
        entries: formEntries,
        notes: formNotes.trim() || undefined,
      });
      addToast(`Report for ${MONTHS[formMonth - 1]} ${formYear} submitted.`, 'success');
      setIsFormOpen(false);
      void load();
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to submit.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const yearOptions = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i);

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
        <div>
          <p style={{ color: 'var(--text-secondary-dark)', fontSize: '0.875rem', margin: 0 }}>
            Submit and review monthly activity reports for this sthan.
          </p>
          <div style={{ marginTop: '10px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <span className="badge badge-info" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 12px', border: '1px solid currentColor', background: 'transparent', fontSize: '0.8rem', fontWeight: 600 }}>
              <span style={{ fontWeight: 800 }}>{reports.length}</span> {reports.length === 1 ? 'Report' : 'Reports'}
            </span>
            <span className="badge badge-warning" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 12px', border: '1px solid currentColor', background: 'transparent', fontSize: '0.8rem', fontWeight: 600 }}>
              <span style={{ fontWeight: 800 }}>{metrics.length}</span> Metrics
            </span>
          </div>
        </div>
        {!isFormOpen && metrics.length > 0 && (
          <button type="button" className="btn btn-primary"
            style={{ fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '6px' }}
            onClick={() => openForm(formYear, formMonth, existingReport)}>
            📤 Submit Report
          </button>
        )}
      </div>

      {/* No metrics — point to settings */}
      {metrics.length === 0 && !isLoading && (
        <div className="glass-panel" style={{ padding: '40px 24px', textAlign: 'center', marginBottom: '20px' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>📏</div>
          <h3 style={{ fontWeight: 700, marginBottom: '8px' }}>No report metrics configured</h3>
          <p style={{ color: 'var(--text-secondary-dark)', fontSize: '0.875rem', maxWidth: '420px', margin: '0 auto' }}>
            Location report metrics are defined once for all sthans. Go to <strong>Settings → Report Config → Location</strong> to add metrics.
          </p>
        </div>
      )}

      {/* Submission form */}
      {isFormOpen && (
        <div className="glass-panel" style={{ padding: '24px', marginBottom: '24px', borderLeft: '3px solid var(--primary)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>📤 Submit Monthly Report</h4>
            <button type="button" className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.82rem' }} onClick={() => setIsFormOpen(false)}>Cancel</button>
          </div>

          <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label className="form-label" style={{ marginBottom: 0 }}>Year</label>
              <select className="form-input" value={formYear} onChange={(e) => setFormYear(parseInt(e.target.value))} style={{ width: '110px' }}>
                {yearOptions.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label className="form-label" style={{ marginBottom: 0 }}>Month</label>
              <select className="form-input" value={formMonth} onChange={(e) => setFormMonth(parseInt(e.target.value))} style={{ width: '150px' }}>
                {MONTHS.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
              </select>
            </div>
            {existingReport && (
              <span className="badge badge-success" style={{ padding: '4px 10px', fontSize: '0.78rem', marginBottom: '8px' }}>Editing existing report</span>
            )}
          </div>

          <form onSubmit={(e) => void handleSubmit(e)}>
            <div style={{ display: 'grid', gap: '14px', marginBottom: '16px' }}>
              {metrics.map((m) => (
                <div key={m.id}>
                  <label className="form-label">
                    {m.name}
                    {m.isRequired && <span style={{ color: 'var(--error)', marginLeft: '4px' }}>*</span>}
                    {m.unit && <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary-dark)', marginLeft: '6px' }}>({m.unit})</span>}
                  </label>
                  {m.description && <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary-dark)', marginBottom: '4px' }}>{m.description}</p>}
                  <input
                    className="form-input"
                    type={m.inputType === 'number' ? 'number' : 'text'}
                    placeholder={m.inputType === 'number' ? '0' : 'Enter value'}
                    value={formEntries[m.id] ?? ''}
                    onChange={(e) => setFormEntries((prev) => ({ ...prev, [m.id]: e.target.value }))}
                    required={m.isRequired}
                    style={{ maxWidth: m.inputType === 'number' ? '200px' : '480px' }}
                  />
                </div>
              ))}
            </div>
            <div style={{ marginBottom: '20px' }}>
              <label className="form-label">Notes <span style={{ color: 'var(--text-secondary-dark)', fontWeight: 400 }}>(optional)</span></label>
              <textarea className="form-input" value={formNotes} onChange={(e) => setFormNotes(e.target.value)} rows={3} style={{ resize: 'vertical' }} />
            </div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setIsFormOpen(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? 'Submitting…' : existingReport ? 'Update Report' : 'Submit Report'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Reports table */}
      {isLoading ? (
        <div className="glass-panel" style={{ padding: '40px 24px', textAlign: 'center', color: 'var(--text-secondary-dark)', fontSize: '0.9rem' }}>Loading…</div>
      ) : reports.length === 0 && !isFormOpen && metrics.length > 0 ? (
        <div className="glass-panel" style={{ padding: '60px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '16px' }}>📊</div>
          <h3 style={{ fontWeight: 700, marginBottom: '8px' }}>No reports yet</h3>
          <p style={{ color: 'var(--text-secondary-dark)', fontSize: '0.875rem', maxWidth: '400px', margin: '0 auto 24px' }}>
            Submit the first monthly report using the button above.
          </p>
          <button type="button" className="btn btn-primary" onClick={() => openForm(now.getFullYear(), now.getMonth() + 1)}>
            Submit First Report
          </button>
        </div>
      ) : reports.length > 0 && (
        <div className="table-container" style={{ overflowX: 'auto' }}>
          <table className="custom-table">
            <thead>
              <tr>
                <th>Period</th>
                <th>Submitted At</th>
                <th>Notes</th>
                {metrics.slice(0, 4).map((m) => (
                  <th key={m.id} style={{ whiteSpace: 'nowrap' }}>{m.name}{m.unit ? ` (${m.unit})` : ''}</th>
                ))}
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((report) => (
                <tr key={report.id}>
                  <td style={{ fontWeight: 700, whiteSpace: 'nowrap' }}>{MONTHS[report.periodMonth - 1]} {report.periodYear}</td>
                  <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary-dark)', whiteSpace: 'nowrap' }}>
                    {report.submittedAt ? new Date(report.submittedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                  </td>
                  <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary-dark)', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{report.notes || '—'}</td>
                  {metrics.slice(0, 4).map((m) => (
                    <td key={m.id} style={{ fontSize: '0.85rem' }}>{report.entries[m.id] ?? '—'}</td>
                  ))}
                  <td>
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <button type="button" className="btn btn-secondary" style={{ padding: '6px 14px', fontSize: '0.82rem' }}
                        onClick={() => openForm(report.periodYear, report.periodMonth, report)}>
                        ✏️ Edit
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
