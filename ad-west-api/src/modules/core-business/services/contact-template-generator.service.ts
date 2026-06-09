import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import ExcelJS from 'exceljs';
import * as fs from 'fs';
import * as path from 'path';
import {
  MEMBER_CONTACT_EXCEL_DATA_START_ROW_INDEX,
  MEMBER_CONTACT_EXCEL_HEADER_ROW_INDEX,
  MEMBER_CONTACT_EXCEL_HINT_ROW_INDEX,
  MEMBER_CONTACT_SECTION_COLORS,
  MEMBER_CONTACT_SECTION_LABELS,
  MEMBER_CONTACT_SECTION_ROW_INDEX,
  MEMBER_CONTACT_YES_NO,
  MEMBER_DATA_SHEET_NAME,
  VALID_VALUES_SHEET_NAME,
  buildMemberContactColumnLayout,
  type MemberContactColumnDef,
  type MemberContactFieldSection,
  type SreniExcelColumn,
} from './member-contact-template.constants';

type EnumRow = { value: string; label: string };

const REFERENCE_TEMPLATE_FILE = 'Member_Data_Upload_Template.xlsx';

const SECTION_FONT_COLOR = 'FFFFFFFF';
const HEADER_FONT_COLOR = 'FF1F4E79';
const HINT_FONT_COLOR = 'FF808080';
const HINT_ROW_FILL = 'FFF7F7F7';
const SAMPLE_ROW_FILL = 'FFFAFAFA';

const HEADER_BORDER: Partial<ExcelJS.Borders> = {
  top: { style: 'medium', color: { argb: 'FF595959' } },
  left: { style: 'medium', color: { argb: 'FFBFBFBF' } },
  bottom: { style: 'medium', color: { argb: 'FF595959' } },
  right: { style: 'medium', color: { argb: 'FFBFBFBF' } },
};

const SECTION_ROW_HEIGHT = 22.05;
const HEADER_ROW_HEIGHT = 36;
const HINT_ROW_HEIGHT = 13.95;

@Injectable()
export class ContactTemplateGeneratorService {
  constructor(private readonly dataSource?: DataSource) {}

  async generateWorkbook(): Promise<Buffer> {
    if (!this.dataSource) {
      throw new Error('Database persistence is required to generate the contact upload template.');
    }

    const [sreniColumns, enumMap, sthanNames, zoneNames] = await Promise.all([
      this.loadSreniExcelColumns(),
      this.loadEnumValues(),
      this.loadLocationNames('sthan'),
      this.loadLocationNames('zone'),
    ]);

    const columns = buildMemberContactColumnLayout(sreniColumns);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(this.resolveReferenceTemplatePath());

    const existingValidSheet = workbook.getWorksheet(VALID_VALUES_SHEET_NAME);
    if (existingValidSheet) {
      workbook.removeWorksheet(existingValidSheet.id);
    }
    const existingMemberSheet = workbook.getWorksheet(MEMBER_DATA_SHEET_NAME);
    if (existingMemberSheet) {
      workbook.removeWorksheet(existingMemberSheet.id);
    }

    const memberSheet = workbook.addWorksheet(MEMBER_DATA_SHEET_NAME);
    this.buildMemberDataSheet(memberSheet, columns, enumMap, sthanNames, zoneNames);
    this.updateValidValuesSheet(workbook, enumMap, sthanNames, sreniColumns);

    const validValuesSheet = workbook.getWorksheet(VALID_VALUES_SHEET_NAME);
    if (validValuesSheet) {
      validValuesSheet.state = 'veryHidden';
    }

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  private resolveReferenceTemplatePath(): string {
    const candidates = [
      path.join(__dirname, '..', '..', '..', 'assets', 'templates', REFERENCE_TEMPLATE_FILE),
      path.join(process.cwd(), 'src', 'assets', 'templates', REFERENCE_TEMPLATE_FILE),
      path.join(process.cwd(), 'assets', 'templates', REFERENCE_TEMPLATE_FILE),
      path.join(process.cwd(), 'ad-west-api', 'src', 'assets', 'templates', REFERENCE_TEMPLATE_FILE),
      path.join(process.cwd(), '..', 'ad-west-web', 'public', 'templates', REFERENCE_TEMPLATE_FILE),
    ];
    for (const candidate of candidates) {
      if (fs.existsSync(candidate)) return candidate;
    }
    throw new Error('Member Data reference template file was not found on the server.');
  }

  private async loadSreniExcelColumns(): Promise<SreniExcelColumn[]> {
    const rows = await this.dataSource!.query(
      `SELECT id::text AS id, name, primary_contact_strategy
       FROM adwest.srenies
       WHERE active = true AND show_in_upload_excel = true
       ORDER BY name ASC`,
    ) as Array<{ id: string; name: string; primary_contact_strategy: string | null }>;
    return rows.map((r) => ({
      sreniId: r.id,
      sreniName: r.name,
      primaryContactStrategy: r.primary_contact_strategy,
    }));
  }

  private async loadLocationNames(level: 'sthan' | 'zone'): Promise<string[]> {
    const rows = await this.dataSource!.query(
      `SELECT name FROM adwest.locations WHERE active = true AND level = $1 ORDER BY name ASC`,
      [level],
    ) as Array<{ name: string }>;
    return rows.map((r) => r.name);
  }

  private async loadEnumValues(): Promise<Map<string, EnumRow[]>> {
    const rows = await this.dataSource!.query(
      `SELECT enum_type, value, label FROM adwest.enum_values
       WHERE active = true
         AND enum_type IN (
           'contact_blood_group', 'contact_living_type', 'contact_current_status',
           'contact_child_grade', 'contact_yes_no'
         )
       ORDER BY enum_type, sort_order, label`,
    ) as Array<{ enum_type: string; value: string; label: string }>;
    const map = new Map<string, EnumRow[]>();
    for (const row of rows) {
      const bucket = map.get(row.enum_type) ?? [];
      bucket.push({ value: row.value, label: row.label });
      map.set(row.enum_type, bucket);
    }
    return map;
  }

  private columnSection(col: MemberContactColumnDef): MemberContactFieldSection {
    return col.kind === 'sreni' ? 'sreni' : col.section;
  }

  private buildMemberDataSheet(
    sheet: ExcelJS.Worksheet,
    columns: MemberContactColumnDef[],
    enumMap: Map<string, EnumRow[]>,
    sthanNames: string[],
    zoneNames: string[],
  ): void {
    const sectionRow = MEMBER_CONTACT_SECTION_ROW_INDEX;
    const headerRow = MEMBER_CONTACT_EXCEL_HEADER_ROW_INDEX;
    const hintRow = MEMBER_CONTACT_EXCEL_HINT_ROW_INDEX;
    const dataStartRow = MEMBER_CONTACT_EXCEL_DATA_START_ROW_INDEX;

    sheet.getRow(sectionRow).height = SECTION_ROW_HEIGHT;
    sheet.getRow(headerRow).height = HEADER_ROW_HEIGHT;
    sheet.getRow(hintRow).height = HINT_ROW_HEIGHT;

    this.buildSectionRow(sheet, columns, sectionRow);

    columns.forEach((col, idx) => {
      const colIndex = idx + 1;
      const headerText = col.kind === 'sreni' ? col.header : col.header;
      const headerCell = sheet.getCell(headerRow, colIndex);
      headerCell.value = headerText;
      headerCell.font = { bold: true, size: 9, color: { argb: HEADER_FONT_COLOR }, name: 'Arial' };
      headerCell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      headerCell.border = HEADER_BORDER;
      const color = col.kind === 'sreni' ? 'DEEAF1' : (col.headerColor ?? 'DEEAF1');
      headerCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${color}` } };

      const hint = col.kind === 'sreni' ? 'Yes/No' : (col.hint ?? '');
      const hintCell = sheet.getCell(hintRow, colIndex);
      hintCell.value = hint || null;
      hintCell.font = { italic: true, size: 8, color: { argb: HINT_FONT_COLOR }, name: 'Arial' };
      hintCell.alignment = { horizontal: 'center', vertical: 'middle' };
      hintCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HINT_ROW_FILL } };

      const width = Math.min(24, Math.max(12, headerText.length + 2));
      sheet.getColumn(colIndex).width = width;

      this.applyDropdown(sheet, col, colIndex, enumMap, sthanNames, zoneNames, dataStartRow);
    });

    const sampleRow = sheet.getRow(dataStartRow);
    sampleRow.getCell(1).value = 1;
    for (let colIndex = 1; colIndex <= columns.length; colIndex += 1) {
      sampleRow.getCell(colIndex).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: SAMPLE_ROW_FILL },
      };
    }

    const endRow = dataStartRow + 499;
    for (let rowIndex = dataStartRow + 1; rowIndex <= endRow; rowIndex += 1) {
      if ((rowIndex - dataStartRow) % 2 !== 0) continue;
      for (let colIndex = 1; colIndex <= columns.length; colIndex += 1) {
        sheet.getCell(rowIndex, colIndex).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: SAMPLE_ROW_FILL },
        };
      }
    }

    sheet.views = [{ state: 'frozen', ySplit: hintRow, activeCell: 'A4' }];
  }

  private buildSectionRow(
    sheet: ExcelJS.Worksheet,
    columns: MemberContactColumnDef[],
    sectionRow: number,
  ): void {
    type Span = { section: MemberContactFieldSection; startCol: number; endCol: number };

    const spans: Span[] = [];
    let current: MemberContactFieldSection | null = null;
    let startCol = 1;

    columns.forEach((col, idx) => {
      const section = this.columnSection(col);
      const colIndex = idx + 1;
      if (current === null) {
        current = section;
        startCol = colIndex;
        return;
      }
      if (section !== current) {
        spans.push({ section: current, startCol, endCol: colIndex - 1 });
        current = section;
        startCol = colIndex;
      }
    });
    if (current !== null) {
      spans.push({ section: current, startCol, endCol: columns.length });
    }

    for (const span of spans) {
      const label = MEMBER_CONTACT_SECTION_LABELS.find((s) => s.section === span.section)?.label ?? span.section;
      const color = MEMBER_CONTACT_SECTION_COLORS[span.section];
      this.applySectionBand(sheet, sectionRow, span.startCol, span.endCol, label, color);
    }
  }

  private applySectionBand(
    sheet: ExcelJS.Worksheet,
    row: number,
    startCol: number,
    endCol: number,
    label: string,
    colorHex: string,
  ): void {
    const fill = { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: `FF${colorHex}` } };
    const font = { bold: true, size: 9, color: { argb: SECTION_FONT_COLOR }, name: 'Arial' };
    const alignment = { horizontal: 'center' as const, vertical: 'middle' as const };

    for (let colIndex = startCol; colIndex <= endCol; colIndex += 1) {
      const cell = sheet.getCell(row, colIndex);
      cell.fill = fill;
      cell.font = font;
      cell.alignment = alignment;
    }

    sheet.getCell(row, startCol).value = label;

    if (endCol > startCol) {
      const startAddr = sheet.getCell(row, startCol).address;
      const endAddr = sheet.getCell(row, endCol).address;
      sheet.mergeCells(`${startAddr}:${endAddr}`);
    }
  }

  private updateValidValuesSheet(
    workbook: ExcelJS.Workbook,
    enumMap: Map<string, EnumRow[]>,
    sthanNames: string[],
    sreniColumns: SreniExcelColumn[],
  ): void {
    let sheet = workbook.getWorksheet(VALID_VALUES_SHEET_NAME);
    if (!sheet) {
      sheet = workbook.addWorksheet(VALID_VALUES_SHEET_NAME);
    }

    sheet.spliceRows(1, sheet.rowCount);

    sheet.getCell('A1').value = 'Field';
    sheet.getCell('B1').value = 'Accepted Values';
    sheet.getRow(1).font = { bold: true, color: { argb: SECTION_FONT_COLOR }, name: 'Arial' };
    sheet.getRow(1).eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F4E79' } };
    });

    const entries: Array<[string, string]> = [
      ['Family / Bachelor', this.joinValues(enumMap.get('contact_living_type'))],
      ['Current Status', this.joinValues(enumMap.get('contact_current_status'))],
      ['Blood Group', this.joinValues(enumMap.get('contact_blood_group'))],
      ['Grade', this.joinValues(enumMap.get('contact_child_grade'))],
      ['Yes / No (Sreni columns)', this.joinValues(enumMap.get('contact_yes_no'))],
      ['Sthan', sthanNames.join(', ')],
      ['Date Format', 'DD-MM-YYYY  (e.g. 25-08-1990)'],
      ['Mobile Format', '+971-50-XXXXXXX'],
    ];
    for (const sreni of sreniColumns) {
      entries.push([sreni.sreniName, 'Yes, No']);
    }

    entries.forEach(([field, values], idx) => {
      const rowIndex = idx + 2;
      sheet!.getCell(`A${rowIndex}`).value = field;
      sheet!.getCell(`B${rowIndex}`).value = values;
      if (idx % 2 === 0) {
        sheet!.getCell(`A${rowIndex}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' } };
        sheet!.getCell(`B${rowIndex}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' } };
      }
    });

    sheet.getColumn(1).width = 28;
    sheet.getColumn(2).width = 64;
  }

  private joinValues(rows: EnumRow[] | undefined): string {
    return (rows ?? []).map((r) => r.label).join(', ');
  }

  private applyDropdown(
    sheet: ExcelJS.Worksheet,
    col: MemberContactColumnDef,
    colIndex: number,
    enumMap: Map<string, EnumRow[]>,
    sthanNames: string[],
    zoneNames: string[],
    dataStartRow: number,
  ): void {
    const validations = (sheet as ExcelJS.Worksheet & {
      dataValidations: { add: (range: string, rule: object) => void; model: { validations: unknown[] } };
    }).dataValidations;

    const endRow = dataStartRow + 499;
    const colLetter = sheet.getColumn(colIndex).letter;
    const range = `${colLetter}${dataStartRow}:${colLetter}${endRow}`;

    let list: string[] | null = null;
    if (col.kind === 'sreni') {
      list = [...MEMBER_CONTACT_YES_NO];
    } else if (col.enumType === 'location_sthan') {
      list = sthanNames;
    } else if (col.enumType === 'location_zone') {
      list = zoneNames;
    } else if (col.enumType) {
      list = (enumMap.get(col.enumType) ?? []).map((e) => e.label);
    }

    if (!list?.length) return;

    const inlineList = `"${list.map((v) => v.replace(/"/g, '""')).join(',')}"`;
    validations.add(range, {
      type: 'list',
      allowBlank: true,
      formulae: [inlineList],
      showErrorMessage: true,
      errorTitle: 'Invalid value',
      error: `Please select a value from the list for ${col.kind === 'sreni' ? col.header : col.header}.`,
    });
  }
}
