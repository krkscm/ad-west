import { BadRequestException } from '@nestjs/common';

const SAFE_KEY = /^[a-zA-Z][a-zA-Z0-9_]*$/;

export type SortDirection = 'asc' | 'desc';

export type ListSortOptions = {
  sortBy?: string;
  sortDir?: SortDirection;
};

export function parseSortParams(sortBy?: string, sortDir?: string): ListSortOptions {
  const key = sortBy?.trim();
  if (!key) {
    return {};
  }
  if (!SAFE_KEY.test(key)) {
    throw new BadRequestException('sortBy must be a valid column key');
  }
  const normalizedDir = sortDir?.trim().toLowerCase();
  const dir: SortDirection = normalizedDir === 'desc' ? 'desc' : 'asc';
  return { sortBy: key, sortDir: dir };
}

export function buildSqlOrderBy(
  sort: ListSortOptions | undefined,
  allowedColumns: Record<string, string>,
  defaultClause: string,
): string {
  if (!sort?.sortBy) {
    return defaultClause;
  }
  const expr = allowedColumns[sort.sortBy];
  if (!expr) {
    return defaultClause;
  }
  const dir = sort.sortDir === 'desc' ? 'DESC' : 'ASC';
  return `ORDER BY ${expr} ${dir} NULLS LAST`;
}

export function contactDataSortExpr(key: string, alias = 'c'): string | null {
  if (!SAFE_KEY.test(key)) {
    return null;
  }
  return `COALESCE(${alias}.data->>'${key}', '')`;
}

export function buildContactOrderBy(
  sort: ListSortOptions | undefined,
  alias = 'c',
  defaultClause: string,
  extraColumns: Record<string, string> = {},
): string {
  if (!sort?.sortBy) {
    return defaultClause;
  }

  const staticColumns: Record<string, string> = {
    name: `COALESCE(${alias}.data->>'name', '')`,
    mobileNo: `COALESCE(${alias}.data->>'mobileNo', '')`,
    divisionId: `${alias}.division_id::text`,
    sthanId: `COALESCE(${alias}.sthan_id, ${alias}.sthan_location_id::text, '')`,
    srNo: `${alias}.sr_no`,
    rowIndex: `${alias}.row_index`,
    active: `COALESCE(${alias}.active, true)`,
    createdAt: `${alias}.created_at`,
    ...extraColumns,
  };

  const expr = staticColumns[sort.sortBy] ?? contactDataSortExpr(sort.sortBy, alias);
  if (!expr) {
    return defaultClause;
  }
  const dir = sort.sortDir === 'desc' ? 'DESC' : 'ASC';
  return `ORDER BY ${expr} ${dir} NULLS LAST`;
}

export function applyInMemoryColumnSort<T>(
  rows: T[],
  sort: ListSortOptions | undefined,
  resolvers: Record<string, (row: T) => string | number | boolean | undefined | null>,
  defaultCompare?: (a: T, b: T) => number,
): T[] {
  if (!sort?.sortBy) {
    return defaultCompare ? [...rows].sort(defaultCompare) : rows;
  }
  const resolver = resolvers[sort.sortBy];
  if (!resolver) {
    return defaultCompare ? [...rows].sort(defaultCompare) : rows;
  }
  const dir = sort.sortDir === 'desc' ? -1 : 1;
  return [...rows].sort((a, b) => {
    const av = resolver(a);
    const bv = resolver(b);
    if (av == null && bv == null) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;
    if (typeof av === 'number' && typeof bv === 'number') {
      return (av - bv) * dir;
    }
    if (typeof av === 'boolean' && typeof bv === 'boolean') {
      return (Number(av) - Number(bv)) * dir;
    }
    return String(av).localeCompare(String(bv), undefined, { sensitivity: 'base' }) * dir;
  });
}

export const LOCATION_SORT_COLUMNS: Record<string, string> = {
  code: 'code',
  name: 'name',
  level: 'level',
  active: 'active',
};

export const SRENI_DEFINITION_SORT_COLUMNS: Record<string, string> = {
  code: 'code',
  name: 'name',
  description: 'description',
  enrollmentScope: 'enrollment_scope',
  primaryContactStrategy: 'primary_contact_strategy',
  joinUsVisible: 'join_us_visible',
  active: 'active',
  createdBy: 'created_by',
};

export const PERMISSION_SORT_COLUMNS: Record<string, string> = {
  code: 'code',
  name: 'name',
  locationId: 'location_id::text',
  sreniId: 'sreni_id',
  description: 'description',
  active: 'active',
};

export const PERMISSION_SET_SORT_COLUMNS: Record<string, string> = {
  name: 'ps.name',
  description: 'ps.description',
  active: 'ps.active',
};

export const USER_SORT_COLUMNS: Record<string, string> = {
  code: 'code',
  name: 'name',
  email: 'email',
  phone: 'phone',
  gender: 'gender',
  roleId: 'role_id::text',
  sthanId: 'sthan_id::text',
  active: 'active',
};

export const ATTENDANCE_METRIC_SORT_COLUMNS: Record<string, string> = {
  name: 'name',
  description: 'description',
  sreniId: 'sreni_id',
  active: 'active',
};

export const JOIN_US_SORT_COLUMNS: Record<string, string> = {
  name: "COALESCE(c.data->>'name', '')",
  mobileNo: "COALESCE(c.data->>'mobileNo', '')",
  familyOrBachelor: "COALESCE(c.data->>'familyOrBachelor', '')",
  reviewStatus: "COALESCE(c.review_status, 'pending')",
  submittedAt: 'c.created_at',
};
