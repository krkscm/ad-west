import type { CalendarEventApi, LocationDefinitionApi, SthanCalendarEventApi } from './backendApi';
import type { ExportFormat, TableExportData } from './tableExport';
import { buildScopedFilename, downloadTableExport, rowsFromRecords } from './tableExport';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export const filterSreniEventsForMonth = (
  events: CalendarEventApi[],
  year: number,
  month: number,
): CalendarEventApi[] =>
  events.filter((event) => {
    const date = new Date(event.date);
    return date.getFullYear() === year && date.getMonth() === month;
  });

export const filterSthanEventsForMonth = (
  events: SthanCalendarEventApi[],
  year: number,
  month: number,
): SthanCalendarEventApi[] =>
  events.filter((event) => {
    const date = new Date(event.date);
    return date.getFullYear() === year && date.getMonth() === month;
  });

const sreniCalendarHeaders = [
  'Date',
  'Title',
  'Start Time',
  'End Time',
  'Scope',
  'Sthans',
  'Notes',
  'Created By',
  'Created At',
];

const sreniCalendarKeys = [
  'date',
  'title',
  'startTime',
  'endTime',
  'scope',
  'sthans',
  'notes',
  'createdBy',
  'createdAt',
];

const buildSreniCalendarExportData = (
  events: CalendarEventApi[],
  options: {
    entityName: string;
    year: number;
    month: number;
    scope: 'month' | 'all';
    sthanById: Map<string, LocationDefinitionApi>;
  },
): TableExportData => {
  const sorted = [...events].sort((a, b) =>
    a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime),
  );

  const records = sorted.map((event) => ({
    date: event.date,
    title: event.title,
    startTime: event.startTime,
    endTime: event.endTime,
    scope: event.scope ?? (event.kind === 'special_event' ? 'special' : ''),
    sthans: event.scope === 'sthan'
      ? (event.sthanIds ?? []).map((id) => options.sthanById.get(id)?.name ?? id).join('; ')
      : '',
    notes: event.notes ?? '',
    createdBy: event.createdBy,
    createdAt: event.createdAt,
  }));

  const monthLabel = `${MONTH_NAMES[options.month]} ${options.year}`;
  const scopeLabel = options.scope === 'month' ? monthLabel : 'All Events';

  return {
    title: `${options.entityName} Calendar — ${scopeLabel}`,
    filenameBase: buildScopedFilename(options.entityName, 'calendar', scopeLabel),
    headers: sreniCalendarHeaders,
    rows: rowsFromRecords(records, sreniCalendarKeys),
  };
};

const sthanCalendarHeaders = [
  'Date',
  'Title',
  'Start Time',
  'End Time',
  'Source',
  'Scope',
  'Notes',
  'Created By',
  'Created At',
];

const sthanCalendarKeys = [
  'date',
  'title',
  'startTime',
  'endTime',
  'source',
  'scope',
  'notes',
  'createdBy',
  'createdAt',
];

const buildSthanCalendarExportData = (
  events: SthanCalendarEventApi[],
  options: {
    entityName: string;
    year: number;
    month: number;
    scope: 'month' | 'all';
  },
): TableExportData => {
  const sorted = [...events].sort((a, b) =>
    a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime),
  );

  const records = sorted.map((event) => ({
    date: event.date,
    title: event.title,
    startTime: event.startTime,
    endTime: event.endTime,
    source: event.source === 'sreni' ? 'Sreni (synced)' : 'Local',
    scope: event.scope ?? '',
    notes: event.notes ?? '',
    createdBy: event.createdBy,
    createdAt: event.createdAt,
  }));

  const monthLabel = `${MONTH_NAMES[options.month]} ${options.year}`;
  const scopeLabel = options.scope === 'month' ? monthLabel : 'All Events';

  return {
    title: `${options.entityName} Calendar — ${scopeLabel}`,
    filenameBase: buildScopedFilename(options.entityName, 'calendar', scopeLabel),
    headers: sthanCalendarHeaders,
    rows: rowsFromRecords(records, sthanCalendarKeys),
  };
};

export const exportSreniCalendar = (
  events: CalendarEventApi[],
  options: {
    entityName: string;
    year: number;
    month: number;
    scope: 'month' | 'all';
    sthanById: Map<string, LocationDefinitionApi>;
  },
  format: ExportFormat,
): void => {
  void downloadTableExport(buildSreniCalendarExportData(events, options), format);
};

export const exportSthanCalendar = (
  events: SthanCalendarEventApi[],
  options: {
    entityName: string;
    year: number;
    month: number;
    scope: 'month' | 'all';
  },
  format: ExportFormat,
): void => {
  void downloadTableExport(buildSthanCalendarExportData(events, options), format);
};

/** @deprecated Use exportSreniCalendar with format */
export const exportSreniCalendarCsv = (
  events: CalendarEventApi[],
  options: Parameters<typeof exportSreniCalendar>[1],
): void => exportSreniCalendar(events, options, 'csv');

/** @deprecated Use exportSthanCalendar with format */
export const exportSthanCalendarCsv = (
  events: SthanCalendarEventApi[],
  options: Parameters<typeof exportSthanCalendar>[1],
): void => exportSthanCalendar(events, options, 'csv');
