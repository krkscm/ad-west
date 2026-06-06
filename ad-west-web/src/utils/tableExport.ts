import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { buildCsv, downloadCsv, slugifyFilename } from './csvExport';

export type ExportFormat = 'csv' | 'xlsx' | 'pdf';

export interface TableExportData {
  title: string;
  filenameBase: string;
  headers: string[];
  rows: string[][];
}

export const formatLabels: Record<ExportFormat, string> = {
  csv: 'CSV',
  xlsx: 'Excel',
  pdf: 'PDF',
};

export const cellValue = (value: string | number | boolean | null | undefined): string => {
  if (value === null || value === undefined) return '';
  return String(value);
};

export const rowsFromRecords = (
  records: Array<Record<string, string | number | boolean | null | undefined>>,
  keys: string[],
): string[][] =>
  records.map((record) => keys.map((key) => cellValue(record[key])));

export const downloadTableExport = async (
  data: TableExportData,
  format: ExportFormat,
): Promise<void> => {
  const filenameBase = slugifyFilename(data.filenameBase);

  if (format === 'csv') {
    const columnKeys = data.headers.map((_, index) => `col_${index}`);
    const csvRows = data.rows.map((row) =>
      Object.fromEntries(row.map((cell, index) => [`col_${index}`, cell])),
    );
    downloadCsv(`${filenameBase}.csv`, buildCsv(data.headers, csvRows, columnKeys));
    return;
  }

  if (format === 'xlsx') {
    const worksheet = XLSX.utils.aoa_to_sheet([data.headers, ...data.rows]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Export');
    XLSX.writeFile(workbook, `${filenameBase}.xlsx`);
    return;
  }

  const doc = new jsPDF({ orientation: data.headers.length > 6 ? 'landscape' : 'portrait', unit: 'pt' });
  doc.setFontSize(14);
  doc.text(data.title, 40, 36);
  autoTable(doc, {
    head: [data.headers],
    body: data.rows,
    startY: 52,
    styles: { fontSize: 9, cellPadding: 4 },
    headStyles: { fillColor: [79, 70, 229] },
    margin: { left: 40, right: 40 },
  });
  doc.save(`${filenameBase}.pdf`);
};

export const buildScopedFilename = (
  entityName: string,
  kind: string,
  scopeLabel: string,
): string => `${slugifyFilename(entityName)}-${kind}-${slugifyFilename(scopeLabel)}`;
