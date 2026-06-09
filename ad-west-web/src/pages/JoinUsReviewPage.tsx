import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Modal } from '../components/common/Modal';
import { PageHeader } from '../components/common/PageHeader';
import { PaginationBar } from '../components/common/PaginationBar';
import { useToast } from '../components/common/Toast';
import { useAdminDefinitions } from '../context/admin-definitions-context';
import { useEnumOptions } from '../hooks/useEnumOptions';
import { backendApi, JoinUsSubmissionApi, SreniDivisionApi } from '../utils/backendApi';

const PAGE_SIZE_OPTIONS = [10, 20, 50];

const toUiError = (error: unknown, fallback: string): string => {
  if (!(error instanceof Error)) return fallback;
  const match = error.message.match(/^API error \(\d+\):\s*(.*)$/i);
  return match?.[1] ?? error.message ?? fallback;
};

const formatSubmitted = (iso: string) => {
  try {
    return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
  } catch {
    return iso;
  }
};

export const JoinUsReviewPage: React.FC = () => {
  const { addToast } = useToast();
  const {
    sreniDefinitions,
    locationDefinitions,
    ensureSthansLoaded,
  } = useAdminDefinitions();

  const [items, setItems] = useState<JoinUsSubmissionApi[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [pendingCount, setPendingCount] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [status, setStatus] = useState<'pending' | 'completed' | 'all'>('pending');
  const [sreniFilter, setSreniFilter] = useState('');
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const [reviewTarget, setReviewTarget] = useState<JoinUsSubmissionApi | null>(null);
  const [zoneId, setZoneId] = useState('');
  const [sthanId, setSthanId] = useState('');
  const [divisionId, setDivisionId] = useState('');
  const [reviewNote, setReviewNote] = useState('');
  const [currentStatus, setCurrentStatus] = useState('');
  const [divisions, setDivisions] = useState<SreniDivisionApi[]>([]);
  const { options: currentStatusOptions } = useEnumOptions('contact_current_status');
  const [isSaving, setIsSaving] = useState(false);

  const zones = useMemo(
    () => locationDefinitions.filter((l) => l.level === 'ZONE' && l.active),
    [locationDefinitions],
  );

  const sthansInZone = useMemo(() => {
    if (!zoneId) return locationDefinitions.filter((l) => l.level === 'STHAN' && l.active);
    return locationDefinitions.filter((l) => l.level === 'STHAN' && l.active && l.parentId === zoneId);
  }, [locationDefinitions, zoneId]);

  const load = useCallback((p: number, ps: number) => {
    setIsLoading(true);
    backendApi.listJoinUsSubmissions({
      page: p,
      pageSize: ps,
      status,
      sreniId: sreniFilter || undefined,
      search: search || undefined,
    })
      .then((res) => {
        setItems(res.items);
        setTotal(res.total);
        setTotalPages(res.totalPages);
        setPendingCount(res.pendingCount);
      })
      .catch((err) => addToast(toUiError(err, 'Failed to load Join Us submissions.'), 'error'))
      .finally(() => setIsLoading(false));
  }, [status, sreniFilter, search, addToast]);

  useEffect(() => {
    load(page, pageSize);
  }, [page, pageSize, load]);

  useEffect(() => {
    setPage(1);
  }, [status, sreniFilter, search]);

  const openReview = (row: JoinUsSubmissionApi) => {
    ensureSthansLoaded();
    setReviewTarget(row);
    setZoneId('');
    setSthanId('');
    setDivisionId('');
    setReviewNote('');
    setCurrentStatus('');
    backendApi.listSreniDivisions(row.interestedSreniId)
      .then(setDivisions)
      .catch(() => setDivisions([]));
  };

  const handleCompleteReview = async () => {
    if (!reviewTarget) return;
    if (!sthanId) {
      addToast('Please select a Sthan.', 'warning');
      return;
    }
    setIsSaving(true);
    try {
      await backendApi.completeJoinUsReview(reviewTarget.id, {
        sreniId: reviewTarget.interestedSreniId,
        sthanId,
        zoneId: zoneId || undefined,
        divisionId: divisionId || null,
        reviewNote: reviewNote.trim() || undefined,
        currentStatus: currentStatus.trim() || undefined,
      });
      addToast(`${reviewTarget.name} reviewed and assigned.`, 'success');
      setReviewTarget(null);
      load(page, pageSize);
    } catch (err) {
      addToast(toUiError(err, 'Failed to complete review.'), 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="animate-slide-up">
      <PageHeader
        icon="📝"
        title="Join Us Review"
        subtitle="Review public registrations, assign zone, sthan, and membership status, then mark complete."
        stats={[
          { label: 'pending', value: pendingCount, variant: pendingCount > 0 ? 'warning' : 'info' },
          { label: status === 'all' ? 'shown' : status, value: total },
        ]}
      />

      <div className="glass-panel list-toolbar" style={{ marginBottom: '16px' }}>
        <div className="list-toolbar__search">
          <span className="list-toolbar__search-icon" aria-hidden="true">🔍</span>
          <input
            className="form-input"
            placeholder="Search name or mobile…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="list-toolbar__meta" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
          {(['pending', 'completed', 'all'] as const).map((s) => (
            <button
              key={s}
              type="button"
              className={`page-size-pill${status === s ? ' is-active' : ''}`}
              onClick={() => setStatus(s)}
            >
              {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
          <select
            className="form-input"
            style={{ width: 'auto', minWidth: '160px', fontSize: '0.82rem' }}
            value={sreniFilter}
            onChange={(e) => setSreniFilter(e.target.value)}
          >
            <option value="">All srenies</option>
            {sreniDefinitions.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
      </div>

      {isLoading && items.length === 0 ? (
        <div className="glass-panel loading-state">Loading submissions…</div>
      ) : items.length === 0 ? (
        <div className="glass-panel" style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--text-secondary-dark)' }}>
          {status === 'pending' ? 'No pending Join Us submissions.' : 'No submissions match your filters.'}
        </div>
      ) : (
        <>
          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Mobile</th>
                  <th>Interested Sreni</th>
                  <th>Type</th>
                  <th>Submitted</th>
                  <th>Status</th>
                  <th style={{ width: '100px' }} />
                </tr>
              </thead>
              <tbody>
                {items.map((row) => (
                  <tr key={row.id}>
                    <td style={{ fontWeight: 600 }}>{row.name}</td>
                    <td>{row.mobileNo ?? '—'}</td>
                    <td>{row.interestedSreniName}</td>
                    <td>{row.familyOrBachelor ?? '—'}</td>
                    <td style={{ fontSize: '0.82rem', color: 'var(--text-secondary-dark)' }}>{formatSubmitted(row.submittedAt)}</td>
                    <td>
                      <span style={{
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: '5px',
                        background: row.reviewStatus === 'pending' ? 'rgba(249,115,22,0.12)' : 'rgba(16,185,129,0.12)',
                        color: row.reviewStatus === 'pending' ? '#fb923c' : '#34d399',
                      }}>
                        {row.reviewStatus}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {row.reviewStatus === 'pending' ? (
                        <button type="button" className="btn btn-primary btn-sm" onClick={() => openReview(row)}>
                          Review
                        </button>
                      ) : (
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary-dark)' }}>Done</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <PaginationBar
            page={page}
            totalPages={totalPages}
            totalItems={total}
            pageSize={pageSize}
            pageSizeOptions={PAGE_SIZE_OPTIONS}
            onPageChange={setPage}
            onPageSizeChange={(ps) => { setPageSize(ps); setPage(1); }}
          />
        </>
      )}

      <Modal
        isOpen={reviewTarget !== null}
        onClose={() => setReviewTarget(null)}
        title={reviewTarget ? `Review — ${reviewTarget.name}` : 'Review'}
        maxWidth="560px"
      >
        {reviewTarget && (
          <div style={{ display: 'grid', gap: '16px' }}>
            <div style={{ padding: '12px 14px', borderRadius: '8px', background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.2)' }}>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary-dark)', fontWeight: 600 }}>APPLICANT</div>
              <div style={{ marginTop: '6px', display: 'grid', gap: '4px', fontSize: '0.86rem' }}>
                <div><strong>Mobile:</strong> {reviewTarget.mobileNo ?? '—'}</div>
                <div><strong>Email:</strong> {reviewTarget.email ?? '—'}</div>
                <div><strong>Interested Sreni:</strong> {reviewTarget.interestedSreniName}</div>
                <div><strong>Family / Bachelor:</strong> {reviewTarget.familyOrBachelor ?? '—'}</div>
                <div><strong>Submitted:</strong> {formatSubmitted(reviewTarget.submittedAt)}</div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label">Zone</label>
                <select
                  className="form-input"
                  value={zoneId}
                  onChange={(e) => { setZoneId(e.target.value); setSthanId(''); }}
                >
                  <option value="">— Select zone —</option>
                  {zones.map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Sthan <span style={{ color: 'var(--error)' }}>*</span></label>
                <select className="form-input" value={sthanId} onChange={(e) => setSthanId(e.target.value)} required>
                  <option value="">— Select sthan —</option>
                  {sthansInZone.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            </div>

            {divisions.length > 0 && (
              <div className="form-group">
                <label className="form-label">Division (optional)</label>
                <select className="form-input" value={divisionId} onChange={(e) => setDivisionId(e.target.value)}>
                  <option value="">— None —</option>
                  {divisions.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Current Status</label>
              <select className="form-input" value={currentStatus} onChange={(e) => setCurrentStatus(e.target.value)}>
                <option value="">— Select status —</option>
                {currentStatusOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Internal note (optional)</label>
              <textarea
                className="form-input"
                rows={2}
                value={reviewNote}
                onChange={(e) => setReviewNote(e.target.value)}
                placeholder="Appended to remarks on the contact record"
                style={{ resize: 'vertical' }}
              />
            </div>

            <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-secondary-dark)' }}>
              Completing review assigns zone, sthan, and membership status, promotes the contact to the interested Sreni, and removes them from the pending queue.
            </p>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setReviewTarget(null)} disabled={isSaving}>
                Cancel
              </button>
              <button type="button" className="btn btn-primary" onClick={() => void handleCompleteReview()} disabled={isSaving || !sthanId}>
                {isSaving ? 'Saving…' : 'Complete review'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
