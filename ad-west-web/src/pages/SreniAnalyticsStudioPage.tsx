import React, { useEffect, useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';
import { backendApi } from '../utils/backendApi';
import type {
  AnalyticsStudioLayoutApi,
  CalendarEventApi,
  SreniAttendanceListingItemApi,
  SreniContactRowApi,
  SreniParticipantApi,
} from '../utils/backendApi';
import { useToast } from '../components/common/Toast';
import { useConfirm } from '../components/common/ConfirmDialog';
import { PageHeader } from '../components/common/PageHeader';
import { SwitchToggle } from '../components/common/SwitchToggle';
import { DateField } from '../components/common/DateFields';
import { TableLayoutModal } from '../components/common/TableLayoutModal';
import { PAGE_SIZE_OPTIONS, PaginationBar } from '../components/common/PaginationBar';
import { ColumnItem, buildColumnItems, useTableLayout } from '../hooks/useTableLayout';

interface Props {
  sreniId: string;
  sreniName: string;
}

type StudioTab = 'details' | 'pivot' | 'graph';
type DatasetKey = 'all' | 'contacts' | 'participants' | 'events' | 'attendance';
type SortDirection = 'asc' | 'desc';
type Aggregation = 'sum' | 'avg' | 'min' | 'max' | 'count';
type GraphType = 'line' | 'bar' | 'area' | 'composed' | 'pie' | 'radar';
type SavedLayoutType = 'details' | 'pivot';

type ScalarValue = string | number | boolean | null | undefined;
type StudioRecord = Record<string, ScalarValue> & { id: string };
type SharedLayoutConfig = {
  dataset?: DatasetKey;
  searchText?: string;
  dateFrom?: string;
  dateTo?: string;
};
type DetailsLayoutConfig = SharedLayoutConfig & {
  selectedColumns?: string[];
  sortKey?: string;
  sortDirection?: SortDirection;
  pageSize?: number;
};
type PivotLayoutConfig = SharedLayoutConfig & {
  pivotRowDim?: string;
  pivotColDim?: string;
  pivotMeasure?: string;
  pivotAggregation?: Aggregation;
};

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
  { key: 'contacts', label: 'Family contacts' },
  { key: 'participants', label: 'Participants' },
  { key: 'events', label: 'Events' },
  { key: 'attendance', label: 'Attendance' },
];

const savedLayoutPanelStyle: React.CSSProperties = {
  display: 'grid',
  gap: '12px',
  padding: '14px',
  border: '1px solid var(--border-dark)',
  borderRadius: '12px',
  background: 'var(--surface-dark-elevated)',
};

const savedLayoutButtonRowStyle: React.CSSProperties = {
  display: 'flex',
  gap: '8px',
  flexWrap: 'wrap',
};

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

const isDatasetKey = (value: unknown): value is DatasetKey =>
  value === 'all' || value === 'contacts' || value === 'participants' || value === 'events' || value === 'attendance';

const isSortDirection = (value: unknown): value is SortDirection => value === 'asc' || value === 'desc';

const isAggregation = (value: unknown): value is Aggregation =>
  value === 'sum' || value === 'avg' || value === 'min' || value === 'max' || value === 'count';

const toText = (value: ScalarValue): string => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return String(value);
};

const tryParseDateMs = (value: ScalarValue): number | null => {
  if (!value || typeof value !== 'string') return null;
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : null;
};

const csvEscape = (value: ScalarValue): string => {
  const text = toText(value);
  if (text.includes(',') || text.includes('"') || text.includes('\n')) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
};

const formatDateCell = (value: ScalarValue): string => {
  if (!value) return '-';
  const ms = tryParseDateMs(String(value));
  if (ms === null) return String(value);
  return new Date(ms).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

const aggregateValues = (values: number[], aggregation: Aggregation): number => {
  if (!values.length) return 0;
  if (aggregation === 'count') return values.length;
  if (aggregation === 'sum' || aggregation === 'avg') {
    const sum = values.reduce((acc, v) => acc + v, 0);
    return aggregation === 'avg' ? sum / values.length : sum;
  }
  if (aggregation === 'min') return Math.min(...values);
  return Math.max(...values);
};

const toIsoFromEvent = (event: CalendarEventApi): string => {
  if (!event.date) return event.updatedAt ?? '';
  const time = event.startTime ? `T${event.startTime}:00` : 'T00:00:00';
  return `${event.date}${time}`;
};

const durationMinutes = (startTime: string | null | undefined, endTime: string | null | undefined): number | null => {
  if (!startTime || !endTime) return null;
  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);
  if ([sh, sm, eh, em].some(isNaN)) return null;
  const diff = (eh * 60 + em) - (sh * 60 + sm);
  return diff >= 0 ? diff : diff + 24 * 60;
};

const loadAllParticipants = async (sreniId: string): Promise<SreniParticipantApi[]> => {
  const pageSize = 500;
  const first = await backendApi.listSreniParticipants(sreniId, 1, pageSize);
  const pages: SreniParticipantApi[][] = [first.items];
  for (let p = 2; p <= first.totalPages; p++) {
    const next = await backendApi.listSreniParticipants(sreniId, p, pageSize);
    pages.push(next.items);
  }
  return pages.flat();
};

const loadAllContacts = async (sreniId: string): Promise<SreniContactRowApi[]> => {
  const pageSize = 200;
  const first = await backendApi.listSreniContacts(sreniId, 1, pageSize);
  const pages: SreniContactRowApi[][] = [first.items];
  for (let p = 2; p <= first.totalPages; p++) {
    const next = await backendApi.listSreniContacts(sreniId, p, pageSize);
    pages.push(next.items);
  }
  return pages.flat();
};

const mergeSavedLayout = (
  current: AnalyticsStudioLayoutApi[],
  saved: AnalyticsStudioLayoutApi,
): AnalyticsStudioLayoutApi[] => {
  const next = [saved, ...current.filter((layout) => layout.id !== saved.id)];
  next.sort((left, right) => {
    const updatedDelta = Date.parse(right.updatedAt) - Date.parse(left.updatedAt);
    if (updatedDelta !== 0) return updatedDelta;
    return left.name.localeCompare(right.name);
  });
  return next;
};

export const SreniAnalyticsStudioPage: React.FC<Props> = ({ sreniId, sreniName }) => {
  const { addToast } = useToast();
  const confirm = useConfirm();
  const [detailLayoutEnabled, setDetailLayoutEnabled] = useState(false);
  const detailTableLayout = useTableLayout(`sreni-analytics-details-${sreniId}`, { enabled: detailLayoutEnabled });

  const [tab, setTab] = useState<StudioTab>('details');
  const [loading, setLoading] = useState(false);
  const [layoutsLoading, setLayoutsLoading] = useState(false);
  const [savingLayoutType, setSavingLayoutType] = useState<SavedLayoutType | null>(null);
  const [deletingLayoutId, setDeletingLayoutId] = useState<string | null>(null);

  const [contacts, setContacts] = useState<SreniContactRowApi[]>([]);
  const [participants, setParticipants] = useState<SreniParticipantApi[]>([]);
  const [events, setEvents] = useState<CalendarEventApi[]>([]);
  const [attendance, setAttendance] = useState<SreniAttendanceListingItemApi[]>([]);

  const [detailsLayouts, setDetailsLayouts] = useState<AnalyticsStudioLayoutApi[]>([]);
  const [pivotLayouts, setPivotLayouts] = useState<AnalyticsStudioLayoutApi[]>([]);
  const [selectedDetailsLayoutId, setSelectedDetailsLayoutId] = useState('');
  const [selectedPivotLayoutId, setSelectedPivotLayoutId] = useState('');
  const [detailsLayoutName, setDetailsLayoutName] = useState('');
  const [pivotLayoutName, setPivotLayoutName] = useState('');

  const [dataset, setDataset] = useState<DatasetKey>('all');
  const [searchText, setSearchText] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [sortKey, setSortKey] = useState('recorded_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [pivotRowDim, setPivotRowDim] = useState('domain');
  const [pivotColDim, setPivotColDim] = useState('period_bucket');
  const [pivotMeasure, setPivotMeasure] = useState('__count');
  const [pivotAggregation, setPivotAggregation] = useState<Aggregation>('sum');

  const [graphType, setGraphType] = useState<GraphType>('line');
  const [graphXAxis, setGraphXAxis] = useState('period_bucket');
  const [graphMeasures, setGraphMeasures] = useState<string[]>([]);
  const [graphAggregation, setGraphAggregation] = useState<Aggregation>('sum');
  const [graphStacked, setGraphStacked] = useState(false);
  const [showTableLayoutModal, setShowTableLayoutModal] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      setLayoutsLoading(true);
      const [detailsResult, pivotResult] = await Promise.allSettled([
        backendApi.listAnalyticsStudioLayouts(sreniId, 'details'),
        backendApi.listAnalyticsStudioLayouts(sreniId, 'pivot'),
      ]);

      if (cancelled) return;

      if (detailsResult.status === 'fulfilled') {
        setDetailsLayouts(detailsResult.value);
      } else {
        setDetailsLayouts([]);
        addToast('Could not load saved detail layouts.', 'warning');
      }

      if (pivotResult.status === 'fulfilled') {
        setPivotLayouts(pivotResult.value);
      } else {
        setPivotLayouts([]);
        addToast('Could not load saved pivot layouts.', 'warning');
      }

      setSelectedDetailsLayoutId('');
      setSelectedPivotLayoutId('');
      setDetailsLayoutName('');
      setPivotLayoutName('');
      setLayoutsLoading(false);
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [sreniId, addToast]);

  useEffect(() => {
    if (tab === 'details' && contacts.length > 0) {
      setDetailLayoutEnabled(true);
    }
  }, [tab, contacts.length]);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      setLoading(true);
      const [contactsResult, participantsResult, eventsResult, attendanceResult] = await Promise.allSettled([
        loadAllContacts(sreniId),
        loadAllParticipants(sreniId),
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

      if (participantsResult.status === 'fulfilled') {
        setParticipants(participantsResult.value);
      } else {
        setParticipants([]);
        addToast('Could not load participants for analytics.', 'warning');
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

  const participantRecords = useMemo<StudioRecord[]>(() => {
    return participants.map((row) => ({
      id: `participant:${row.memberId ?? row.contactId}:${row.name}`,
      domain: 'participants',
      period_bucket: String(new Date().getFullYear()),
      recorded_at: new Date().toISOString(),
      participant_name: row.name,
      participant_role: row.role,
      participant_phone: row.phone ?? '',
      household_name: row.householdName ?? '',
      household_phone: row.householdPhone ?? '',
      uses_household_phone: row.usesHouseholdPhone ? 1 : 0,
      division_name: row.divisionName ?? '',
      gender: row.gender ?? '',
      date_of_birth: row.dateOfBirth ?? '',
      contact_id: row.contactId,
    }));
  }, [participants]);

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
      participants: participantRecords,
      events: eventRecords,
      attendance: attendanceRecords,
      all: [...contactRecords, ...participantRecords, ...eventRecords, ...attendanceRecords],
    } as Record<DatasetKey, StudioRecord[]>;
  }, [contactRecords, participantRecords, eventRecords, attendanceRecords]);

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

  const detailColumnDefs = useMemo(
    () => allColumns.map((key) => ({ key, label: prettyLabel(key) })),
    [allColumns],
  );

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

  useEffect(() => {
    if (!allColumns.length) return;
    if (!detailTableLayout.activeId) return;

    const active = detailTableLayout.layouts.find((layout) => layout.id === detailTableLayout.activeId);
    if (!active) return;

    const cols = buildColumnItems(detailColumnDefs, active.columns)
      .filter((item) => item.visible)
      .map((item) => item.key)
      .filter((key) => allColumns.includes(key));

    if (!cols.length) return;

    setSelectedColumns((prev) => {
      if (prev.length === cols.length && prev.every((value, index) => value === cols[index])) return prev;
      return cols;
    });
  }, [allColumns, detailColumnDefs, detailTableLayout.activeId, detailTableLayout.layouts]);

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

  const applySharedLayoutConfig = (config: SharedLayoutConfig) => {
    if (isDatasetKey(config.dataset)) setDataset(config.dataset);
    if (typeof config.searchText === 'string') setSearchText(config.searchText);
    if (typeof config.dateFrom === 'string') setDateFrom(config.dateFrom);
    if (typeof config.dateTo === 'string') setDateTo(config.dateTo);
    setPage(1);
  };

  const buildDetailsLayoutConfig = (): DetailsLayoutConfig => ({
    dataset,
    searchText,
    dateFrom,
    dateTo,
    selectedColumns,
    sortKey,
    sortDirection,
    pageSize,
  });

  const buildPivotLayoutConfig = (): PivotLayoutConfig => ({
    dataset,
    searchText,
    dateFrom,
    dateTo,
    pivotRowDim,
    pivotColDim,
    pivotMeasure,
    pivotAggregation,
  });

  const applyDetailsLayout = (layout: AnalyticsStudioLayoutApi) => {
    const config = layout.config as DetailsLayoutConfig;
    applySharedLayoutConfig(config);
    if (Array.isArray(config.selectedColumns)) {
      setSelectedColumns(config.selectedColumns.filter((value): value is string => typeof value === 'string'));
    }
    if (typeof config.sortKey === 'string') setSortKey(config.sortKey);
    if (isSortDirection(config.sortDirection)) setSortDirection(config.sortDirection);
    if (typeof config.pageSize === 'number' && PAGE_SIZE_OPTIONS.includes(config.pageSize)) {
      setPageSize(config.pageSize);
    }
    setSelectedDetailsLayoutId(layout.id);
    setDetailsLayoutName(layout.name);
    setTab('details');
  };

  const applyPivotLayout = (layout: AnalyticsStudioLayoutApi) => {
    const config = layout.config as PivotLayoutConfig;
    applySharedLayoutConfig(config);
    if (typeof config.pivotRowDim === 'string') setPivotRowDim(config.pivotRowDim);
    if (typeof config.pivotColDim === 'string') setPivotColDim(config.pivotColDim);
    if (typeof config.pivotMeasure === 'string') setPivotMeasure(config.pivotMeasure);
    if (isAggregation(config.pivotAggregation)) setPivotAggregation(config.pivotAggregation);
    setSelectedPivotLayoutId(layout.id);
    setPivotLayoutName(layout.name);
    setTab('pivot');
  };

  const handleSaveLayout = async (layoutType: SavedLayoutType) => {
    const name = (layoutType === 'details' ? detailsLayoutName : pivotLayoutName).trim();
    if (!name) {
      addToast('Layout name is required.', 'warning');
      return;
    }

    setSavingLayoutType(layoutType);
    try {
      const saved = await backendApi.saveAnalyticsStudioLayout(sreniId, {
        layoutType,
        name,
        config: layoutType === 'details' ? buildDetailsLayoutConfig() : buildPivotLayoutConfig(),
      });

      if (layoutType === 'details') {
        setDetailsLayouts((current) => mergeSavedLayout(current, saved));
        setSelectedDetailsLayoutId(saved.id);
        setDetailsLayoutName(saved.name);
      } else {
        setPivotLayouts((current) => mergeSavedLayout(current, saved));
        setSelectedPivotLayoutId(saved.id);
        setPivotLayoutName(saved.name);
      }

      addToast(`${layoutType === 'details' ? 'Detail' : 'Pivot'} layout saved to DB.`, 'success');
    } catch (error) {
      addToast(`Could not save ${layoutType} layout.`, 'error');
    } finally {
      setSavingLayoutType(null);
    }
  };

  const handleDeleteLayout = async (layoutType: SavedLayoutType) => {
    const selectedId = layoutType === 'details' ? selectedDetailsLayoutId : selectedPivotLayoutId;
    const layouts = layoutType === 'details' ? detailsLayouts : pivotLayouts;
    const selected = layouts.find((layout) => layout.id === selectedId);

    if (!selected) {
      addToast('Choose a saved layout first.', 'warning');
      return;
    }

    const ok = await confirm({
      title: 'Delete Saved Layout',
      message: `Delete the saved ${layoutType} layout "${selected.name}"?`,
      confirmLabel: 'Delete',
      danger: true,
    });
    if (!ok) return;

    setDeletingLayoutId(selected.id);
    try {
      await backendApi.deleteAnalyticsStudioLayout(sreniId, selected.id);
      if (layoutType === 'details') {
        setDetailsLayouts((current) => current.filter((layout) => layout.id !== selected.id));
        setSelectedDetailsLayoutId('');
        setDetailsLayoutName('');
      } else {
        setPivotLayouts((current) => current.filter((layout) => layout.id !== selected.id));
        setSelectedPivotLayoutId('');
        setPivotLayoutName('');
      }
      addToast('Saved layout deleted.', 'success');
    } catch {
      addToast('Could not delete saved layout.', 'error');
    } finally {
      setDeletingLayoutId(null);
    }
  };

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

  const applyColumnsFromColumnItems = (cols: ColumnItem[]) => {
    const next = cols.filter((item) => item.visible).map((item) => item.key).filter((key) => allColumns.includes(key));
    setSelectedColumns(next.length ? next : allColumns);
    setPage(1);
  };

  const handleCreateTableLayout = async (name: string, cols: ColumnItem[]) => {
    const created = await detailTableLayout.createLayout(name, cols);
    applyColumnsFromColumnItems(cols);
    return created;
  };

  const handleUpdateTableLayout = async (id: string, cols: ColumnItem[], name?: string) => {
    const updated = await detailTableLayout.updateLayout(id, cols, name);
    applyColumnsFromColumnItems(cols);
    return updated;
  };

  const handleActivateTableLayout = async (id: string | null) => {
    await detailTableLayout.activateLayout(id);
    if (!id) {
      setSelectedColumns(allColumns);
      setPage(1);
      return;
    }
    const active = detailTableLayout.layouts.find((layout) => layout.id === id);
    const cols = buildColumnItems(detailColumnDefs, active?.columns ?? null);
    applyColumnsFromColumnItems(cols);
  };

  return (
    <div className="animate-slide-up" style={{ display: 'grid', gap: '16px' }}>
      <TableLayoutModal
        isOpen={showTableLayoutModal}
        onClose={() => setShowTableLayoutModal(false)}
        tableTitle={`${sreniName} Analytics Detail Table`}
        allColumns={detailColumnDefs}
        layouts={detailTableLayout.layouts}
        activeId={detailTableLayout.activeId}
        onActivate={handleActivateTableLayout}
        onCreate={handleCreateTableLayout}
        onUpdate={handleUpdateTableLayout}
        onDelete={detailTableLayout.deleteLayout}
      />
      <PageHeader
        icon="📈"
        title={`${sreniName} — Analytics Studio`}
        subtitle="Domain analytics for contacts, events, attendance, and operational performance."
        stats={[
          { label: 'Rows', value: filteredRecords.length, variant: 'info' },
          { label: 'Numeric measures', value: measureKeys.length, variant: 'success' },
        ]}
        actions={
          <button type="button" className="btn btn-secondary btn-sm" onClick={exportCsv} disabled={!sortedRecords.length}>
            Export CSV
          </button>
        }
      />

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

      <div className="btn-group" style={{ flexWrap: 'wrap' }}>
        <button type="button" className={`btn btn-sm ${tab === 'details' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTab('details')}>Detailed Reports</button>
        <button type="button" className={`btn btn-sm ${tab === 'pivot' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTab('pivot')}>Pivot Studio</button>
        <button type="button" className={`btn btn-sm ${tab === 'graph' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTab('graph')}>Graph Studio</button>
      </div>

      {loading ? (
        <div className="glass-panel" style={{ padding: '48px 16px', textAlign: 'center', color: 'var(--text-secondary-dark)' }}>
          Loading analytics data...
        </div>
      ) : (
        <>
          {tab === 'details' && (
            <div className="glass-panel" style={{ padding: '16px', display: 'grid', gap: '12px' }}>
              <div style={savedLayoutPanelStyle}>
                <div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary-dark)' }}>Saved Detail Layouts</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary-dark)', marginTop: '2px' }}>
                    Save your current filters and column choices as reusable detail presets.
                  </div>
                </div>

                <div style={{ display: 'grid', gap: '10px', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
                  <label style={{ display: 'grid', gap: '4px' }}>
                    <span className="form-label" style={{ margin: 0 }}>Layout Name</span>
                    <input
                      className="form-input"
                      value={detailsLayoutName}
                      onChange={(event) => setDetailsLayoutName(event.target.value)}
                      placeholder="e.g. Attendance overview"
                    />
                  </label>
                  <label style={{ display: 'grid', gap: '4px' }}>
                    <span className="form-label" style={{ margin: 0 }}>Saved Layouts</span>
                    <select
                      className="form-input"
                      value={selectedDetailsLayoutId}
                      onChange={(event) => {
                        const nextId = event.target.value;
                        setSelectedDetailsLayoutId(nextId);
                        const layout = detailsLayouts.find((item) => item.id === nextId);
                        if (layout) setDetailsLayoutName(layout.name);
                      }}
                    >
                      <option value="">Select a saved layout</option>
                      {detailsLayouts.map((layout) => (
                        <option key={layout.id} value={layout.id}>{layout.name}</option>
                      ))}
                    </select>
                  </label>
                </div>

                <div style={savedLayoutButtonRowStyle}>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => {
                      const layout = detailsLayouts.find((item) => item.id === selectedDetailsLayoutId);
                      if (!layout) {
                        addToast('Choose a saved detail layout first.', 'warning');
                        return;
                      }
                      applyDetailsLayout(layout);
                    }}
                    disabled={!selectedDetailsLayoutId || layoutsLoading}
                  >
                    Load Layout
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={() => void handleSaveLayout('details')}
                    disabled={savingLayoutType === 'details'}
                  >
                    {savingLayoutType === 'details'
                      ? (selectedDetailsLayoutId ? 'Updating…' : 'Creating…')
                      : (selectedDetailsLayoutId ? 'Update Layout' : 'Create Layout')}
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger-outline btn-sm"
                    onClick={() => void handleDeleteLayout('details')}
                    disabled={!selectedDetailsLayoutId || deletingLayoutId === selectedDetailsLayoutId}
                  >
                    Delete
                  </button>
                </div>
              </div>

              <div style={{ display: 'grid', gap: '10px', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
                <div style={{ gridColumn: '1 / -1' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
                    <div className="form-label" style={{ margin: 0 }}>Visible Columns</div>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => setShowTableLayoutModal(true)}
                    >
                      Table Customization
                      {detailTableLayout.activeLayoutName ? `: ${detailTableLayout.activeLayoutName}` : ''}
                    </button>
                  </div>
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

              <PaginationBar
                page={safePage}
                totalPages={totalPages}
                totalItems={sortedRecords.length}
                pageSize={pageSize}
                onPageChange={setPage}
                onPageSizeChange={(ps) => { setPageSize(ps); setPage(1); }}
              />
            </div>
          )}

          {tab === 'pivot' && (
            <div className="glass-panel" style={{ padding: '16px', display: 'grid', gap: '12px' }}>
              <div style={savedLayoutPanelStyle}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'baseline', flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>Saved layouts</div>
                    <div style={{ color: 'var(--text-secondary-dark)', fontSize: '0.78rem' }}>
                      Reuse pivot setups for this Sreni. Stored per admin in DB.
                    </div>
                  </div>
                  <span style={{ color: 'var(--text-secondary-dark)', fontSize: '0.78rem' }}>
                    {pivotLayouts.length} saved
                  </span>
                </div>

                <div style={{ display: 'grid', gap: '10px', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
                  <label style={{ display: 'grid', gap: '4px' }}>
                    <span className="form-label" style={{ margin: 0 }}>Layout Name</span>
                    <input
                      className="form-input"
                      value={pivotLayoutName}
                      onChange={(event) => setPivotLayoutName(event.target.value)}
                      placeholder="Events by month"
                    />
                  </label>
                  <label style={{ display: 'grid', gap: '4px' }}>
                    <span className="form-label" style={{ margin: 0 }}>Saved Layouts</span>
                    <select
                      className="form-input"
                      value={selectedPivotLayoutId}
                      onChange={(event) => {
                        const nextId = event.target.value;
                        setSelectedPivotLayoutId(nextId);
                        const layout = pivotLayouts.find((item) => item.id === nextId);
                        if (layout) setPivotLayoutName(layout.name);
                      }}
                    >
                      <option value="">Select a saved layout</option>
                      {pivotLayouts.map((layout) => (
                        <option key={layout.id} value={layout.id}>{layout.name}</option>
                      ))}
                    </select>
                  </label>
                </div>

                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={() => void handleSaveLayout('pivot')}
                    disabled={savingLayoutType === 'pivot'}
                  >
                    {savingLayoutType === 'pivot'
                      ? (selectedPivotLayoutId ? 'Updating…' : 'Creating…')
                      : (selectedPivotLayoutId ? 'Update Layout' : 'Create Layout')}
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => {
                      const layout = pivotLayouts.find((item) => item.id === selectedPivotLayoutId);
                      if (!layout) {
                        addToast('Choose a saved pivot layout first.', 'warning');
                        return;
                      }
                      applyPivotLayout(layout);
                    }}
                    disabled={!selectedPivotLayoutId || layoutsLoading}
                  >
                    Load
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger-outline btn-sm"
                    onClick={() => void handleDeleteLayout('pivot')}
                    disabled={!selectedPivotLayoutId || deletingLayoutId === selectedPivotLayoutId}
                  >
                    Delete
                  </button>
                </div>
              </div>

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
