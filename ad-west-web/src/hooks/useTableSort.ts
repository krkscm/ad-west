import { useCallback, useState } from 'react';

export type TableSortDirection = 'asc' | 'desc';

export type TableSortState = {
  sortBy?: string;
  sortDir: TableSortDirection;
};

export function useTableSort() {
  const [sort, setSort] = useState<TableSortState>({ sortDir: 'asc' });

  const toggleSort = useCallback((key: string) => {
    setSort((prev) => {
      if (prev.sortBy !== key) {
        return { sortBy: key, sortDir: 'asc' };
      }
      if (prev.sortDir === 'asc') {
        return { sortBy: key, sortDir: 'desc' };
      }
      return { sortDir: 'asc' };
    });
  }, []);

  const clearSort = useCallback(() => {
    setSort({ sortDir: 'asc' });
  }, []);

  return {
    sortBy: sort.sortBy,
    sortDir: sort.sortDir,
    toggleSort,
    clearSort,
    sortQuery: sort.sortBy
      ? { sortBy: sort.sortBy, sortDir: sort.sortDir }
      : undefined,
  };
}
