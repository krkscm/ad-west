import { useCallback, useRef, useState } from 'react';

export function serializeColumnFilters(filters: Record<string, string>): string | undefined {
  const entries = Object.entries(filters).filter(([, value]) => value.trim());
  if (!entries.length) return undefined;
  return JSON.stringify(Object.fromEntries(entries.map(([k, v]) => [k, v.trim()])));
}

export function useTableColumnFilters(debounceMs = 400) {
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [debouncedFilters, setDebouncedFilters] = useState<Record<string, string>>({});
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setFilter = useCallback((key: string, value: string) => {
    setFilters((prev) => {
      const next = { ...prev, [key]: value };
      if (!value.trim()) {
        delete next[key];
      }
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        setDebouncedFilters(next);
      }, debounceMs);
      return next;
    });
  }, [debounceMs]);

  const clearFilters = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setFilters({});
    setDebouncedFilters({});
  }, []);

  return {
    filters,
    debouncedFilters,
    setFilter,
    clearFilters,
    filtersQuery: serializeColumnFilters(debouncedFilters),
  };
}
