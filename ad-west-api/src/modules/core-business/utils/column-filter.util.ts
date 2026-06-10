import { BadRequestException } from '@nestjs/common';
import type { ListSortOptions } from './column-sort.util';

const SAFE_KEY = /^[a-zA-Z][a-zA-Z0-9_]*$/;

export type ColumnFilters = Record<string, string>;

export type ContactListQueryOptions = ListSortOptions & {
  search?: string;
  columnFilters?: ColumnFilters;
};

export type PaginatedColumnListOptions = ListSortOptions & {
  columnFilters?: ColumnFilters;
};

export function applyContactListSqlFilters(
  conditions: string[],
  params: unknown[],
  paramIdx: number,
  options?: ContactListQueryOptions,
  alias = 'c',
): number {
  let idx = paramIdx;
  const search = options?.search?.trim();
  if (search) {
    conditions.push(
      `(COALESCE(${alias}.data->>'name', '') ILIKE $${idx}
        OR COALESCE(${alias}.data->>'mobileNo', '') ILIKE $${idx})`,
    );
    params.push(`%${search}%`);
    idx += 1;
  }
  if (options?.columnFilters && Object.keys(options.columnFilters).length > 0) {
    idx = appendContactColumnFilters(conditions, params, idx, options.columnFilters, alias);
  }
  return idx;
}

export function parseColumnFilters(raw?: string): ColumnFilters {
  if (!raw?.trim()) {
    return {};
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new BadRequestException('filters must be valid JSON');
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new BadRequestException('filters must be a JSON object');
  }

  const result: ColumnFilters = {};
  for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
    if (!SAFE_KEY.test(key)) {
      continue;
    }
    if (value === null || value === undefined) {
      continue;
    }
    const text = String(value).trim();
    if (text) {
      result[key] = text;
    }
  }
  return result;
}

export function appendJsonbDataFilters(
  conditions: string[],
  params: unknown[],
  paramIdx: number,
  filters: ColumnFilters,
  alias = 'c',
): number {
  let idx = paramIdx;
  for (const [key, value] of Object.entries(filters)) {
    if (!SAFE_KEY.test(key)) {
      continue;
    }
    conditions.push(`COALESCE(${alias}.data->>$${idx}, '') ILIKE $${idx + 1}`);
    params.push(key, `%${value}%`);
    idx += 2;
  }
  return idx;
}

export function appendContactColumnFilters(
  conditions: string[],
  params: unknown[],
  paramIdx: number,
  filters: ColumnFilters,
  alias = 'c',
): number {
  let idx = paramIdx;
  const dataFilters: ColumnFilters = { ...filters };

  if (dataFilters.divisionId) {
    conditions.push(`${alias}.division_id::text = $${idx}`);
    params.push(dataFilters.divisionId);
    idx += 1;
    delete dataFilters.divisionId;
  }
  if (dataFilters.sthanId) {
    conditions.push(`${alias}.sthan_id::text = $${idx}`);
    params.push(dataFilters.sthanId);
    idx += 1;
    delete dataFilters.sthanId;
  }
  if (dataFilters.name) {
    conditions.push(`COALESCE(${alias}.data->>'name', '') ILIKE $${idx}`);
    params.push(`%${dataFilters.name}%`);
    idx += 1;
    delete dataFilters.name;
  }
  if (dataFilters.mobileNo) {
    conditions.push(`COALESCE(${alias}.data->>'mobileNo', '') ILIKE $${idx}`);
    params.push(`%${dataFilters.mobileNo}%`);
    idx += 1;
    delete dataFilters.mobileNo;
  }

  return appendJsonbDataFilters(conditions, params, idx, dataFilters, alias);
}

export function appendUserColumnFilters(
  conditions: string[],
  params: unknown[],
  paramIdx: number,
  filters: ColumnFilters,
): number {
  let idx = paramIdx;
  const textCols: Record<string, string> = {
    name: 'name',
    email: 'email',
    phone: 'phone',
    code: 'code',
    gender: 'gender',
  };

  for (const [key, column] of Object.entries(textCols)) {
    const value = filters[key];
    if (!value) continue;
    conditions.push(`COALESCE(${column}, '') ILIKE $${idx}`);
    params.push(`%${value}%`);
    idx += 1;
  }

  if (filters.roleId) {
    conditions.push(`role_id::text = $${idx}`);
    params.push(filters.roleId);
    idx += 1;
  }
  if (filters.sthanId) {
    conditions.push(`sthan_id::text = $${idx}`);
    params.push(filters.sthanId);
    idx += 1;
  }
  if (filters.active === 'true' || filters.active === 'false') {
    conditions.push(`active = $${idx}`);
    params.push(filters.active === 'true');
    idx += 1;
  }

  return idx;
}

export function appendLocationColumnFilters(
  conditions: string[],
  params: unknown[],
  paramIdx: number,
  filters: ColumnFilters,
): number {
  let idx = paramIdx;
  if (filters.code) {
    conditions.push(`COALESCE(code, '') ILIKE $${idx}`);
    params.push(`%${filters.code}%`);
    idx += 1;
  }
  if (filters.name) {
    conditions.push(`COALESCE(name, '') ILIKE $${idx}`);
    params.push(`%${filters.name}%`);
    idx += 1;
  }
  if (filters.level) {
    conditions.push(`level = $${idx}`);
    params.push(filters.level);
    idx += 1;
  }
  if (filters.active === 'true' || filters.active === 'false') {
    conditions.push(`active = $${idx}`);
    params.push(filters.active === 'true');
    idx += 1;
  }
  return idx;
}

export function appendPermissionColumnFilters(
  conditions: string[],
  params: unknown[],
  paramIdx: number,
  filters: ColumnFilters,
): number {
  let idx = paramIdx;
  if (filters.code) {
    conditions.push(`COALESCE(code, '') ILIKE $${idx}`);
    params.push(`%${filters.code}%`);
    idx += 1;
  }
  if (filters.name) {
    conditions.push(`COALESCE(name, '') ILIKE $${idx}`);
    params.push(`%${filters.name}%`);
    idx += 1;
  }
  if (filters.locationId) {
    conditions.push(`location_id::text = $${idx}`);
    params.push(filters.locationId);
    idx += 1;
  }
  if (filters.sreniId) {
    conditions.push(`sreni_id = $${idx}`);
    params.push(filters.sreniId);
    idx += 1;
  }
  if (filters.description) {
    conditions.push(`COALESCE(description, '') ILIKE $${idx}`);
    params.push(`%${filters.description}%`);
    idx += 1;
  }
  if (filters.active === 'true' || filters.active === 'false') {
    conditions.push(`active = $${idx}`);
    params.push(filters.active === 'true');
    idx += 1;
  }
  return idx;
}

export function appendPermissionSetColumnFilters(
  conditions: string[],
  params: unknown[],
  paramIdx: number,
  filters: ColumnFilters,
  alias = '',
): number {
  let idx = paramIdx;
  const prefix = alias ? `${alias}.` : '';
  if (filters.name) {
    conditions.push(`COALESCE(${prefix}name, '') ILIKE $${idx}`);
    params.push(`%${filters.name}%`);
    idx += 1;
  }
  if (filters.description) {
    conditions.push(`COALESCE(${prefix}description, '') ILIKE $${idx}`);
    params.push(`%${filters.description}%`);
    idx += 1;
  }
  if (filters.active === 'true' || filters.active === 'false') {
    conditions.push(`${prefix}active = $${idx}`);
    params.push(filters.active === 'true');
    idx += 1;
  }
  return idx;
}

const IN_MEMORY_EXACT_KEYS = new Set([
  'active', 'isActive', 'level', 'approvalMode', 'reviewStatus', 'joinUsVisible', 'showInUploadExcel',
]);

export function applyInMemoryColumnFilters<T>(
  rows: T[],
  filters: ColumnFilters,
  resolvers: Record<string, (row: T) => string | undefined | null>,
): T[] {
  let result = rows;
  for (const [key, value] of Object.entries(filters)) {
    if (!value.trim()) continue;
    const resolver = resolvers[key];
    if (!resolver) continue;
    const q = value.trim().toLowerCase();
    result = result.filter((row) => {
      const cell = (resolver(row) ?? '').toLowerCase();
      if (IN_MEMORY_EXACT_KEYS.has(key)) return cell === q;
      return cell.includes(q);
    });
  }
  return result;
}

export function appendSreniDefinitionColumnFilters(
  conditions: string[],
  params: unknown[],
  paramIdx: number,
  filters: ColumnFilters,
  alias = '',
): number {
  let idx = paramIdx;
  const prefix = alias ? `${alias}.` : '';
  if (filters.code) {
    conditions.push(`COALESCE(${prefix}code, '') ILIKE $${idx}`);
    params.push(`%${filters.code}%`);
    idx += 1;
  }
  if (filters.name) {
    conditions.push(`COALESCE(${prefix}name, '') ILIKE $${idx}`);
    params.push(`%${filters.name}%`);
    idx += 1;
  }
  if (filters.description) {
    conditions.push(`COALESCE(${prefix}description, '') ILIKE $${idx}`);
    params.push(`%${filters.description}%`);
    idx += 1;
  }
  if (filters.enrollmentScope) {
    conditions.push(`COALESCE(${prefix}enrollment_scope, '') = $${idx}`);
    params.push(filters.enrollmentScope);
    idx += 1;
  }
  if (filters.primaryContactStrategy) {
    conditions.push(`COALESCE(${prefix}primary_contact_strategy, '') = $${idx}`);
    params.push(filters.primaryContactStrategy);
    idx += 1;
  }
  if (filters.joinUsVisible === 'true' || filters.joinUsVisible === 'false') {
    conditions.push(`COALESCE(${prefix}join_us_visible, false) = $${idx}`);
    params.push(filters.joinUsVisible === 'true');
    idx += 1;
  }
  if (filters.active === 'true' || filters.active === 'false') {
    conditions.push(`COALESCE(${prefix}active, true) = $${idx}`);
    params.push(filters.active === 'true');
    idx += 1;
  }
  if (filters.createdBy) {
    conditions.push(`COALESCE(${prefix}created_by, '') ILIKE $${idx}`);
    params.push(`%${filters.createdBy}%`);
    idx += 1;
  }
  return idx;
}

export function appendAttendanceMetricColumnFilters(
  conditions: string[],
  params: unknown[],
  paramIdx: number,
  filters: ColumnFilters,
): number {
  let idx = paramIdx;
  if (filters.name) {
    conditions.push(`name ILIKE $${idx}`);
    params.push(`%${filters.name}%`);
    idx += 1;
  }
  if (filters.description) {
    conditions.push(`COALESCE(description, '') ILIKE $${idx}`);
    params.push(`%${filters.description}%`);
    idx += 1;
  }
  if (filters.sreniId) {
    conditions.push(`sreni_id = $${idx}`);
    params.push(filters.sreniId);
    idx += 1;
  }
  if (filters.keys) {
    conditions.push(`EXISTS (SELECT 1 FROM unnest(metric_keys) AS k WHERE k ILIKE $${idx})`);
    params.push(`%${filters.keys}%`);
    idx += 1;
  }
  if (filters.active === 'true' || filters.active === 'false') {
    conditions.push(`active = $${idx}`);
    params.push(filters.active === 'true');
    idx += 1;
  }
  return idx;
}

export function appendJoinUsColumnFilters(
  conditions: string[],
  params: unknown[],
  paramIdx: number,
  filters: ColumnFilters,
  alias = 'c',
): number {
  let idx = paramIdx;
  if (filters.name) {
    conditions.push(`COALESCE(${alias}.data->>'name', '') ILIKE $${idx}`);
    params.push(`%${filters.name}%`);
    idx += 1;
  }
  if (filters.mobileNo) {
    conditions.push(`COALESCE(${alias}.data->>'mobileNo', '') ILIKE $${idx}`);
    params.push(`%${filters.mobileNo}%`);
    idx += 1;
  }
  if (filters.interestedSreniId) {
    conditions.push(`EXISTS (
      SELECT 1 FROM adwest.contact_sreni_tags cst
      WHERE cst.contact_id = ${alias}.id AND cst.sreni_id = $${idx}
    )`);
    params.push(filters.interestedSreniId);
    idx += 1;
  }
  if (filters.familyOrBachelor) {
    conditions.push(`COALESCE(${alias}.data->>'familyOrBachelor', '') ILIKE $${idx}`);
    params.push(`%${filters.familyOrBachelor}%`);
    idx += 1;
  }
  if (filters.reviewStatus) {
    conditions.push(`COALESCE(${alias}.review_status, 'pending') = $${idx}`);
    params.push(filters.reviewStatus);
    idx += 1;
  }
  return idx;
}
