export type CsvRow = Record<string, string | number | boolean | null | undefined>;

const escapeCsvCell = (value: string | number | boolean | null | undefined): string => {
  if (value === null || value === undefined) return '';
  const text = String(value);
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
};

export const buildCsv = (headers: string[], rows: CsvRow[], columnKeys: string[]): string => {
  const headerLine = headers.map(escapeCsvCell).join(',');
  const dataLines = rows.map((row) =>
    columnKeys.map((key) => escapeCsvCell(row[key])).join(','),
  );
  return [headerLine, ...dataLines].join('\r\n');
};

export const downloadCsv = (filename: string, csvContent: string): void => {
  const blob = new Blob(['\uFEFF', csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  link.click();
  URL.revokeObjectURL(url);
};

export const slugifyFilename = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'export';
