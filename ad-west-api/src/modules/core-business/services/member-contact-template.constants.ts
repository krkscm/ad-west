/** Member Data Upload template — fixed columns and layout (SRENI block is dynamic). */

export type MemberContactFieldSection =
  | 'identification'
  | 'primary'
  | 'sreni'
  | 'classification'
  | 'spouse'
  | 'children'
  | 'address'
  | 'other';

export type MemberContactFieldSpec = {
  key: string;
  header: string;
  section: MemberContactFieldSection;
  required?: boolean;
  hint?: string;
  enumType?: string;
  /** Excel fill color ARGB without alpha prefix */
  headerColor?: string;
};

export const MEMBER_CONTACT_YES_NO = ['Yes', 'No'] as const;

export const MEMBER_CONTACT_FIELDS_BEFORE_SRENI: MemberContactFieldSpec[] = [
  { key: 'srNo', header: 'Sr No', section: 'identification', hint: 'Auto-assigned', headerColor: 'FFF2CC' },
  { key: 'name', header: 'Name (Primary Member)', section: 'primary', required: true, hint: 'Full name', headerColor: 'FFF2CC' },
  { key: 'dateOfBirth', header: 'Date of Birth', section: 'primary', required: true, hint: 'DD-MM-YYYY', headerColor: 'FFF2CC' },
  { key: 'bloodGroup', header: 'Blood Group', section: 'primary', enumType: 'contact_blood_group', headerColor: 'DEEAF1' },
  { key: 'mobileNo', header: 'Mobile No', section: 'primary', required: true, hint: 'With country code', headerColor: 'FFF2CC' },
  { key: 'altMobileNo', header: 'Alt Mobile No', section: 'primary', headerColor: 'DEEAF1' },
  { key: 'email', header: 'E-mail', section: 'primary', headerColor: 'DEEAF1' },
  { key: 'profession', header: 'Profession', section: 'primary', headerColor: 'DEEAF1' },
  { key: 'company', header: 'Company', section: 'primary', headerColor: 'DEEAF1' },
  { key: 'jobTitle', header: 'Job Title', section: 'primary', headerColor: 'DEEAF1' },
];

export const MEMBER_CONTACT_FIELDS_AFTER_SRENI: MemberContactFieldSpec[] = [
  { key: 'sthan', header: 'Sthan', section: 'classification', enumType: 'location_sthan', headerColor: 'DEEAF1' },
  { key: 'zone', header: 'Zone', section: 'classification', enumType: 'location_zone', headerColor: 'DEEAF1' },
  { key: 'familyOrBachelor', header: 'Family / Bachelor', section: 'classification', required: true, enumType: 'contact_living_type', hint: 'Family or Bachelor', headerColor: 'FFF2CC' },
  { key: 'currentStatus', header: 'Current Status', section: 'classification', enumType: 'contact_current_status', hint: 'Active/Inactive', headerColor: 'DEEAF1' },
  { key: 'spouseName', header: 'Wife / Spouse Name', section: 'spouse', headerColor: 'FCE4D6' },
  { key: 'spouseDateOfBirth', header: 'Spouse Date of Birth', section: 'spouse', hint: 'DD-MM-YYYY', headerColor: 'FCE4D6' },
  { key: 'spouseBloodGroup', header: 'Spouse Blood Group', section: 'spouse', enumType: 'contact_blood_group', headerColor: 'FCE4D6' },
  { key: 'spouseMobileNo', header: 'Spouse Mobile No', section: 'spouse', headerColor: 'FCE4D6' },
  { key: 'spouseEmail', header: 'Spouse E-mail', section: 'spouse', headerColor: 'FCE4D6' },
  { key: 'spouseProfession', header: 'Spouse Profession', section: 'spouse', headerColor: 'FCE4D6' },
  { key: 'spouseCompany', header: 'Spouse Company', section: 'spouse', headerColor: 'FCE4D6' },
  { key: 'child1Name', header: 'Child 1 - Name', section: 'children', headerColor: 'E2EFDA' },
  { key: 'child1Dob', header: 'Child 1 - DOB', section: 'children', hint: 'DD-MM-YYYY', headerColor: 'E2EFDA' },
  { key: 'child1Grade', header: 'Child 1 - Grade', section: 'children', enumType: 'contact_child_grade', headerColor: 'E2EFDA' },
  { key: 'child2Name', header: 'Child 2 - Name', section: 'children', headerColor: 'E2EFDA' },
  { key: 'child2Dob', header: 'Child 2 - DOB', section: 'children', hint: 'DD-MM-YYYY', headerColor: 'E2EFDA' },
  { key: 'child2Grade', header: 'Child 2 - Grade', section: 'children', enumType: 'contact_child_grade', headerColor: 'E2EFDA' },
  { key: 'child3Name', header: 'Child 3 - Name', section: 'children', headerColor: 'E2EFDA' },
  { key: 'child3Dob', header: 'Child 3 - DOB', section: 'children', hint: 'DD-MM-YYYY', headerColor: 'E2EFDA' },
  { key: 'child3Grade', header: 'Child 3 - Grade', section: 'children', enumType: 'contact_child_grade', headerColor: 'E2EFDA' },
  { key: 'addressInUae', header: 'Address in UAE', section: 'address', headerColor: 'DEEAF1' },
  { key: 'landLineNo', header: 'Land Line No', section: 'address', headerColor: 'DEEAF1' },
  { key: 'home', header: 'Home', section: 'address', headerColor: 'DEEAF1' },
  { key: 'addressInIndia', header: 'Address in India', section: 'address', headerColor: 'DEEAF1' },
  { key: 'districtIndia', header: 'District (India)', section: 'address', headerColor: 'DEEAF1' },
  { key: 'googleMapLink', header: 'Google Map Link', section: 'other', headerColor: 'DEEAF1' },
  { key: 'remarks', header: 'Remarks', section: 'other', headerColor: 'DEEAF1' },
];

export const MEMBER_DATA_SHEET_NAME = 'Member Data';
export const INSTRUCTIONS_SHEET_NAME = 'Instructions';
export const VALID_VALUES_SHEET_NAME = 'Valid Values';

export const MEMBER_CONTACT_HEADER_ROW_INDEX = 1;
export const MEMBER_CONTACT_HINT_ROW_INDEX = 2;
export const MEMBER_CONTACT_DATA_START_ROW_INDEX = 3;

export type SreniExcelColumn = {
  sreniId: string;
  sreniName: string;
  primaryContactStrategy: string | null;
};

export type MemberContactColumnDef =
  | (MemberContactFieldSpec & { kind: 'field' })
  | { kind: 'sreni'; sreniId: string; header: string; key: string; primaryContactStrategy: string | null };

export function sreniMembershipKey(sreniId: string): string {
  return `sreni_${sreniId}`;
}

export function buildMemberContactColumnLayout(sreniColumns: SreniExcelColumn[]): MemberContactColumnDef[] {
  const sreniDefs: MemberContactColumnDef[] = sreniColumns.map((s) => ({
    kind: 'sreni' as const,
    sreniId: s.sreniId,
    header: s.sreniName,
    key: sreniMembershipKey(s.sreniId),
    primaryContactStrategy: s.primaryContactStrategy,
  }));
  return [
    ...MEMBER_CONTACT_FIELDS_BEFORE_SRENI.map((f) => ({ ...f, kind: 'field' as const })),
    ...sreniDefs,
    ...MEMBER_CONTACT_FIELDS_AFTER_SRENI.map((f) => ({ ...f, kind: 'field' as const })),
  ];
}

export const MEMBER_CONTACT_SECTION_LABELS: Array<{ section: MemberContactFieldSection; label: string }> = [
  { section: 'identification', label: 'IDENTIFICATION' },
  { section: 'primary', label: 'PRIMARY MEMBER' },
  { section: 'sreni', label: 'SRENI' },
  { section: 'classification', label: 'CLASSIFICATION' },
  { section: 'spouse', label: 'SPOUSE / WIFE' },
  { section: 'children', label: 'CHILDREN' },
  { section: 'address', label: 'ADDRESS' },
  { section: 'other', label: 'OTHER' },
];

/** Section band colours on row 1 of Member Data sheet (ARGB without alpha). */
export const MEMBER_CONTACT_SECTION_COLORS: Record<MemberContactFieldSection, string> = {
  identification: '1F4E79',
  primary: '375623',
  sreni: '2E75B6',
  classification: '2E75B6',
  spouse: '833C00',
  children: '375623',
  address: '1F4E79',
  other: '595959',
};

export const MEMBER_CONTACT_SECTION_ROW_INDEX = 1;
export const MEMBER_CONTACT_EXCEL_HEADER_ROW_INDEX = 2;
export const MEMBER_CONTACT_EXCEL_HINT_ROW_INDEX = 3;
export const MEMBER_CONTACT_EXCEL_DATA_START_ROW_INDEX = 4;

export function normalizeMemberHeader(value: unknown): string {
  return String(value ?? '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[^a-z0-9 /()-]/g, '')
    .trim();
}

export function normalizeMemberCell(value: unknown): string | number | boolean | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  const text = String(value).trim();
  return text.length ? text : null;
}

export function normalizeMobileForMatch(value: unknown): string {
  return String(value ?? '').replace(/\D/g, '');
}

export function householdDedupKey(name: unknown, mobile: unknown): string {
  const n = String(name ?? '').trim().toLowerCase();
  const m = normalizeMobileForMatch(mobile);
  return `${m}::${n}`;
}

export const CHILD_FIELD_GROUPS = [
  { nameKey: 'child1Name', dobKey: 'child1Dob', gradeKey: 'child1Grade', slot: 1 },
  { nameKey: 'child2Name', dobKey: 'child2Dob', gradeKey: 'child2Grade', slot: 2 },
  { nameKey: 'child3Name', dobKey: 'child3Dob', gradeKey: 'child3Grade', slot: 3 },
] as const;

export function childDedupKey(parentId: string, name: unknown, dob: unknown): string {
  const n = String(name ?? '').trim().toLowerCase();
  const d = String(dob ?? '').trim().toLowerCase();
  return `${parentId}::${n}::${d}`;
}
