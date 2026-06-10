import type { TableSortDirection } from '../hooks/useTableSort';

export type ClientSortAccessor<T> = {
  getValue: (row: T) => string | number | boolean | undefined | null;
};

export function applyClientColumnSort<T>(
  rows: T[],
  sortBy: string | undefined,
  sortDir: TableSortDirection | undefined,
  accessors: Record<string, ClientSortAccessor<T>>,
): T[] {
  if (!sortBy) return rows;
  const accessor = accessors[sortBy];
  if (!accessor) return rows;

  const dir = sortDir === 'desc' ? -1 : 1;
  return [...rows].sort((a, b) => {
    const av = accessor.getValue(a);
    const bv = accessor.getValue(b);
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
