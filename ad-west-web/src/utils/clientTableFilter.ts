export type ClientFilterAccessor<T> = {
  getValue: (row: T) => string;
  match?: 'contains' | 'exact';
};

export function applyClientColumnFilters<T>(
  rows: T[],
  filters: Record<string, string>,
  accessors: Record<string, ClientFilterAccessor<T>>,
): T[] {
  const entries = Object.entries(filters).filter(([, value]) => value.trim());
  if (!entries.length) return rows;

  return rows.filter((row) => entries.every(([key, filterVal]) => {
    const accessor = accessors[key];
    if (!accessor) return true;
    const cell = accessor.getValue(row).toLowerCase();
    const q = filterVal.trim().toLowerCase();
    if (accessor.match === 'exact') return cell === q;
    return cell.includes(q);
  }));
}
