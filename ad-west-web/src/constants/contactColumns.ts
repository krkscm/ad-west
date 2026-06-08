export const MASTER_CONTACT_COLUMNS: Array<{ key: string; label: string }> = [
  { key: 'name', label: 'Name' },
  { key: 'personalNumber', label: 'Personal Number' },
  { key: 'updatesAsPerAug2024', label: 'Updates as per Aug2024' },
  { key: 'ss', label: 'SS' },
  { key: 'companyMobileNo2', label: 'Company Mobile No 2' },
  { key: 'bhag', label: 'Bhag' },
  { key: 'samithi', label: 'Samithi' },
  { key: 'samithiStatus', label: 'Samithi Status' },
  { key: 'balabarathi', label: 'Balabarathi' },
  { key: 'bbStatus', label: 'BB Status' },
  { key: 'yoga', label: 'Yoga' },
  { key: 'familyOrBachelor', label: 'Family / Bachelor' },
  { key: 'family', label: 'Family' },
  { key: 'bachelor', label: 'Bachelor' },
  { key: 'addressInUae', label: 'Address in UAE' },
  { key: 'company', label: 'Company' },
  { key: 'profession', label: 'Profession' },
  { key: 'wifeName', label: 'Wife Name' },
  { key: 'mobileNo4', label: 'Mobile No 4' },
  { key: 'landLine', label: 'Land Line' },
  { key: 'zoneOrLandmark', label: 'Zone / Land Mark' },
  { key: 'district', label: 'District' },
  { key: 'company8', label: 'Company8' },
  { key: 'profession7', label: 'Profession7' },
  { key: 'yogaSecondary', label: 'Yoga (Secondary)' },
];

export const MASTER_CONTACT_COLUMN_LABELS = new Map(
  MASTER_CONTACT_COLUMNS.map((column) => [column.key, column.label]),
);

export type ContactData = Record<string, string | number | boolean | null>;

export type ContactFieldInputType = 'text' | 'tel' | 'textarea' | 'select';

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
}

export const ABU_DHABI_DISTRICTS = [
  'Abu Dhabi City', 'Al Ain', 'Al Dhafra',
  'Khalifa City A', 'Khalifa City B', 'Mohammed Bin Zayed City',
  'Al Shamkha', 'Baniyas', 'Al Wathba', 'Al Falah', 'Al Rahba',
  'Shakhbout City', 'Zayed City', 'Al Reem Island', 'Saadiyat Island',
  'Yas Island', 'Al Mushrif', 'Al Karamah', 'Al Nahyan', 'Al Muroor',
  'Al Mussafah', 'Mussafah Industrial', 'Al Mafraq', 'Al Bahia',
  'Al Samha', 'Al Shuwaib', 'Ruwais', 'Madinat Zayed', 'Al Mirfa',
  'Ghayathi', 'Liwa',
] as const;

const CONTACT_STATUS_OPTIONS: ContactSelectOption[] = [
  { value: 'Active', label: 'Active' },
  { value: 'Inactive', label: 'Inactive' },
  { value: 'NA', label: 'NA' },
  { value: 'Yes', label: 'Yes' },
  { value: 'No', label: 'No' },
];

const CONTACT_FIELD_SPECS: Partial<Record<string, Omit<ContactEditField, 'key' | 'label'>>> = {
  name: { inputType: 'text', placeholder: 'Full name' },
  personalNumber: { inputType: 'tel', placeholder: 'e.g. 055 1234567' },
  companyMobileNo2: { inputType: 'tel', placeholder: 'Mobile number' },
  mobileNo4: { inputType: 'tel', placeholder: 'Mobile number' },
  landLine: { inputType: 'tel', placeholder: 'Land line number' },
  updatesAsPerAug2024: { inputType: 'textarea', placeholder: 'Updates or notes' },
  addressInUae: { inputType: 'textarea', placeholder: 'Full address in UAE' },
  ss: { inputType: 'select', options: CONTACT_STATUS_OPTIONS },
  samithiStatus: { inputType: 'select', options: CONTACT_STATUS_OPTIONS },
  bbStatus: { inputType: 'select', options: CONTACT_STATUS_OPTIONS },
  familyOrBachelor: {
    inputType: 'select',
    enumType: 'contact_living_type',
    options: [
      { value: 'F', label: 'F (Family)' },
      { value: 'B', label: 'B (Bachelor)' },
    ],
  },
  district: {
    inputType: 'select',
    options: ABU_DHABI_DISTRICTS.map((d) => ({ value: d, label: d })),
  },
};

function resolveContactEditField(key: string): ContactEditField {
  const spec = CONTACT_FIELD_SPECS[key];
  return {
    key,
    label: MASTER_CONTACT_COLUMN_LABELS.get(key) ?? key,
    inputType: spec?.inputType ?? 'text',
    enumType: spec?.enumType,
    options: spec?.options,
    placeholder: spec?.placeholder,
  };
}

export function buildContactEditFields(
  columns: string[],
  data: ContactData,
): ContactEditField[] {
  const keys = new Set<string>(['name', ...columns, ...Object.keys(data)]);
  const masterKeys = MASTER_CONTACT_COLUMNS.map((c) => c.key).filter((k) => keys.has(k));
  const extraKeys = Array.from(keys).filter((k) => !MASTER_CONTACT_COLUMN_LABELS.has(k)).sort();
  return [...masterKeys, ...extraKeys].map(resolveContactEditField);
}

export function orderContactColumns(colSet: Set<string>): string[] {
  const masterOrdered = MASTER_CONTACT_COLUMNS.map((c) => c.key).filter((k) => colSet.has(k));
  const extras = Array.from(colSet).filter((k) => !MASTER_CONTACT_COLUMN_LABELS.has(k)).sort((a, b) => a.localeCompare(b));
  return [...masterOrdered, ...extras];
}
