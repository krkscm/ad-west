import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { backendApi, SreniReportApi, SreniReportParameterApi } from '../utils/backendApi';
import { useToast } from '../components/common/Toast';
import { PageHeader } from '../components/common/PageHeader';
import { EXPORT_FORMATS, ExportMenu, formatExportSections } from '../components/common/ExportMenu';
import { TableRowActionsMenu } from '../components/common/TableRowActionsMenu';
import { formatLabels } from '../utils/tableExport';
import { useAuth } from '../context/auth-context';
import { useEnumOptions } from '../hooks/useEnumOptions';
import { exportSreniReports } from '../utils/reportExport';
import type { ExportFormat } from '../utils/tableExport';

interface Props {
  sreniId: string;
  sreniName: string;
}

type SubmissionType = string;

const TYPE_ICONS: Record<string, string> = {
  monthly: '📅',
  half_yearly: '📆',
  yearly: '🗓️',
};

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

function periodLabel(type: SubmissionType, year: number, value: number): string {
  if (type === 'monthly') return `${MONTHS[value - 1]} ${year}`;
  if (type === 'half_yearly') return `H${value} ${year}`;
  return String(year);
}

export const SreniReportsPage: React.FC<Props> = ({ sreniId, sreniName }) => {
  const { adminUser } = useAuth();
  const { addToast } = useToast();
  const { options: submissionTypeOptions, labelByValue: submissionTypeLabel } = useEnumOptions('report_submission_type');

  const isZoneOrSuper = useMemo(() => {
    const scopes = adminUser?.roles?.map((r) => r.scopeType) ?? [];
    return scopes.includes('global') || scopes.includes('zone');
  }, [adminUser]);

  const [allParams, setAllParams] = useState<SreniReportParameterApi[]>([]);
  const [allReports, setAllReports] = useState<SreniReportApi[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [activeType, setActiveType] = useState<SubmissionType>('monthly');

  const now = new Date();
  const [formYear, setFormYear] = useState(now.getFullYear());
  const [formValue, setFormValue] = useState(now.getMonth() + 1);
  const [formEntries, setFormEntries] = useState<Record<string, string>>({});
  const [formNotes, setFormNotes] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const [params, reports] = await Promise.all([
        backendApi.listSreniReportParameters(sreniId),
        backendApi.listSreniReports(sreniId),
      ]);
      setAllParams(params.filter((p) => p.active));
      setAllReports(reports);
    } catch {
      addToast('Failed to load reports.', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [sreniId, addToast]);

  useEffect(() => { void load(); }, [load]);

  const typeParams = useMemo(() => allParams.filter((p) => p.submissionType === activeType), [allParams, activeType]);
  const typeReports = useMemo(() => allReports.filter((r) => r.submissionType === activeType), [allReports, activeType]);

  const enabledTypes = useMemo<SubmissionType[]>(() => {
    const seen = new Set(allParams.map((p) => p.submissionType as string));
    return submissionTypeOptions.map((o) => o.value).filter((t) => seen.has(t));
  }, [allParams, submissionTypeOptions]);

  const existingReport = useMemo(
    () => typeReports.find((r) => r.periodYear === formYear && r.periodValue === formValue),
    [typeReports, formYear, formValue],
  );

  const openForm = (year: number, value: number, existing?: SreniReportApi) => {
    setFormYear(year);
    setFormValue(value);
    setFormEntries(existing?.entries ?? {});
    setFormNotes(existing?.notes ?? '');
    setIsFormOpen(true);
  };

  const resetPeriodForType = (type: SubmissionType) => {
    if (type === 'monthly') setFormValue(now.getMonth() + 1);
    else if (type === 'half_yearly') setFormValue(now.getMonth() < 6 ? 1 : 2);
    else setFormValue(1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    for (const p of typeParams) {
      if (p.isRequired && !formEntries[p.id]?.trim()) {
        addToast(`"${p.name}" is required.`, 'warning');
        return;
      }
    }
    setSubmitting(true);
    try {
      await backendApi.upsertSreniReport(sreniId, {
        submissionType: activeType as SreniReportApi['submissionType'],
        periodYear: formYear,
        periodValue: formValue,
        entries: formEntries,
        notes: formNotes.trim() || undefined,
      });
      addToast(`Report for ${periodLabel(activeType, formYear, formValue)} submitted and routed for approval.`, 'success');
      setIsFormOpen(false);
      void load();
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to submit report.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const yearOptions = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i);

  const periodOptions: Array<{ value: number; label: string }> = useMemo(() => {
    if (activeType === 'monthly') return MONTHS.map((m, i) => ({ value: i + 1, label: m }));
    if (activeType === 'half_yearly') return [{ value: 1, label: 'H1 (Jan–Jun)' }, { value: 2, label: 'H2 (Jul–Dec)' }];
    return [{ value: 1, label: 'Full Year' }];
  }, [activeType]);

  const reportExportSections = formatExportSections([
    {
      title: periodLabel(activeType, formYear, formValue),
      disabled: !typeReports.some((report) => report.periodYear === formYear && report.periodValue === formValue),
      onExport: (format) => exportSreniReports(
        typeReports.filter((report) => report.periodYear === formYear && report.periodValue === formValue),
        typeParams,
        {
          entityName: sreniName,
          submissionType: activeType,
          submissionTypeLabel: submissionTypeLabel(activeType),
          scope: 'single',
          periodLabel: periodLabel(activeType, formYear, formValue),
        },
        format,
      ),
    },
    {
      title: `All ${submissionTypeLabel(activeType)} Reports`,
      disabled: typeReports.length === 0,
      onExport: (format) => exportSreniReports(typeReports, typeParams, {
        entityName: sreniName,
        submissionType: activeType,
        submissionTypeLabel: submissionTypeLabel(activeType),
        scope: 'all',
      }, format),
    },
  ]);

  const exportSingleReport = (report: SreniReportApi, format: ExportFormat) => {
    exportSreniReports([report], typeParams, {
      entityName: sreniName,
      submissionType: activeType,
      submissionTypeLabel: submissionTypeLabel(activeType),
      scope: 'single',
      periodLabel: periodLabel(activeType, report.periodYear, report.periodValue),
    }, format);
  };

  return (
    <div className="animate-slide-up">
      <PageHeader
        icon="📊"
        title={`${sreniName} — Reports`}
        subtitle="Submit and review activity reports."
        stats={[
          { label: allReports.length === 1 ? 'Report submitted' : 'Reports submitted', value: allReports.length, variant: 'info' },
          ...(enabledTypes.length === 0 ? [{ label: 'No parameters configured', value: '—', variant: 'warning' as const }] : []),
        ]}
        actions={!isFormOpen && typeParams.length > 0 ? (
          <>
            <ExportMenu disabled={isLoading} sections={reportExportSections} />
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => { const def = typeReports.find((r) => r.periodYear === formYear && r.periodValue === formValue); openForm(formYear, formValue, def); }}
            >
              Submit Report
            </button>
          </>
        ) : undefined}
      />

      {/* Type tabs */}
      {enabledTypes.length > 0 && (
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
          {enabledTypes.map((type) => {
            const count = allReports.filter((r) => r.submissionType === type).length;
            const isActive = activeType === type;
            return (
              <button
                key={type}
                type="button"
                onClick={() => { setActiveType(type); setIsFormOpen(false); resetPeriodForType(type); }}
                style={{
                  padding: '8px 18px', borderRadius: '8px', fontSize: '0.875rem', fontWeight: 600,
                  border: `1px solid ${isActive ? 'var(--primary)' : 'var(--border-dark)'}`,
                  background: isActive ? 'rgba(99,102,241,0.12)' : 'transparent',
                  color: isActive ? 'var(--primary)' : 'var(--text-secondary-dark)',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
                }}
              >
                {TYPE_ICONS[type] ?? '📋'} {submissionTypeLabel(type)}
                {count > 0 && (
                  <span style={{ background: isActive ? 'var(--primary)' : 'rgba(148,163,184,0.3)', color: isActive ? '#fff' : 'var(--text-secondary-dark)', borderRadius: '999px', padding: '1px 7px', fontSize: '0.72rem', fontWeight: 700 }}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Submission form */}
      {isFormOpen && (
        <div className="glass-panel" style={{ padding: '24px', marginBottom: '24px', borderLeft: '3px solid var(--primary)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>
              {TYPE_ICONS[activeType] ?? '📋'} Submit {submissionTypeLabel(activeType)} Report — {periodLabel(activeType, formYear, formValue)}
            </h4>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setIsFormOpen(false)}>
              Cancel
            </button>
          </div>

          {/* Period selector */}
          <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label className="form-label" style={{ marginBottom: 0 }}>Year</label>
              <select className="form-input" value={formYear} onChange={(e) => { const y = parseInt(e.target.value); setFormYear(y); setFormEntries(typeReports.find((r) => r.periodYear === y && r.periodValue === formValue)?.entries ?? {}); }} style={{ width: '110px', cursor: 'pointer' }}>
                {yearOptions.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            {activeType !== 'yearly' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label className="form-label" style={{ marginBottom: 0 }}>{activeType === 'monthly' ? 'Month' : 'Period'}</label>
                <select className="form-input" value={formValue} onChange={(e) => { const v = parseInt(e.target.value); setFormValue(v); setFormEntries(typeReports.find((r) => r.periodYear === formYear && r.periodValue === v)?.entries ?? {}); }} style={{ width: '160px', cursor: 'pointer' }}>
                  {periodOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            )}
            {existingReport && (
              <div style={{ paddingBottom: '10px' }}>
                <span className="badge badge-success" style={{ padding: '4px 10px', fontSize: '0.78rem' }}>
                  Previously submitted — editing
                </span>
              </div>
            )}
          </div>

          <form onSubmit={(e) => void handleSubmit(e)}>
            <div style={{ display: 'grid', gap: '14px', marginBottom: '16px' }}>
              {typeParams.map((p) => (
                <div key={p.id}>
                  <label className="form-label">
                    {p.name}
                    {p.isRequired && <span style={{ color: 'var(--error)', marginLeft: '4px' }}>*</span>}
                    {p.unit && <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary-dark)', marginLeft: '6px' }}>({p.unit})</span>}
                  </label>
                  {p.description && <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary-dark)', marginBottom: '4px' }}>{p.description}</p>}
                  <input
                    className="form-input"
                    type={p.inputType === 'number' ? 'number' : 'text'}
                    placeholder={p.inputType === 'number' ? '0' : 'Enter value'}
                    value={formEntries[p.id] ?? ''}
                    onChange={(e) => setFormEntries((prev) => ({ ...prev, [p.id]: e.target.value }))}
                    required={p.isRequired}
                    style={{ maxWidth: p.inputType === 'number' ? '200px' : '480px' }}
                  />
                </div>
              ))}
            </div>

            {/* Notes — always present */}
            <div style={{ marginBottom: '20px' }}>
              <label className="form-label">Notes <span style={{ color: 'var(--text-secondary-dark)', fontWeight: 400 }}>(optional)</span></label>
              <textarea
                className="form-input"
                placeholder="Any additional notes for this report..."
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                rows={3}
                style={{ resize: 'vertical' }}
              />
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

      {/* Reports list */}
      {isLoading ? (
        <div className="glass-panel" style={{ padding: '40px 24px', textAlign: 'center', color: 'var(--text-secondary-dark)', fontSize: '0.9rem' }}>
          Loading reports…
        </div>
      ) : typeReports.length === 0 && !isFormOpen ? (
        <div className="glass-panel" style={{ padding: '60px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '16px' }}>📊</div>
          <h3 style={{ fontWeight: 700, marginBottom: '8px' }}>No {submissionTypeLabel(activeType).toLowerCase()} reports yet</h3>
          <p style={{ color: 'var(--text-secondary-dark)', fontSize: '0.875rem', maxWidth: '400px', margin: '0 auto 24px' }}>
            {typeParams.length === 0
              ? 'No parameters configured for this report type. Set them up in Report Config.'
              : 'Submit the first report using the button above.'}
          </p>
          {typeParams.length > 0 && (
            <button type="button" className="btn btn-primary" onClick={() => openForm(now.getFullYear(), formValue)}>
              Submit First Report
            </button>
          )}
        </div>
      ) : typeReports.length > 0 && (
        <div className="table-container" style={{ overflowX: 'auto' }}>
          <table className="custom-table">
            <thead>
              <tr>
                <th>Period</th>
                {isZoneOrSuper && <th>Submitted By</th>}
                <th style={{ whiteSpace: 'nowrap' }}>Submitted At</th>
                <th>Notes</th>
                {typeParams.slice(0, 4).map((p) => (
                  <th key={p.id} style={{ whiteSpace: 'nowrap' }}>{p.name}{p.unit ? ` (${p.unit})` : ''}</th>
                ))}
                <th style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {typeReports.map((report) => (
                <tr key={report.id}>
                  <td style={{ fontWeight: 700, whiteSpace: 'nowrap' }}>{periodLabel(activeType, report.periodYear, report.periodValue)}</td>
                  {isZoneOrSuper && <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary-dark)' }}>{report.submittedBy ?? '—'}</td>}
                  <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary-dark)', whiteSpace: 'nowrap' }}>
                    {report.submittedAt ? new Date(report.submittedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                  </td>
                  <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary-dark)', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{report.notes || '—'}</td>
                  {typeParams.slice(0, 4).map((p) => (
                    <td key={p.id} style={{ fontSize: '0.85rem' }}>{report.entries[p.id] ?? '—'}</td>
                  ))}
                  <td style={{ textAlign: 'right', verticalAlign: 'middle', width: '56px' }}>
                    <TableRowActionsMenu
                      ariaLabel={`Actions for ${periodLabel(activeType, report.periodYear, report.periodValue)}`}
                      actions={[
                        ...EXPORT_FORMATS.map((format) => ({
                          label: `Export ${formatLabels[format]}`,
                          onClick: () => exportSingleReport(report, format),
                        })),
                        { label: 'Edit', onClick: () => openForm(report.periodYear, report.periodValue, report) },
                      ]}
                    />
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
