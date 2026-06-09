/** Member Data Upload template column registry (matches API template). */

export const MEMBER_CONTACT_COLUMNS: Array<{ key: string; label: string }> = [
  { key: 'srNo', label: 'Sr No' },
  { key: 'name', label: 'Name (Primary Member)' },
  { key: 'dateOfBirth', label: 'Date of Birth' },
  { key: 'bloodGroup', label: 'Blood Group' },
  { key: 'mobileNo', label: 'Mobile No' },
  { key: 'altMobileNo', label: 'Alt Mobile No' },
  { key: 'email', label: 'E-mail' },
  { key: 'profession', label: 'Profession' },
  { key: 'company', label: 'Company' },
  { key: 'jobTitle', label: 'Job Title' },
  { key: 'sthan', label: 'Sthan' },
  { key: 'zone', label: 'Zone' },
  { key: 'familyOrBachelor', label: 'Family / Bachelor' },
  { key: 'currentStatus', label: 'Current Status' },
  { key: 'spouseName', label: 'Wife / Spouse Name' },
  { key: 'spouseDateOfBirth', label: 'Spouse Date of Birth' },
  { key: 'spouseBloodGroup', label: 'Spouse Blood Group' },
  { key: 'spouseMobileNo', label: 'Spouse Mobile No' },
  { key: 'spouseEmail', label: 'Spouse E-mail' },
  { key: 'spouseProfession', label: 'Spouse Profession' },
  { key: 'spouseCompany', label: 'Spouse Company' },
  { key: 'child1Name', label: 'Child 1 - Name' },
  { key: 'child1Dob', label: 'Child 1 - DOB' },
  { key: 'child1Grade', label: 'Child 1 - Grade' },
  { key: 'child2Name', label: 'Child 2 - Name' },
  { key: 'child2Dob', label: 'Child 2 - DOB' },
  { key: 'child2Grade', label: 'Child 2 - Grade' },
  { key: 'child3Name', label: 'Child 3 - Name' },
  { key: 'child3Dob', label: 'Child 3 - DOB' },
  { key: 'child3Grade', label: 'Child 3 - Grade' },
  { key: 'addressInUae', label: 'Address in UAE' },
  { key: 'landLineNo', label: 'Land Line No' },
  { key: 'home', label: 'Home' },
  { key: 'addressInIndia', label: 'Address in India' },
  { key: 'districtIndia', label: 'District (India)' },
  { key: 'googleMapLink', label: 'Google Map Link' },
  { key: 'remarks', label: 'Remarks' },
];

export const MEMBER_CONTACT_COLUMN_LABELS = new Map(
  MEMBER_CONTACT_COLUMNS.map((c) => [c.key, c.label]),
);

export type ContactData = Record<string, string | number | boolean | null>;

export type ContactFieldInputType = 'text' | 'tel' | 'textarea' | 'select' | 'date';

export interface ContactSelectOption {
  value: string;
  label: string;
}

export interface ContactEditField {
  key: string;
  label: string;
  inputType: ContactFieldInputType;
  enumType?: string;
  options?: ContactSelectOption[];
  placeholder?: string;
  required?: boolean;
  birthDate?: boolean;
}

export interface ContactEditFieldSection {
  id: string;
  label: string;
  fields: ContactEditField[];
}

const SECTION_FIELD_KEYS: Array<{ id: string; label: string; keys: string[] }> = [
  {
    id: 'primary',
    label: 'Primary Member',
    keys: ['name', 'dateOfBirth', 'bloodGroup', 'mobileNo', 'altMobileNo', 'email', 'profession', 'company', 'jobTitle'],
  },
  {
    id: 'classification',
    label: 'Classification',
    keys: ['sthan', 'zone', 'familyOrBachelor', 'currentStatus'],
  },
  {
    id: 'spouse',
    label: 'Spouse / Wife',
    keys: ['spouseName', 'spouseDateOfBirth', 'spouseBloodGroup', 'spouseMobileNo', 'spouseEmail', 'spouseProfession', 'spouseCompany'],
  },
  {
    id: 'children',
    label: 'Children',
    keys: [
      'child1Name', 'child1Dob', 'child1Grade',
      'child2Name', 'child2Dob', 'child2Grade',
      'child3Name', 'child3Dob', 'child3Grade',
    ],
  },
  {
    id: 'address',
    label: 'Address',
    keys: ['addressInUae', 'landLineNo', 'home', 'addressInIndia', 'districtIndia'],
  },
  {
    id: 'other',
    label: 'Other',
    keys: ['googleMapLink', 'remarks'],
  },
];

const FIELD_SPECS: Partial<Record<string, Omit<ContactEditField, 'key' | 'label'>>> = {
  name: { inputType: 'text', placeholder: 'Full name', required: true },
  mobileNo: { inputType: 'tel', placeholder: '+971-50-1234567', required: true },
  altMobileNo: { inputType: 'tel' },
  spouseMobileNo: { inputType: 'tel' },
  landLineNo: { inputType: 'tel' },
  email: { inputType: 'text' },
  spouseEmail: { inputType: 'text' },
  dateOfBirth: { inputType: 'date', placeholder: 'DD-MM-YYYY', required: true, birthDate: true },
  spouseDateOfBirth: { inputType: 'date', placeholder: 'DD-MM-YYYY', birthDate: true },
  child1Dob: { inputType: 'date', placeholder: 'DD-MM-YYYY', birthDate: true },
  child2Dob: { inputType: 'date', placeholder: 'DD-MM-YYYY', birthDate: true },
  child3Dob: { inputType: 'date', placeholder: 'DD-MM-YYYY', birthDate: true },
  addressInUae: { inputType: 'textarea' },
  addressInIndia: { inputType: 'textarea' },
  bloodGroup: { inputType: 'select', enumType: 'contact_blood_group' },
  spouseBloodGroup: { inputType: 'select', enumType: 'contact_blood_group' },
  familyOrBachelor: { inputType: 'select', enumType: 'contact_living_type', required: true },
  currentStatus: { inputType: 'select', enumType: 'contact_current_status' },
  sthan: { inputType: 'select' },
  zone: { inputType: 'select' },
  child1Grade: { inputType: 'select', enumType: 'contact_child_grade' },
  child2Grade: { inputType: 'select', enumType: 'contact_child_grade' },
  child3Grade: { inputType: 'select', enumType: 'contact_child_grade' },
};

function sreniMembershipKey(sreniId: string): string {
  return `sreni_${sreniId}`;
}

function resolveField(key: string, labelOverride?: string): ContactEditField {
  const spec = FIELD_SPECS[key];
  return {
    key,
    label: labelOverride ?? MEMBER_CONTACT_COLUMN_LABELS.get(key) ?? key.replace(/^sreni_/, 'Sreni '),
    inputType: spec?.inputType ?? 'text',
    enumType: key.startsWith('sreni_') ? 'contact_yes_no' : spec?.enumType,
    options: spec?.options,
    placeholder: spec?.placeholder,
    required: spec?.required,
    birthDate: spec?.birthDate,
  };
}

export type ContactEditBuildOptions = {
  uploadSrenies?: Array<{ id: string; name: string }>;
  sthanNames?: string[];
  zoneNames?: string[];
};

function applyLocationOptions(field: ContactEditField, options?: ContactEditBuildOptions): ContactEditField {
  if (field.key === 'sthan' && options?.sthanNames?.length) {
    return {
      ...field,
      options: options.sthanNames.map((name) => ({ value: name, label: name })),
    };
  }
  if (field.key === 'zone' && options?.zoneNames?.length) {
    return {
      ...field,
      options: options.zoneNames.map((name) => ({ value: name, label: name })),
    };
  }
  return field;
}

export function buildContactEditFields(
  columns: string[],
  data: ContactData,
  options?: ContactEditBuildOptions,
): ContactEditField[] {
  return buildContactEditFieldSections(columns, data, options).flatMap((s) => s.fields);
}

export function buildContactEditFieldSections(
  columns: string[],
  data: ContactData,
  options?: ContactEditBuildOptions,
): ContactEditFieldSection[] {
  const keys = new Set<string>([
    'name', 'mobileNo', 'dateOfBirth', 'familyOrBachelor',
    ...columns,
    ...Object.keys(data),
  ]);

  for (const sreni of options?.uploadSrenies ?? []) {
    keys.add(sreniMembershipKey(sreni.id));
  }

  const sections: ContactEditFieldSection[] = [];

  for (const section of SECTION_FIELD_KEYS) {
    const fields = section.keys
      .filter((key) => keys.has(key))
      .map((key) => applyLocationOptions(resolveField(key), options));
    if (fields.length) sections.push({ id: section.id, label: section.label, fields });
  }

  const sreniFields = (options?.uploadSrenies ?? [])
    .filter((s) => keys.has(sreniMembershipKey(s.id)))
    .map((s) => resolveField(sreniMembershipKey(s.id), s.name));
  if (sreniFields.length) {
    sections.splice(1, 0, { id: 'sreni', label: 'Sreni Membership', fields: sreniFields });
  }

  const knownKeys = new Set([
    ...SECTION_FIELD_KEYS.flatMap((s) => s.keys),
    ...(options?.uploadSrenies ?? []).map((s) => sreniMembershipKey(s.id)),
  ]);
  const extras = Array.from(keys)
    .filter((k) => !knownKeys.has(k) && !MEMBER_CONTACT_COLUMN_LABELS.has(k) && k !== 'srNo')
    .sort()
    .map((key) => applyLocationOptions(resolveField(key), options));
  if (extras.length) {
    sections.push({ id: 'legacy', label: 'Legacy Fields', fields: extras });
  }

  return sections;
}

export function orderContactColumns(colSet: Set<string>): string[] {
  const master = MEMBER_CONTACT_COLUMNS.map((c) => c.key).filter((k) => colSet.has(k));
  const sreni = Array.from(colSet).filter((k) => k.startsWith('sreni_')).sort();
  const extras = Array.from(colSet).filter((k) => !MEMBER_CONTACT_COLUMN_LABELS.has(k) && !k.startsWith('sreni_')).sort();
  return [...master, ...sreni, ...extras];
}

