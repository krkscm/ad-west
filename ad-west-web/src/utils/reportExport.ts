import type { ReportMetricDefinitionApi, SreniReportApi, SreniReportParameterApi, SthanReportApi } from './backendApi';
import type { ExportFormat, TableExportData } from './tableExport';
import { buildScopedFilename, downloadTableExport, rowsFromRecords } from './tableExport';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export const sreniPeriodLabel = (
  submissionType: string,
  year: number,
  value: number,
): string => {
  if (submissionType === 'monthly') return `${MONTHS[value - 1]} ${year}`;
  if (submissionType === 'half_yearly') return `H${value} ${year}`;
  return String(year);
};

const buildSreniReportsExportData = (
  reports: SreniReportApi[],
  params: SreniReportParameterApi[],
  options: {
    entityName: string;
    submissionTypeLabel: string;
    scope: 'all' | 'single';
    periodLabel?: string;
  },
): TableExportData => {
  const sorted = [...reports].sort((a, b) =>
    b.periodYear - a.periodYear || b.periodValue - a.periodValue,
  );

  const paramHeaders = params.map((param) => param.name);
  const headers = [
    'Period',
    'Submission Type',
    'Submitted By',
    'Submitted At',
    'Notes',
    ...paramHeaders,
  ];
  const keys = [
    'period',
    'submissionType',
    'submittedBy',
    'submittedAt',
    'notes',
    ...params.map((param) => `param_${param.id}`),
  ];

  const records = sorted.map((report) => {
    const row: Record<string, string> = {
      period: sreniPeriodLabel(report.submissionType, report.periodYear, report.periodValue),
      submissionType: options.submissionTypeLabel,
      submittedBy: report.submittedBy ?? '',
      submittedAt: report.submittedAt ?? '',
      notes: report.notes ?? '',
    };
    params.forEach((param) => {
      row[`param_${param.id}`] = report.entries[param.id] ?? '';
    });
    return row;
  });

  const scopeLabel = options.scope === 'single' && options.periodLabel
    ? options.periodLabel
    : `All ${options.submissionTypeLabel} Reports`;

  return {
    title: `${options.entityName} Reports — ${scopeLabel}`,
    filenameBase: buildScopedFilename(options.entityName, 'reports', scopeLabel),
    headers,
    rows: rowsFromRecords(records, keys),
  };
};

const buildSthanReportsExportData = (
  reports: SthanReportApi[],
  metrics: ReportMetricDefinitionApi[],
  options: {
    entityName: string;
    scope: 'all' | 'single';
    periodLabel?: string;
  },
): TableExportData => {
  const sorted = [...reports].sort((a, b) =>
    b.periodYear - a.periodYear || b.periodMonth - a.periodMonth,
  );

  const metricHeaders = metrics.map((metric) => metric.name);
  const headers = [
    'Period',
    'Submitted By',
    'Submitted At',
    'Notes',
    ...metricHeaders,
  ];
  const keys = [
    'period',
    'submittedBy',
    'submittedAt',
    'notes',
    ...metrics.map((metric) => `metric_${metric.id}`),
  ];

  const records = sorted.map((report) => {
    const row: Record<string, string> = {
      period: `${MONTHS[report.periodMonth - 1]} ${report.periodYear}`,
      submittedBy: report.submittedBy ?? '',
      submittedAt: report.submittedAt ?? '',
      notes: report.notes ?? '',
    };
    metrics.forEach((metric) => {
      row[`metric_${metric.id}`] = report.entries[metric.id] ?? '';
    });
    return row;
  });

  const scopeLabel = options.scope === 'single' && options.periodLabel
    ? options.periodLabel
    : 'All Monthly Reports';

  return {
    title: `${options.entityName} Reports — ${scopeLabel}`,
    filenameBase: buildScopedFilename(options.entityName, 'reports', scopeLabel),
    headers,
    rows: rowsFromRecords(records, keys),
  };
};

export const exportSreniReports = (
  reports: SreniReportApi[],
  params: SreniReportParameterApi[],
  options: {
    entityName: string;
    submissionType: string;
    submissionTypeLabel: string;
    scope: 'all' | 'single';
    periodLabel?: string;
  },
  format: ExportFormat,
): void => {
  void downloadTableExport(buildSreniReportsExportData(reports, params, options), format);
};

export const exportSthanReports = (
  reports: SthanReportApi[],
  metrics: ReportMetricDefinitionApi[],
  options: {
    entityName: string;
    scope: 'all' | 'single';
    periodLabel?: string;
  },
  format: ExportFormat,
): void => {
  void downloadTableExport(buildSthanReportsExportData(reports, metrics, options), format);
};

/** @deprecated Use exportSreniReports with format */
export const exportSreniReportsCsv = (
  reports: SreniReportApi[],
  params: SreniReportParameterApi[],
  options: Parameters<typeof exportSreniReports>[2],
): void => exportSreniReports(reports, params, options, 'csv');

/** @deprecated Use exportSthanReports with format */
export const exportSthanReportsCsv = (
  reports: SthanReportApi[],
  metrics: ReportMetricDefinitionApi[],
  options: Parameters<typeof exportSthanReports>[2],
): void => exportSthanReports(reports, metrics, options, 'csv');
