import React, { useEffect, useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  ComposedChart,
  PieChart,
  Pie,
  Cell,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
} from 'recharts';
import {
  backendApi,
  CalendarEventApi,
  SreniAttendanceListingItemApi,
  SreniContactRowApi,
} from '../utils/backendApi';
import { useToast } from '../components/common/Toast';
import { SwitchToggle } from '../components/common/SwitchToggle';
import { DateField } from '../components/common/DateFields';

interface Props {
  sreniId: string;
  sreniName: string;
}

type StudioTab = 'details' | 'pivot' | 'graph';
type DatasetKey = 'all' | 'contacts' | 'events' | 'attendance';
type SortDirection = 'asc' | 'desc';
type Aggregation = 'sum' | 'avg' | 'min' | 'max' | 'count';
type GraphType = 'line' | 'bar' | 'area' | 'composed' | 'pie' | 'radar';

type ScalarValue = string | number | boolean | null | undefined;
type StudioRecord = Record<string, ScalarValue> & { id: string };

const PALETTE = ['#4f46e5', '#0ea5e9', '#14b8a6', '#f59e0b', '#ef4444', '#8b5cf6', '#22c55e'];

const selectorChipStyle = (active: boolean): React.CSSProperties => ({
  width: '100%',
  borderRadius: '8px',
  border: '1px solid var(--border-dark)',
  background: active ? 'var(--primary)' : 'transparent',
  color: active ? '#ffffff' : 'var(--text-secondary-dark)',
  padding: '6px 10px',
  fontSize: '0.8rem',
  fontWeight: 600,
  textAlign: 'left',
  cursor: 'pointer',
});

const DATASET_OPTIONS: Array<{ key: DatasetKey; label: string }> = [
  { key: 'all', label: 'All Domains' },
  { key: 'contacts', label: 'Contacts' },
  { key: 'events', label: 'Events' },
  { key: 'attendance', label: 'Attendance' },
];

const normalizeFieldKey = (value: string): string => {
  const cleaned = value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  return cleaned || 'field';
};

const prettyLabel = (value: string): string =>
  value
    .replace(/^dynamic_/, '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());

const parseNumberSafe = (value: ScalarValue): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'boolean') return value ? 1 : 0;
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
};

const toText = (value: ScalarValue): string => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  return String(value);
};

const aggregateValues = (values: number[], mode: Aggregation): number => {
  if (mode === 'count') return values.length;
  if (!values.length) return 0;
  if (mode === 'sum') return values.reduce((acc, value) => acc + value, 0);
  if (mode === 'avg') return values.reduce((acc, value) => acc + value, 0) / values.length;
  if (mode === 'min') return Math.min(...values);
  return Math.max(...values);
};

const csvEscape = (value: ScalarValue): string => {
  const text = toText(value);
  if (!/[",\n]/.test(text)) return text;
  return `"${text.replace(/"/g, '""')}"`;
};

const tryParseDateMs = (value: ScalarValue): number | null => {
  if (!value) return null;
  const parsed = Date.parse(String(value));
  return Number.isFinite(parsed) ? parsed : null;
};

const formatDateCell = (value: ScalarValue): string => {
  const ts = tryParseDateMs(value);
  if (ts === null) return toText(value) || '-';
  return new Date(ts).toLocaleString('en-AE');
};

const loadAllContacts = async (sreniId: string): Promise<SreniContactRowApi[]> => {
  const pageSize = 200;
  let page = 1;
  const all: SreniContactRowApi[] = [];

  while (true) {
    const batch = await backendApi.listSreniContacts(sreniId, page, pageSize);
    all.push(...batch.items);
    if (page >= batch.totalPages) break;
    page += 1;
  }

  return all;
};

const toIsoFromEvent = (event: CalendarEventApi): string => {
  const raw = `${event.date}T${event.startTime}`;
  const parsed = Date.parse(raw);
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : event.updatedAt;
};

const durationMinutes = (startTime: string, endTime: string): number => {
  const start = Date.parse(`1970-01-01T${startTime}`);
  const end = Date.parse(`1970-01-01T${endTime}`);
  if (!Number.isFinite(start) || !Number.isFinite(end)) return 0;
  const diff = Math.max(0, Math.round((end - start) / 60000));
  return diff;
};

export const SreniAnalyticsStudioPage: React.FC<Props> = ({ sreniId, sreniName }) => {
  const { addToast } = useToast();

  const [tab, setTab] = useState<StudioTab>('details');
  const [loading, setLoading] = useState(false);

  const [contacts, setContacts] = useState<SreniContactRowApi[]>([]);
  const [events, setEvents] = useState<CalendarEventApi[]>([]);
  const [attendance, setAttendance] = useState<SreniAttendanceListingItemApi[]>([]);

  const [dataset, setDataset] = useState<DatasetKey>('all');
  const [searchText, setSearchText] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [sortKey, setSortKey] = useState('recorded_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);

  const [pivotRowDim, setPivotRowDim] = useState('domain');
  const [pivotColDim, setPivotColDim] = useState('period_bucket');
  const [pivotMeasure, setPivotMeasure] = useState('__count');
  const [pivotAggregation, setPivotAggregation] = useState<Aggregation>('sum');

  const [graphType, setGraphType] = useState<GraphType>('line');
  const [graphXAxis, setGraphXAxis] = useState('period_bucket');
  const [graphMeasures, setGraphMeasures] = useState<string[]>([]);
  const [graphAggregation, setGraphAggregation] = useState<Aggregation>('sum');
  const [graphStacked, setGraphStacked] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      setLoading(true);
      const [contactsResult, eventsResult, attendanceResult] = await Promise.allSettled([
        loadAllContacts(sreniId),
        backendApi.listSreniCalendarEvents(sreniId),
        backendApi.listSreniAttendanceListing(sreniId),
      ]);

      if (cancelled) return;

      if (contactsResult.status === 'fulfilled') {
        setContacts(contactsResult.value);
      } else {
        setContacts([]);
        addToast('Could not load contacts for analytics.', 'warning');
      }

      if (eventsResult.status === 'fulfilled') {
        setEvents(eventsResult.value);
      } else {
        setEvents([]);
        addToast('Could not load events for analytics.', 'warning');
      }

      if (attendanceResult.status === 'fulfilled') {
        setAttendance(attendanceResult.value);
      } else {
        setAttendance([]);
        addToast('Could not load attendance for analytics.', 'warning');
      }

      setLoading(false);
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [sreniId, addToast]);

  const contactRecords = useMemo<StudioRecord[]>(() => {
    return contacts.map((row) => {
      const base: StudioRecord = {
        id: `contact:${row.id}`,
        domain: 'contacts',
        period_bucket: String(new Date(row.updatedAt).getFullYear()),
        recorded_at: row.updatedAt,
        row_index: row.rowIndex,
        source_file: row.sourceFile || '',
        uploaded_by: row.uploadedBy || '',
      };

      for (const [rawKey, rawValue] of Object.entries(row.data || {})) {
        const key = `dynamic_${normalizeFieldKey(rawKey)}`;
        base[key] = rawValue as ScalarValue;
      }

      return base;
    });
  }, [contacts]);

  const eventRecords = useMemo<StudioRecord[]>(() => {
    return events.map((event) => ({
      id: `event:${event.id}`,
      domain: 'events',
      period_bucket: event.date,
      recorded_at: toIsoFromEvent(event),
      event_title: event.title,
      event_date: event.date,
      start_time: event.startTime,
      end_time: event.endTime,
      duration_minutes: durationMinutes(event.startTime, event.endTime),
      scope: event.scope,
      sthan_count: event.sthanIds?.length ?? 0,
      notes: event.notes || '',
      created_by: event.createdBy,
    }));
  }, [events]);

  const attendanceRecords = useMemo<StudioRecord[]>(() => {
    const all: StudioRecord[] = [];

    for (const item of attendance) {
      const event = item.event;
      const periodBucket = event.date;
      const eventTitle = event.title;

      for (const metricEntry of item.metrics) {
        const metric = metricEntry.metric;
        const capture = metricEntry.capture;

        if (!capture) {
          all.push({
            id: `attendance:${event.id}:${metric.id}:none`,
            domain: 'attendance',
            period_bucket: periodBucket,
            recorded_at: event.updatedAt,
            event_title: eventTitle,
            event_date: event.date,
            metric_name: metric.name,
            metric_id: metric.id,
            capture_key: '',
            value_text: '',
            value_number: null,
            has_capture: 0,
            captured_at: '',
          });
          continue;
        }

        const values = capture.values || {};
        const entries = Object.entries(values);
        if (!entries.length) {
          all.push({
            id: `attendance:${event.id}:${metric.id}:empty`,
            domain: 'attendance',
            period_bucket: periodBucket,
            recorded_at: capture.updatedAt || capture.capturedAt,
            event_title: eventTitle,
            event_date: event.date,
            metric_name: metric.name,
            metric_id: metric.id,
            capture_key: '',
            value_text: '',
            value_number: null,
            has_capture: 1,
            captured_at: capture.capturedAt,
          });
          continue;
        }

        for (const [key, rawValue] of entries) {
          const num = parseNumberSafe(rawValue as ScalarValue);
          all.push({
            id: `attendance:${event.id}:${metric.id}:${key}`,
            domain: 'attendance',
            period_bucket: periodBucket,
            recorded_at: capture.updatedAt || capture.capturedAt,
            event_title: eventTitle,
            event_date: event.date,
            metric_name: metric.name,
            metric_id: metric.id,
            capture_key: key,
            value_text: toText(rawValue as ScalarValue),
            value_number: num,
            has_capture: 1,
            captured_at: capture.capturedAt,
          });
        }
      }
    }

    return all;
  }, [attendance]);

  const datasetMap = useMemo(() => {
    return {
      contacts: contactRecords,
      events: eventRecords,
      attendance: attendanceRecords,
      all: [...contactRecords, ...eventRecords, ...attendanceRecords],
    } as Record<DatasetKey, StudioRecord[]>;
  }, [contactRecords, eventRecords, attendanceRecords]);

  const activeRecords = datasetMap[dataset];

  const allColumns = useMemo(() => {
    const keys = new Set<string>();
    for (const row of activeRecords) {
      for (const key of Object.keys(row)) {
        if (key === 'id') continue;
        keys.add(key);
      }
    }
    return Array.from(keys.values()).sort((a, b) => a.localeCompare(b));
  }, [activeRecords]);

  useEffect(() => {
    const defaults = allColumns.slice(0, Math.min(8, allColumns.length));
    setSelectedColumns((prev) => {
      const valid = prev.filter((item) => allColumns.includes(item));
      if (valid.length) return valid;
      return defaults;
    });

    if (!allColumns.includes(sortKey)) {
      setSortKey(allColumns[0] || 'recorded_at');
    }
  }, [allColumns, sortKey]);

  const filteredRecords = useMemo(() => {
    const fromMs = dateFrom ? Date.parse(`${dateFrom}T00:00:00`) : null;
    const toMs = dateTo ? Date.parse(`${dateTo}T23:59:59`) : null;

    return activeRecords.filter((record) => {
      const dateMs = tryParseDateMs(record.recorded_at);
      if (fromMs !== null && Number.isFinite(fromMs) && dateMs !== null && dateMs < fromMs) return false;
      if (toMs !== null && Number.isFinite(toMs) && dateMs !== null && dateMs > toMs) return false;

      if (!searchText.trim()) return true;
      const token = searchText.trim().toLowerCase();
      const text = Object.values(record).map((value) => toText(value)).join(' ').toLowerCase();
      return text.includes(token);
    });
  }, [activeRecords, dateFrom, dateTo, searchText]);

  const sortedRecords = useMemo(() => {
    const next = [...filteredRecords];
    next.sort((left, right) => {
      const a = left[sortKey];
      const b = right[sortKey];
      const aNum = parseNumberSafe(a);
      const bNum = parseNumberSafe(b);

      if (aNum !== null && bNum !== null) {
        return sortDirection === 'asc' ? aNum - bNum : bNum - aNum;
      }

      const aMs = tryParseDateMs(a);
      const bMs = tryParseDateMs(b);
      if (aMs !== null && bMs !== null) {
        return sortDirection === 'asc' ? aMs - bMs : bMs - aMs;
      }

      const aText = toText(a).toLowerCase();
      const bText = toText(b).toLowerCase();
      if (aText === bText) return 0;
      if (sortDirection === 'asc') return aText < bText ? -1 : 1;
      return aText > bText ? -1 : 1;
    });
    return next;
  }, [filteredRecords, sortKey, sortDirection]);

  const totalPages = Math.max(1, Math.ceil(sortedRecords.length / pageSize));
  const safePage = Math.min(page, totalPages);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const pagedRecords = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return sortedRecords.slice(start, start + pageSize);
  }, [sortedRecords, safePage, pageSize]);

  const dimensionKeys = useMemo(() => {
    return allColumns.filter((key) => {
      if (key === 'value_number') return false;
      const unique = new Set<string>();
      for (const row of filteredRecords) {
        const text = toText(row[key]).trim();
        if (!text) continue;
        unique.add(text);
        if (unique.size > 300) return false;
      }
      return true;
    });
  }, [allColumns, filteredRecords]);

  const measureKeys = useMemo(() => {
    return allColumns.filter((key) => {
      let numericCount = 0;
      for (const row of filteredRecords) {
        const num = parseNumberSafe(row[key]);
        if (num !== null) numericCount += 1;
        if (numericCount >= 2) return true;
      }
      return false;
    });
  }, [allColumns, filteredRecords]);

  useEffect(() => {
    if (!dimensionKeys.includes(pivotRowDim)) setPivotRowDim(dimensionKeys[0] || 'domain');
    if (!dimensionKeys.includes(pivotColDim)) setPivotColDim(dimensionKeys[1] || dimensionKeys[0] || 'period_bucket');
    if (pivotMeasure !== '__count' && !measureKeys.includes(pivotMeasure)) setPivotMeasure('__count');

    if (!dimensionKeys.includes(graphXAxis)) setGraphXAxis(dimensionKeys[0] || 'period_bucket');

    setGraphMeasures((prev) => {
      const valid = prev.filter((key) => measureKeys.includes(key));
      if (valid.length) return valid.slice(0, 4);
      return measureKeys.slice(0, 1);
    });
  }, [dimensionKeys, measureKeys, pivotRowDim, pivotColDim, pivotMeasure, graphXAxis]);

  const pivotMatrix = useMemo(() => {
    const rows: string[] = [];
    const cols: string[] = [];
    const rowSet = new Set<string>();
    const colSet = new Set<string>();
    const bucket = new Map<string, number[]>();

    for (const record of filteredRecords) {
      const rowKey = toText(record[pivotRowDim]) || 'N/A';
      const colKey = toText(record[pivotColDim]) || 'N/A';

      if (!rowSet.has(rowKey)) {
        rowSet.add(rowKey);
        rows.push(rowKey);
      }
      if (!colSet.has(colKey)) {
        colSet.add(colKey);
        cols.push(colKey);
      }

      const num = pivotMeasure === '__count' ? 1 : parseNumberSafe(record[pivotMeasure]);
      if (num === null) continue;
      const key = `${rowKey}|||${colKey}`;
      const values = bucket.get(key) ?? [];
      values.push(num);
      bucket.set(key, values);
    }

    const matrix = rows.map((rowKey) => {
      const cells: Record<string, number> = {};
      for (const colKey of cols) {
        const values = bucket.get(`${rowKey}|||${colKey}`) ?? [];
        cells[colKey] = aggregateValues(values, pivotAggregation);
      }
      return { rowKey, cells };
    });

    return { rows, cols, matrix };
  }, [filteredRecords, pivotRowDim, pivotColDim, pivotMeasure, pivotAggregation]);

  const graphData = useMemo(() => {
    const activeMeasures = graphMeasures.filter((key) => measureKeys.includes(key));
    const bucket = new Map<string, StudioRecord[]>();

    for (const record of filteredRecords) {
      const x = toText(record[graphXAxis]) || 'N/A';
      const group = bucket.get(x) ?? [];
      group.push(record);
      bucket.set(x, group);
    }

    const rows = Array.from(bucket.entries()).map(([x, records]) => {
      const point: Record<string, string | number> = { x };
      for (const measure of activeMeasures) {
        const values = records
          .map((record) => parseNumberSafe(record[measure]))
          .filter((num): num is number => num !== null);
        point[measure] = aggregateValues(values, graphAggregation);
      }
      return point;
    });

    return { activeMeasures, rows };
  }, [filteredRecords, graphXAxis, graphMeasures, graphAggregation, measureKeys]);

  const pieMeasure = useMemo(() => {
    return graphData.activeMeasures[0] || '';
  }, [graphData.activeMeasures]);

  const pieData = useMemo(() => {
    if (!pieMeasure) return [] as Array<{ name: string; value: number }>;

    return graphData.rows
      .map((row) => ({
        name: toText(row.x),
        value: parseNumberSafe(row[pieMeasure]) || 0,
      }))
      .filter((item) => item.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 20);
  }, [graphData.rows, pieMeasure]);

  const graphHasRenderableData = useMemo(() => {
    if (graphType === 'pie') {
      return pieData.length > 0;
    }
    return graphData.rows.length > 0 && graphData.activeMeasures.length > 0;
  }, [graphType, graphData.rows.length, graphData.activeMeasures.length, pieData.length]);

  const supportsStacking = graphType === 'bar' || graphType === 'area' || graphType === 'composed';

  const toggleColumn = (key: string) => {
    setSelectedColumns((prev) => {
      if (prev.includes(key)) return prev.filter((value) => value !== key);
      return [...prev, key];
    });
  };

  const toggleGraphMeasure = (key: string) => {
    setGraphMeasures((prev) => {
      if (prev.includes(key)) return prev.filter((value) => value !== key);
      return [...prev, key].slice(0, 4);
    });
  };

  const exportCsv = () => {
    const cols = selectedColumns.length ? selectedColumns : allColumns;
    const header = cols.map((col) => csvEscape(prettyLabel(col))).join(',');
    const rows = sortedRecords.map((record) => cols.map((col) => csvEscape(record[col])).join(','));
    const content = [header, ...rows].join('\n');

    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = `${sreniName.toLowerCase().replace(/\s+/g, '-')}-analytics-studio.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="animate-slide-up" style={{ display: 'grid', gap: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ fontSize: '1.55rem', fontWeight: 800, margin: 0 }}>📈 {sreniName} - Analytics Studio</h2>
          <p style={{ margin: '6px 0 0', color: 'var(--text-secondary-dark)', fontSize: '0.9rem' }}>
            Domain analytics for contacts, events, attendance, and operational performance.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <span className="badge badge-info">{filteredRecords.length} rows</span>
          <span className="badge badge-success">{measureKeys.length} numeric measures</span>
          <button type="button" className="btn btn-secondary" onClick={exportCsv} disabled={!sortedRecords.length}>Export CSV</button>
        </div>
      </div>

      <div className="glass-panel" style={{ padding: '14px', display: 'grid', gap: '10px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '10px' }}>
          <label style={{ display: 'grid', gap: '4px' }}>
            <span className="form-label" style={{ margin: 0 }}>Dataset</span>
            <select className="form-input" value={dataset} onChange={(event) => { setDataset(event.target.value as DatasetKey); setPage(1); }}>
              {DATASET_OPTIONS.map((option) => (
                <option key={option.key} value={option.key}>{option.label}</option>
              ))}
            </select>
          </label>
          <label style={{ display: 'grid', gap: '4px' }}>
            <span className="form-label" style={{ margin: 0 }}>Date From</span>
            <DateField value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
          </label>
          <label style={{ display: 'grid', gap: '4px' }}>
            <span className="form-label" style={{ margin: 0 }}>Date To</span>
            <DateField value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
          </label>
          <label style={{ display: 'grid', gap: '4px' }}>
            <span className="form-label" style={{ margin: 0 }}>Search</span>
            <input className="form-input" value={searchText} onChange={(event) => { setSearchText(event.target.value); setPage(1); }} placeholder="Search in records" />
          </label>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <button type="button" className={`btn ${tab === 'details' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTab('details')}>Detailed Reports</button>
        <button type="button" className={`btn ${tab === 'pivot' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTab('pivot')}>Pivot Studio</button>
        <button type="button" className={`btn ${tab === 'graph' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTab('graph')}>Graph Studio</button>
      </div>

      {loading ? (
        <div className="glass-panel" style={{ padding: '48px 16px', textAlign: 'center', color: 'var(--text-secondary-dark)' }}>
          Loading analytics data...
        </div>
      ) : (
        <>
          {tab === 'details' && (
            <div className="glass-panel" style={{ padding: '16px', display: 'grid', gap: '12px' }}>
              <div style={{ display: 'grid', gap: '10px', gridTemplateColumns: '2fr 1fr 1fr 1fr' }}>
                <div>
                  <div className="form-label" style={{ marginBottom: '6px' }}>Visible Columns</div>
                  <div style={{ display: 'grid', gap: '4px', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', maxHeight: '150px', overflowY: 'auto', paddingRight: '6px' }}>
                    {allColumns.map((column) => (
                      <button
                        key={column}
                        type="button"
                        aria-pressed={selectedColumns.includes(column)}
                        style={selectorChipStyle(selectedColumns.includes(column))}
                        onClick={() => toggleColumn(column)}
                      >
                        {prettyLabel(column)}
                      </button>
                    ))}
                  </div>
                </div>
                <label style={{ display: 'grid', gap: '4px' }}>
                  <span className="form-label" style={{ margin: 0 }}>Sort By</span>
                  <select className="form-input" value={sortKey} onChange={(event) => setSortKey(event.target.value)}>
                    {allColumns.map((column) => <option key={column} value={column}>{prettyLabel(column)}</option>)}
                  </select>
                </label>
                <label style={{ display: 'grid', gap: '4px' }}>
                  <span className="form-label" style={{ margin: 0 }}>Direction</span>
                  <select className="form-input" value={sortDirection} onChange={(event) => setSortDirection(event.target.value as SortDirection)}>
                    <option value="desc">Descending</option>
                    <option value="asc">Ascending</option>
                  </select>
                </label>
                <label style={{ display: 'grid', gap: '4px' }}>
                  <span className="form-label" style={{ margin: 0 }}>Rows Per Page</span>
                  <select className="form-input" value={pageSize} onChange={(event) => setPageSize(Number(event.target.value))}>
                    <option value={10}>10</option>
                    <option value={12}>12</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                  </select>
                </label>
              </div>

              <div className="table-container" style={{ overflowX: 'auto' }}>
                <table className="custom-table">
                  <thead>
                    <tr>
                      {(selectedColumns.length ? selectedColumns : allColumns).map((column) => (
                        <th key={column}>{prettyLabel(column)}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {!pagedRecords.length && (
                      <tr>
                        <td colSpan={Math.max(1, selectedColumns.length || allColumns.length)} style={{ textAlign: 'center', color: 'var(--text-secondary-dark)' }}>
                          No records found for the current filters.
                        </td>
                      </tr>
                    )}
                    {pagedRecords.map((record) => (
                      <tr key={record.id}>
                        {(selectedColumns.length ? selectedColumns : allColumns).map((column) => (
                          <td key={`${record.id}:${column}`}>{column.includes('at') || column.includes('date') ? formatDateCell(record[column]) : toText(record[column]) || '-'}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{ color: 'var(--text-secondary-dark)', fontSize: '0.82rem' }}>Page {safePage} of {totalPages}</span>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button type="button" className="btn btn-secondary" disabled={safePage <= 1} onClick={() => setPage((prev) => Math.max(1, prev - 1))}>Previous</button>
                  <button type="button" className="btn btn-secondary" disabled={safePage >= totalPages} onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}>Next</button>
                </div>
              </div>
            </div>
          )}

          {tab === 'pivot' && (
            <div className="glass-panel" style={{ padding: '16px', display: 'grid', gap: '12px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '10px' }}>
                <label style={{ display: 'grid', gap: '4px' }}>
                  <span className="form-label" style={{ margin: 0 }}>Row Dimension</span>
                  <select className="form-input" value={pivotRowDim} onChange={(event) => setPivotRowDim(event.target.value)}>
                    {dimensionKeys.map((key) => <option key={key} value={key}>{prettyLabel(key)}</option>)}
                  </select>
                </label>
                <label style={{ display: 'grid', gap: '4px' }}>
                  <span className="form-label" style={{ margin: 0 }}>Column Dimension</span>
                  <select className="form-input" value={pivotColDim} onChange={(event) => setPivotColDim(event.target.value)}>
                    {dimensionKeys.map((key) => <option key={key} value={key}>{prettyLabel(key)}</option>)}
                  </select>
                </label>
                <label style={{ display: 'grid', gap: '4px' }}>
                  <span className="form-label" style={{ margin: 0 }}>Measure</span>
                  <select className="form-input" value={pivotMeasure} onChange={(event) => setPivotMeasure(event.target.value)}>
                    <option value="__count">Record Count</option>
                    {measureKeys.map((key) => <option key={key} value={key}>{prettyLabel(key)}</option>)}
                  </select>
                </label>
                <label style={{ display: 'grid', gap: '4px' }}>
                  <span className="form-label" style={{ margin: 0 }}>Aggregation</span>
                  <select className="form-input" value={pivotAggregation} onChange={(event) => setPivotAggregation(event.target.value as Aggregation)}>
                    <option value="sum">Sum</option>
                    <option value="avg">Average</option>
                    <option value="min">Minimum</option>
                    <option value="max">Maximum</option>
                    <option value="count">Count</option>
                  </select>
                </label>
              </div>

              <div className="table-container" style={{ overflowX: 'auto' }}>
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>{prettyLabel(pivotRowDim)}</th>
                      {pivotMatrix.cols.map((col) => <th key={col}>{col}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {!pivotMatrix.matrix.length && (
                      <tr>
                        <td colSpan={Math.max(1, pivotMatrix.cols.length + 1)} style={{ textAlign: 'center', color: 'var(--text-secondary-dark)' }}>
                          No pivot output for current filters.
                        </td>
                      </tr>
                    )}
                    {pivotMatrix.matrix.map((row) => (
                      <tr key={row.rowKey}>
                        <td style={{ fontWeight: 700 }}>{row.rowKey}</td>
                        {pivotMatrix.cols.map((col) => (
                          <td key={`${row.rowKey}:${col}`}>{row.cells[col].toLocaleString('en-AE', { maximumFractionDigits: 2 })}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tab === 'graph' && (
            <div className="glass-panel" style={{ padding: '16px', display: 'grid', gap: '12px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '10px' }}>
                <label style={{ display: 'grid', gap: '4px' }}>
                  <span className="form-label" style={{ margin: 0 }}>Chart Type</span>
                  <select className="form-input" value={graphType} onChange={(event) => setGraphType(event.target.value as GraphType)}>
                    <option value="line">Line</option>
                    <option value="bar">Bar</option>
                    <option value="area">Area</option>
                    <option value="composed">Composed</option>
                    <option value="pie">Pie</option>
                    <option value="radar">Radar</option>
                  </select>
                </label>
                <label style={{ display: 'grid', gap: '4px' }}>
                  <span className="form-label" style={{ margin: 0 }}>X Axis</span>
                  <select className="form-input" value={graphXAxis} onChange={(event) => setGraphXAxis(event.target.value)}>
                    {dimensionKeys.map((key) => <option key={key} value={key}>{prettyLabel(key)}</option>)}
                  </select>
                </label>
                <label style={{ display: 'grid', gap: '4px' }}>
                  <span className="form-label" style={{ margin: 0 }}>Aggregation</span>
                  <select className="form-input" value={graphAggregation} onChange={(event) => setGraphAggregation(event.target.value as Aggregation)}>
                    <option value="sum">Sum</option>
                    <option value="avg">Average</option>
                    <option value="min">Minimum</option>
                    <option value="max">Maximum</option>
                    <option value="count">Count</option>
                  </select>
                </label>
                <div style={{ marginTop: '24px' }}>
                  <SwitchToggle
                    checked={graphStacked}
                    disabled={!supportsStacking}
                    onChange={setGraphStacked}
                    labelOn="Stack series enabled"
                    labelOff="Stack series disabled"
                  />
                </div>
              </div>

              <div>
                <div className="form-label" style={{ marginBottom: '6px' }}>Measures (up to 4)</div>
                <div style={{ display: 'grid', gap: '4px', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
                  {measureKeys.map((key) => (
                    <button
                      key={key}
                      type="button"
                      aria-pressed={graphMeasures.includes(key)}
                      style={selectorChipStyle(graphMeasures.includes(key))}
                      onClick={() => toggleGraphMeasure(key)}
                    >
                      {prettyLabel(key)}
                    </button>
                  ))}
                </div>
                {graphType === 'pie' && (
                  <div style={{ marginTop: '8px', color: 'var(--text-secondary-dark)', fontSize: '0.78rem' }}>
                    Pie chart uses the first selected measure.
                  </div>
                )}
              </div>

              <div style={{ height: '420px' }}>
                {!graphHasRenderableData ? (
                  <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary-dark)' }}>
                    No graph output for current selection.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    {graphType === 'line' ? (
                      <LineChart data={graphData.rows}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-dark)" />
                        <XAxis dataKey="x" tick={{ fill: 'var(--text-secondary-dark)', fontSize: 12 }} />
                        <YAxis tick={{ fill: 'var(--text-secondary-dark)', fontSize: 12 }} />
                        <Tooltip />
                        <Legend />
                        {graphData.activeMeasures.map((measure, index) => (
                          <Line
                            key={measure}
                            type="monotone"
                            dataKey={measure}
                            name={prettyLabel(measure)}
                            stroke={PALETTE[index % PALETTE.length]}
                            strokeWidth={2.2}
                            dot={{ r: 3 }}
                          />
                        ))}
                      </LineChart>
                    ) : graphType === 'bar' ? (
                      <BarChart data={graphData.rows}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-dark)" />
                        <XAxis dataKey="x" tick={{ fill: 'var(--text-secondary-dark)', fontSize: 12 }} />
                        <YAxis tick={{ fill: 'var(--text-secondary-dark)', fontSize: 12 }} />
                        <Tooltip />
                        <Legend />
                        {graphData.activeMeasures.map((measure, index) => (
                          <Bar
                            key={measure}
                            dataKey={measure}
                            name={prettyLabel(measure)}
                            fill={PALETTE[index % PALETTE.length]}
                            stackId={graphStacked ? 'stack' : undefined}
                            radius={[4, 4, 0, 0]}
                          />
                        ))}
                      </BarChart>
                    ) : graphType === 'area' ? (
                      <AreaChart data={graphData.rows}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-dark)" />
                        <XAxis dataKey="x" tick={{ fill: 'var(--text-secondary-dark)', fontSize: 12 }} />
                        <YAxis tick={{ fill: 'var(--text-secondary-dark)', fontSize: 12 }} />
                        <Tooltip />
                        <Legend />
                        {graphData.activeMeasures.map((measure, index) => (
                          <Area
                            key={measure}
                            type="monotone"
                            dataKey={measure}
                            name={prettyLabel(measure)}
                            stroke={PALETTE[index % PALETTE.length]}
                            fill={PALETTE[index % PALETTE.length]}
                            fillOpacity={0.2}
                            stackId={graphStacked ? 'stack' : undefined}
                          />
                        ))}
                      </AreaChart>
                    ) : graphType === 'composed' ? (
                      <ComposedChart data={graphData.rows}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-dark)" />
                        <XAxis dataKey="x" tick={{ fill: 'var(--text-secondary-dark)', fontSize: 12 }} />
                        <YAxis tick={{ fill: 'var(--text-secondary-dark)', fontSize: 12 }} />
                        <Tooltip />
                        <Legend />
                        {graphData.activeMeasures.map((measure, index) => (
                          index % 2 === 0 ? (
                            <Bar
                              key={measure}
                              dataKey={measure}
                              name={prettyLabel(measure)}
                              fill={PALETTE[index % PALETTE.length]}
                              stackId={graphStacked ? 'stack' : undefined}
                              radius={[4, 4, 0, 0]}
                            />
                          ) : (
                            <Line
                              key={measure}
                              type="monotone"
                              dataKey={measure}
                              name={prettyLabel(measure)}
                              stroke={PALETTE[index % PALETTE.length]}
                              strokeWidth={2.1}
                              dot={{ r: 3 }}
                            />
                          )
                        ))}
                      </ComposedChart>
                    ) : graphType === 'pie' ? (
                      <PieChart>
                        <Tooltip />
                        <Legend />
                        <Pie
                          data={pieData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={145}
                          innerRadius={55}
                          paddingAngle={2}
                          label
                        >
                          {pieData.map((entry, index) => (
                            <Cell key={`${entry.name}-${index}`} fill={PALETTE[index % PALETTE.length]} />
                          ))}
                        </Pie>
                      </PieChart>
                    ) : (
                      <RadarChart data={graphData.rows} outerRadius="70%">
                        <PolarGrid stroke="var(--border-dark)" />
                        <PolarAngleAxis dataKey="x" tick={{ fill: 'var(--text-secondary-dark)', fontSize: 12 }} />
                        <PolarRadiusAxis tick={{ fill: 'var(--text-secondary-dark)', fontSize: 11 }} />
                        <Tooltip />
                        <Legend />
                        {graphData.activeMeasures.map((measure, index) => (
                          <Radar
                            key={measure}
                            dataKey={measure}
                            name={prettyLabel(measure)}
                            stroke={PALETTE[index % PALETTE.length]}
                            fill={PALETTE[index % PALETTE.length]}
                            fillOpacity={0.16}
                          />
                        ))}
                      </RadarChart>
                    )}
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
