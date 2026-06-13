import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Modal } from '../components/common/Modal';
import { useToast } from '../components/common/Toast';
import { DateField, TimeField } from '../components/common/DateFields';
import { ExportMenu, formatExportSections } from '../components/common/ExportMenu';
import { PageHeader } from '../components/common/PageHeader';
import { backendApi, SthanCalendarEventApi } from '../utils/backendApi';
import {
  exportSthanCalendar,
  filterSthanEventsForMonth,
} from '../utils/calendarExport';

interface Props {
  locationId: string;
  locationName: string;
}

const pad = (n: number) => String(n).padStart(2, '0');
const toDateStr = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const EVENT_COLORS = [
  { label: 'Indigo', value: '#6366f1' },
  { label: 'Teal', value: '#14b8a6' },
  { label: 'Amber', value: '#f59e0b' },
  { label: 'Rose', value: '#f43f5e' },
  { label: 'Violet', value: '#8b5cf6' },
  { label: 'Sky', value: '#0ea5e9' },
];

const today = new Date();
const todayStr = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;

const isSyncedEvent = (ev: SthanCalendarEventApi) =>
  ev.source === 'sreni' || ev.source === 'special_event' || ev.readOnly;

const isSpecialEvent = (ev: SthanCalendarEventApi) =>
  ev.source === 'special_event' || ev.priorityTier === 'special_event';

const eventDisplayTitle = (ev: SthanCalendarEventApi) => {
  if (ev.approvalStatus === 'pending') return `${ev.title} (Pending)`;
  if (isSpecialEvent(ev)) return `${ev.title} (Special Event)`;
  return ev.title;
};

const eventKey = (ev: SthanCalendarEventApi) => `${ev.source ?? 'local'}-${ev.id}`;

const scopeLabel = (ev: SthanCalendarEventApi) => {
  if (ev.source === 'special_event') return 'Special Event';
  if (ev.scope === 'zone') return 'Zone';
  if (ev.scope === 'sthan') return 'Sreni · Sthan';
  return 'Sreni';
};

export const SthanCalendarPage: React.FC<Props> = ({ locationId, locationName }) => {
  const { addToast } = useToast();

  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [events, setEvents] = useState<SthanCalendarEventApi[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [view, setView] = useState<'month' | 'agenda'>('month');

  const loadEvents = useCallback(async () => {
    setIsLoading(true);
    try {
      const rows = await backendApi.listSthanCalendarEvents(locationId);
      setEvents(rows);
    } catch {
      setEvents([]);
    } finally {
      setIsLoading(false);
    }
  }, [locationId]);

  useEffect(() => {
    void loadEvents();
  }, [loadEvents]);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<SthanCalendarEventApi | null>(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [formTitle, setFormTitle] = useState('');
  const [formStart, setFormStart] = useState('09:00');
  const [formEnd, setFormEnd] = useState('10:00');
  const [formColor, setFormColor] = useState(EVENT_COLORS[0].value);
  const [formNotes, setFormNotes] = useState('');

  const openAdd = (dateStr: string) => {
    setEditingEvent(null);
    setSelectedDate(dateStr);
    setFormTitle('');
    setFormStart('09:00');
    setFormEnd('10:00');
    setFormColor(EVENT_COLORS[0].value);
    setFormNotes('');
    setModalOpen(true);
  };

  const openEdit = (e: React.MouseEvent, ev: SthanCalendarEventApi) => {
    e.stopPropagation();
    setEditingEvent(ev);
    setSelectedDate(ev.date);
    setFormTitle(ev.title);
    setFormStart(ev.startTime);
    setFormEnd(ev.endTime);
    setFormColor(ev.color);
    setFormNotes(ev.notes ?? '');
    setModalOpen(true);
  };

  const localCount = events.filter((ev) => !isSyncedEvent(ev)).length;
  const syncedCount = events.filter((ev) => isSyncedEvent(ev)).length;

  const handleSave = async () => {
    if (!formTitle.trim() || (editingEvent && isSyncedEvent(editingEvent))) return;

    const payload = {
      title: formTitle.trim(),
      date: selectedDate,
      startTime: formStart,
      endTime: formEnd,
      color: formColor,
      notes: formNotes,
    };

    try {
      if (editingEvent) {
        await backendApi.updateSthanCalendarEvent(locationId, editingEvent.id, payload);
        addToast('Event updated and routed for approval.', 'success');
      } else {
        await backendApi.createSthanCalendarEvent(locationId, payload);
        addToast('Event created and routed for approval.', 'success');
      }
      setModalOpen(false);
      await loadEvents();
    } catch (error) {
      addToast(error instanceof Error ? error.message : 'Failed to save event.', 'error');
    }
  };

  const handleDelete = async () => {
    if (!editingEvent || isSyncedEvent(editingEvent)) return;
    try {
      await backendApi.deleteSthanCalendarEvent(locationId, editingEvent.id);
      setModalOpen(false);
      await loadEvents();
      addToast('Event deleted.', 'success');
    } catch (error) {
      addToast(error instanceof Error ? error.message : 'Failed to delete event.', 'error');
    }
  };

  const prevMonth = () => {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
  };

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7;

  const getEventsForDate = (dateStr: string) =>
    events.filter(ev => ev.date === dateStr).sort((a, b) => a.startTime.localeCompare(b.startTime));

  const agendaEvents = events
    .filter(ev => {
      const d = new Date(ev.date);
      return d.getFullYear() === year && d.getMonth() === month;
    })
    .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime));

  const monthEvents = useMemo(
    () => filterSthanEventsForMonth(events, year, month),
    [events, year, month],
  );

  const calendarExportSections = formatExportSections([
    {
      title: `${MONTH_NAMES[month]} ${year}`,
      disabled: monthEvents.length === 0,
      onExport: (format) => exportSthanCalendar(monthEvents, {
        entityName: locationName,
        year,
        month,
        scope: 'month',
      }, format),
    },
    {
      title: 'All Events',
      disabled: events.length === 0,
      onExport: (format) => exportSthanCalendar(events, {
        entityName: locationName,
        year,
        month,
        scope: 'all',
      }, format),
    },
  ]);

  return (
    <div>
      <PageHeader
        icon="📅"
        title={locationName}
        subtitle={`Plan events for this Sthan — ${localCount} local, ${syncedCount} from Sreni calendar${isLoading ? ' (syncing…)' : ''}`}
        actions={
          <>
            <ExportMenu
              disabled={isLoading}
              sections={calendarExportSections}
            />
            <div className="btn-group">
              <button
                className={`btn ${view === 'month' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setView('month')}
              >Month</button>
              <button
                className={`btn ${view === 'agenda' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setView('agenda')}
              >Agenda</button>
            </div>
            <button
              className="btn btn-primary"
              onClick={() => openAdd(todayStr)}
            >+ Add Event</button>
          </>
        }
      />
      {syncedCount > 0 && (
        <p style={{ color: 'var(--text-secondary-dark)', fontSize: '0.78rem', marginTop: '-12px', marginBottom: '24px' }}>
          Zone and Sreni events appear here automatically (read-only). Edit them from the Sreni calendar.
        </p>
      )}

      <div
        className="glass-panel"
        style={{
          padding: '12px 20px',
          marginBottom: 0,
          borderBottomLeftRadius: 0,
          borderBottomRightRadius: 0,
          borderBottom: '1px solid var(--border-dark)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <button className="btn btn-secondary btn-sm page-nav-btn" onClick={prevMonth}>← Prev</button>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontWeight: 800, fontSize: '1.1rem' }}>{MONTH_NAMES[month]} {year}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary-dark)', marginTop: '2px' }}>
            {agendaEvents.length} event{agendaEvents.length !== 1 ? 's' : ''} this month
          </div>
        </div>
        <button className="btn btn-secondary btn-sm page-nav-btn" onClick={nextMonth}>Next →</button>
      </div>

      {view === 'month' ? (
        <>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            background: 'var(--panel-soft-bg)',
            borderLeft: '1px solid var(--border-dark)',
            borderRight: '1px solid var(--border-dark)',
          }}>
            {DAY_NAMES.map(d => (
              <div key={d} style={{
                padding: '10px 0',
                textAlign: 'center',
                fontSize: '0.75rem',
                fontWeight: 700,
                color: 'var(--text-secondary-dark)',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
              }}>{d}</div>
            ))}
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            border: '1px solid var(--border-dark)',
            borderTop: 'none',
            borderRadius: '0 0 12px 12px',
            overflow: 'hidden',
          }}>
            {Array.from({ length: totalCells }).map((_, idx) => {
              const dayNum = idx - firstDay + 1;
              const isCurrentMonth = dayNum >= 1 && dayNum <= daysInMonth;
              const dateStr = isCurrentMonth ? toDateStr(year, month, dayNum) : '';
              const dayEvents = dateStr ? getEventsForDate(dateStr) : [];
              const isToday = dateStr === todayStr;
              const isWeekend = idx % 7 === 0 || idx % 7 === 6;

              return (
                <div
                  key={idx}
                  onClick={() => isCurrentMonth && openAdd(dateStr)}
                  style={{
                    minHeight: '110px',
                    padding: '8px',
                    borderRight: (idx + 1) % 7 !== 0 ? '1px solid var(--border-dark)' : 'none',
                    borderBottom: idx < totalCells - 7 ? '1px solid var(--border-dark)' : 'none',
                    background: isToday
                      ? 'rgba(99,102,241,0.07)'
                      : isCurrentMonth
                      ? isWeekend ? 'rgba(255,255,255,0.01)' : 'var(--glass-bg)'
                      : 'var(--panel-soft-bg)',
                    cursor: isCurrentMonth ? 'pointer' : 'default',
                    transition: 'background 0.12s',
                    opacity: isCurrentMonth ? 1 : 0.4,
                  }}
                  onMouseEnter={e => {
                    if (isCurrentMonth) (e.currentTarget as HTMLElement).style.background = 'rgba(99,102,241,0.06)';
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.background = isToday
                      ? 'rgba(99,102,241,0.07)'
                      : isCurrentMonth
                      ? isWeekend ? 'rgba(255,255,255,0.01)' : 'var(--glass-bg)'
                      : 'var(--panel-soft-bg)';
                  }}
                >
                  {isCurrentMonth && (
                    <>
                      <div style={{
                        width: '26px',
                        height: '26px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: '50%',
                        background: isToday ? 'var(--primary)' : 'transparent',
                        color: isToday ? '#fff' : isWeekend ? 'var(--text-secondary-dark)' : 'var(--text-primary-dark)',
                        fontSize: '0.82rem',
                        fontWeight: isToday ? 800 : 600,
                        marginBottom: '4px',
                      }}>{dayNum}</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        {dayEvents.slice(0, 3).map(ev => {
                          const synced = isSyncedEvent(ev);
                          return (
                          <div
                            key={eventKey(ev)}
                            onClick={e => openEdit(e, ev)}
                            title={`${ev.startTime}–${ev.endTime}: ${eventDisplayTitle(ev)}${synced ? ` (${scopeLabel(ev)} · read-only)` : ''}`}
                            style={{
                              fontSize: '0.71rem',
                              fontWeight: 600,
                              padding: '2px 6px',
                              borderRadius: '4px',
                              background: ev.color + '20',
                              color: ev.color,
                              borderLeft: `3px ${synced ? 'dashed' : 'solid'} ${ev.color}`,
                              overflow: 'hidden',
                              whiteSpace: 'nowrap',
                              textOverflow: 'ellipsis',
                              cursor: 'pointer',
                            }}
                          >
                            {synced ? '↗ ' : ''}{ev.startTime} {eventDisplayTitle(ev)}
                          </div>
                          );
                        })}
                        {dayEvents.length > 3 && (
                          <div style={{ fontSize: '0.69rem', color: 'var(--text-secondary-dark)', paddingLeft: '2px', fontWeight: 600 }}>
                            +{dayEvents.length - 3} more
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <div className="glass-panel" style={{ borderTopLeftRadius: 0, borderTopRightRadius: 0, padding: 0, overflow: 'hidden' }}>
          {agendaEvents.length === 0 ? (
            <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-secondary-dark)' }}>
              No events in {MONTH_NAMES[month]} {year}. Click "+ Add Event" to schedule one.
            </div>
          ) : (
            agendaEvents.map((ev, idx) => {
              const d = new Date(ev.date);
              const label = `${DAY_NAMES[d.getDay()]}, ${d.getDate()} ${MONTH_NAMES[d.getMonth()]}`;
              const synced = isSyncedEvent(ev);
              return (
                <div
                  key={eventKey(ev)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    padding: '14px 20px',
                    borderBottom: idx < agendaEvents.length - 1 ? '1px solid var(--border-dark)' : 'none',
                    cursor: 'pointer',
                    transition: 'background 0.12s',
                  }}
                  onClick={e => openEdit(e, ev)}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(99,102,241,0.04)'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                >
                  <div style={{ width: '4px', height: '40px', borderRadius: '2px', background: ev.color, flexShrink: 0, opacity: synced ? 0.75 : 1 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span>{eventDisplayTitle(ev)}</span>
                      {synced && (
                        <span style={{
                          fontSize: '0.68rem', fontWeight: 700, padding: '2px 8px', borderRadius: '999px',
                          background: 'rgba(99,102,241,0.12)', color: 'var(--primary)',
                        }}>
                          {scopeLabel(ev)}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary-dark)', marginTop: '2px' }}>
                      {label} · {ev.startTime}–{ev.endTime}
                    </div>
                    {ev.notes && (
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary-dark)', marginTop: '2px', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                        {ev.notes}
                      </div>
                    )}
                  </div>
                  <span style={{
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    padding: '4px 10px',
                    borderRadius: '20px',
                    background: ev.color + '20',
                    color: ev.color,
                    flexShrink: 0,
                  }}>
                    {ev.date === todayStr ? 'Today' : label.split(',')[0]}
                  </span>
                </div>
              );
            })
          )}
        </div>
      )}

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={
          editingEvent && isSyncedEvent(editingEvent)
            ? `${scopeLabel(editingEvent)} Event`
            : editingEvent
            ? 'Edit Event'
            : `New Event — ${selectedDate}`
        }
        maxWidth="460px"
      >
        {editingEvent && isSyncedEvent(editingEvent) ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{
              padding: '10px 12px', borderRadius: '8px', fontSize: '0.82rem',
              background: 'rgba(99,102,241,0.08)', color: 'var(--text-secondary-dark)',
            }}>
              Synced from the Sreni calendar — edit or remove it from the matching Sreni → Calendar page.
            </div>
            <div>
              <div className="form-label">Title</div>
              <div style={{ fontWeight: 700, fontSize: '1rem' }}>{editingEvent.title}</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <div className="form-label">Date</div>
                <div>{editingEvent.date}</div>
              </div>
              <div>
                <div className="form-label">Time</div>
                <div>{editingEvent.startTime} – {editingEvent.endTime}</div>
              </div>
            </div>
            {editingEvent.notes && (
              <div>
                <div className="form-label">Notes</div>
                <div style={{ fontSize: '0.9rem', whiteSpace: 'pre-wrap' }}>{editingEvent.notes}</div>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setModalOpen(false)}>Close</button>
            </div>
          </div>
        ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label className="form-label">Title *</label>
            <input
              className="form-input"
              placeholder="Event title"
              value={formTitle}
              onChange={e => setFormTitle(e.target.value)}
              autoFocus
            />
          </div>
          {!editingEvent && (
            <div>
              <label className="form-label">Date</label>
              <DateField
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
              />
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label className="form-label">Start Time</label>
              <TimeField value={formStart} onChange={e => setFormStart(e.target.value)} />
            </div>
            <div>
              <label className="form-label">End Time</label>
              <TimeField value={formEnd} onChange={e => setFormEnd(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="form-label">Color</label>
            <div style={{ display: 'flex', gap: '10px', marginTop: '6px', flexWrap: 'wrap' }}>
              {EVENT_COLORS.map(c => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setFormColor(c.value)}
                  title={c.label}
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    background: c.value,
                    border: 'none',
                    cursor: 'pointer',
                    outline: formColor === c.value ? `3px solid ${c.value}` : '2px solid transparent',
                    outlineOffset: '2px',
                    boxShadow: formColor === c.value ? `0 0 0 2px var(--surface-dark)` : 'none',
                    transition: 'transform 0.1s',
                    transform: formColor === c.value ? 'scale(1.2)' : 'scale(1)',
                  }}
                />
              ))}
            </div>
          </div>
          <div>
            <label className="form-label">Notes</label>
            <textarea
              className="form-input"
              placeholder="Optional notes…"
              value={formNotes}
              onChange={e => setFormNotes(e.target.value)}
              style={{ minHeight: '68px', resize: 'vertical' }}
            />
          </div>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '4px' }}>
            {editingEvent && !isSyncedEvent(editingEvent) && (
              <button
                className="btn btn-danger-outline"
                style={{ marginRight: 'auto' }}
                onClick={() => void handleDelete()}
              >
                Delete
              </button>
            )}
            <button className="btn btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
            <button
              className="btn btn-primary"
              onClick={() => void handleSave()}
              disabled={!formTitle.trim()}
            >
              {editingEvent ? 'Update' : 'Create'}
            </button>
          </div>
        </div>
        )}
      </Modal>
    </div>
  );
};
