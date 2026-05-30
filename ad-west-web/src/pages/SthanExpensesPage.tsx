import React, { useCallback, useEffect, useState } from 'react';
import { backendApi, SthanExpenseApi, SthanExpenseCategory, SthanExpenseStatus } from '../utils/backendApi';
import { useAuth } from '../context/auth-context';
import { useToast } from '../components/common/Toast';
import { useConfirm } from '../components/common/ConfirmDialog';
import { SwitchToggle } from '../components/common/SwitchToggle';

interface Props {
  locationId: string;
  locationName: string;
}

const CATEGORY_LABELS: Record<SthanExpenseCategory, string> = {
  travel: 'Travel',
  food: 'Food & Meals',
  accommodation: 'Accommodation',
  event_supplies: 'Event Supplies',
  printing: 'Printing',
  other: 'Other',
};

const STATUS_COLORS: Record<SthanExpenseStatus, string> = {
  draft: 'var(--text-secondary-dark)',
  submitted: 'var(--warning)',
  pending_review: 'var(--warning)',
  approved: 'var(--success)',
  rejected: 'var(--error)',
};

const STATUS_LABELS: Record<SthanExpenseStatus, string> = {
  draft: 'Draft',
  submitted: 'Submitted',
  pending_review: 'Pending Review',
  approved: 'Approved',
  rejected: 'Rejected',
};

const BLANK = { category: 'other' as SthanExpenseCategory, description: '', amount: '', currency: 'AED', asDraft: false };

export const SthanExpensesPage: React.FC<Props> = ({ locationId, locationName }) => {
  const { adminUser } = useAuth();
  const { addToast } = useToast();
  const confirm = useConfirm();

  const isSuperAdmin = adminUser?.roles?.some((r) =>
    String(r.role).trim().toUpperCase().replace(/\s+/g, '_') === 'SUPER_ADMIN',
  ) ?? false;
  const isZoneOrSuper = adminUser?.roles?.some((r) => r.scopeType === 'global' || r.scopeType === 'zone') ?? false;

  const [items, setItems] = useState<SthanExpenseApi[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [filterStatus, setFilterStatus] = useState('');
  const [selected, setSelected] = useState<SthanExpenseApi | null>(null);
  const [form, setForm] = useState(BLANK);
  const [saving, setSaving] = useState(false);
  const [reviewStatus, setReviewStatus] = useState<'approved' | 'rejected' | 'pending_review'>('approved');
  const [reviewNotes, setReviewNotes] = useState('');
  const [reviewing, setReviewing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await backendApi.listSthanExpenses(locationId, filterStatus || undefined);
      setItems(Array.isArray(res) ? res : []);
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to load expenses', 'error');
    } finally {
      setLoading(false);
    }
  }, [locationId, filterStatus, addToast]);

  useEffect(() => { void load(); }, [load]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.description.trim() || !form.amount) return;
    setSaving(true);
    try {
      await backendApi.createSthanExpense(locationId, {
        category: form.category,
        description: form.description,
        amount: parseFloat(form.amount),
        currency: form.currency,
        asDraft: form.asDraft,
      });
      addToast('Expense created', 'success');
      setShowForm(false);
      setForm(BLANK);
      void load();
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to create', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleReview = async (item: SthanExpenseApi) => {
    setReviewing(true);
    try {
      const updated = await backendApi.reviewSthanExpense(locationId, item.id, {
        status: reviewStatus,
        reviewerNotes: reviewNotes.trim() || undefined,
      });
      setItems((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
      setSelected(null);
      setReviewNotes('');
      addToast(`Expense ${reviewStatus}`, 'success');
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Review failed', 'error');
    } finally {
      setReviewing(false);
    }
  };

  const handleDelete = async (item: SthanExpenseApi) => {
    const ok = await confirm({ title: 'Delete Expense', message: `Delete this expense request?`, confirmLabel: 'Delete', danger: true });
    if (!ok) return;
    try {
      await backendApi.deleteSthanExpense(locationId, item.id);
      setItems((prev) => prev.filter((r) => r.id !== item.id));
      addToast('Expense deleted', 'success');
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Delete failed', 'error');
    }
  };

  const statusFilters: Array<{ label: string; value: string }> = [
    { label: 'All', value: '' },
    { label: 'Submitted', value: 'submitted' },
    { label: 'Pending Review', value: 'pending_review' },
    { label: 'Approved', value: 'approved' },
    { label: 'Rejected', value: 'rejected' },
  ];

  return (
    <div className="animate-slide-up">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0 }}>💰 {locationName} — Expenses</h2>
          <p style={{ color: 'var(--text-secondary-dark)', fontSize: '0.875rem', marginTop: '4px', marginBottom: 0 }}>
            Expense requests for this sthan.
          </p>
          <div style={{ marginTop: '10px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <span className="badge badge-info" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 12px', border: '1px solid currentColor', background: 'transparent', fontSize: '0.8rem', fontWeight: 600 }}>
              <span style={{ fontWeight: 800 }}>{items.length}</span> {items.length === 1 ? 'Record' : 'Records'}
            </span>
          </div>
        </div>
        {!showForm && (
          <button type="button" className="btn btn-primary" style={{ fontSize: '0.875rem' }} onClick={() => setShowForm(true)}>
            + New Expense
          </button>
        )}
      </div>

      {/* Create form */}
      {showForm && (
        <div className="glass-panel" style={{ padding: '24px', marginBottom: '24px', borderLeft: '3px solid var(--primary)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>New Expense Request</h4>
            <button type="button" className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.82rem' }} onClick={() => { setShowForm(false); setForm(BLANK); }}>Cancel</button>
          </div>
          <form onSubmit={(e) => void handleCreate(e)}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '14px' }}>
              <div>
                <label className="form-label">Category</label>
                <select className="form-input" value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value as SthanExpenseCategory }))}>
                  {(Object.keys(CATEGORY_LABELS) as SthanExpenseCategory[]).map((c) => (
                    <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="form-label">Amount *</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <select className="form-input" value={form.currency} onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))} style={{ width: '80px', flexShrink: 0 }}>
                    <option value="AED">AED</option>
                    <option value="USD">USD</option>
                    <option value="INR">INR</option>
                  </select>
                  <input className="form-input" type="number" min="0" step="0.01" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} required placeholder="0.00" style={{ flex: 1 }} />
                </div>
              </div>
            </div>
            <div style={{ marginBottom: '14px' }}>
              <label className="form-label">Description *</label>
              <textarea className="form-input" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} required rows={3} style={{ resize: 'vertical' }} placeholder="Describe the expense…" />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
              <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary-dark)' }}>Save as draft</span>
              <SwitchToggle
                checked={form.asDraft}
                onChange={(val) => setForm((f) => ({ ...f, asDraft: val }))}
                labelOn="Draft"
                labelOff="Submit now"
              />
            </div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-secondary" onClick={() => { setShowForm(false); setForm(BLANK); }}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Saving…' : form.asDraft ? 'Save as Draft' : 'Submit Expense'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Review panel */}
      {selected && isZoneOrSuper && (
        <div className="glass-panel" style={{ padding: '20px', marginBottom: '20px', borderLeft: '3px solid var(--warning)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700 }}>Review: {selected.description}</h4>
            <button type="button" className="btn btn-secondary" style={{ padding: '5px 10px', fontSize: '0.8rem' }} onClick={() => { setSelected(null); setReviewNotes(''); }}>Close</button>
          </div>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '12px' }}>
            {(['approved', 'pending_review', 'rejected'] as const).map((s) => (
              <button key={s} type="button" onClick={() => setReviewStatus(s)}
                className={`btn ${reviewStatus === s ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '6px 14px', fontSize: '0.84rem' }}>
                {STATUS_LABELS[s]}
              </button>
            ))}
          </div>
          <textarea className="form-input" value={reviewNotes} onChange={(e) => setReviewNotes(e.target.value)} rows={2} placeholder="Notes (optional)" style={{ resize: 'vertical', marginBottom: '12px' }} />
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-secondary" onClick={() => { setSelected(null); setReviewNotes(''); }}>Cancel</button>
            <button type="button" className="btn btn-primary" disabled={reviewing} onClick={() => void handleReview(selected)}>
              {reviewing ? 'Saving…' : 'Save Decision'}
            </button>
          </div>
        </div>
      )}

      {/* Status filter */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '16px', flexWrap: 'wrap' }}>
        {statusFilters.map((f) => (
          <button key={f.value} type="button" onClick={() => setFilterStatus(f.value)}
            style={{ padding: '6px 14px', borderRadius: '6px', border: '1px solid', borderColor: filterStatus === f.value ? 'var(--primary)' : 'var(--border-dark)', background: filterStatus === f.value ? 'rgba(99,102,241,0.1)' : 'transparent', color: filterStatus === f.value ? 'var(--primary)' : 'var(--text-secondary-dark)', fontWeight: filterStatus === f.value ? 700 : 400, fontSize: '0.8rem', cursor: 'pointer' }}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div className="glass-panel" style={{ padding: '40px 24px', textAlign: 'center', color: 'var(--text-secondary-dark)', fontSize: '0.9rem' }}>Loading…</div>
      ) : items.length === 0 ? (
        <div className="glass-panel" style={{ padding: '60px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '16px' }}>💰</div>
          <h3 style={{ fontWeight: 700, marginBottom: '8px' }}>No expenses yet</h3>
          <p style={{ color: 'var(--text-secondary-dark)', fontSize: '0.875rem', maxWidth: '400px', margin: '0 auto 24px' }}>
            {filterStatus ? 'No records with this status.' : 'Submit the first expense request using the button above.'}
          </p>
        </div>
      ) : (
        <div className="table-container" style={{ overflowX: 'auto' }}>
          <table className="custom-table">
            <thead>
              <tr>
                <th>Category</th>
                <th>Description</th>
                <th>Amount</th>
                {isSuperAdmin && <th>Submitted By</th>}
                <th>Status</th>
                <th>Created</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td style={{ fontSize: '0.85rem', whiteSpace: 'nowrap' }}>{CATEGORY_LABELS[item.category]}</td>
                  <td style={{ fontSize: '0.85rem', maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.description}</td>
                  <td style={{ fontSize: '0.85rem', fontWeight: 600, whiteSpace: 'nowrap' }}>{item.currency} {Number(item.amount).toFixed(2)}</td>
                  {isSuperAdmin && <td style={{ fontSize: '0.82rem', color: 'var(--text-secondary-dark)' }}>{item.submittedBy ?? '—'}</td>}
                  <td>
                    <span style={{ fontSize: '0.8rem', fontWeight: 600, color: STATUS_COLORS[item.status] }}>
                      {STATUS_LABELS[item.status]}
                    </span>
                    {item.reviewerNotes && (
                      <p style={{ margin: '2px 0 0', fontSize: '0.72rem', color: 'var(--text-secondary-dark)' }}>{item.reviewerNotes}</p>
                    )}
                  </td>
                  <td style={{ fontSize: '0.82rem', color: 'var(--text-secondary-dark)', whiteSpace: 'nowrap' }}>
                    {new Date(item.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </td>
                  <td>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                      {isZoneOrSuper && item.status === 'submitted' && (
                        <button type="button" className="btn btn-secondary" style={{ padding: '5px 10px', fontSize: '0.8rem' }} onClick={() => { setSelected(item); setReviewStatus('approved'); setReviewNotes(''); }}>
                          Review
                        </button>
                      )}
                      {(item.status === 'draft' || item.status === 'rejected') && (
                        <button type="button" className="btn btn-secondary" style={{ padding: '5px 10px', fontSize: '0.8rem', color: 'var(--error)', borderColor: 'rgba(239,68,68,0.2)' }} onClick={() => void handleDelete(item)}>
                          Delete
                        </button>
                      )}
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
