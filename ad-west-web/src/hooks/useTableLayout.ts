import { useCallback, useEffect, useState } from 'react';
import { backendApi, TableLayoutApi } from '../utils/backendApi';

export interface ColumnItem {
  key: string;
  label: string;
  visible: boolean;
}

export function buildColumnItems(
  all: Array<{ key: string; label: string }>,
  saved: Array<{ key: string; visible: boolean }> | null,
): ColumnItem[] {
  if (!saved || saved.length === 0) return all.map((c) => ({ ...c, visible: true }));

  const labelMap = new Map(all.map((c) => [c.key, c.label]));
  const result: ColumnItem[] = [];
  const seen = new Set<string>();

  for (const sc of saved) {
    if (labelMap.has(sc.key)) {
      result.push({ key: sc.key, label: labelMap.get(sc.key)!, visible: sc.visible });
      seen.add(sc.key);
    }
  }
  // Append any new columns not in the saved layout (visible by default)
  for (const c of all) {
    if (!seen.has(c.key)) result.push({ ...c, visible: true });
  }
  return result;
}

export function useTableLayout(tableKey: string, options?: { enabled?: boolean }) {
  const enabled = options?.enabled ?? true;
  const [layouts, setLayouts] = useState<TableLayoutApi[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loading, setLoading] = useState(enabled);

  const load = useCallback(() => {
    setLoading(true);
    backendApi.listTableLayouts(tableKey)
      .then((res) => {
        setLayouts(res.layouts);
        setActiveId(res.activeId);
      })
      .catch(() => { /* non-critical — table just uses default */ })
      .finally(() => setLoading(false));
  }, [tableKey]);

  useEffect(() => {
    if (!enabled) return;
    load();
  }, [load, enabled]);

  // Returns ColumnItems (ordered, with visibility) for given full column list
  const getColumnItems = useCallback(
    (all: Array<{ key: string; label: string }>): ColumnItem[] => {
      const layout = activeId ? layouts.find((l) => l.id === activeId) : null;
      return buildColumnItems(all, layout?.columns ?? null);
    },
    [layouts, activeId],
  );

  // Returns just the visible column keys in layout order
  const visibleKeys = useCallback(
    (all: Array<{ key: string; label: string }>): string[] =>
      getColumnItems(all).filter((c) => c.visible).map((c) => c.key),
    [getColumnItems],
  );

  const createLayout = useCallback(
    async (name: string, cols: ColumnItem[], setActive = true): Promise<TableLayoutApi> => {
      const layout = await backendApi.createTableLayout({
        tableKey,
        name,
        columns: cols.map((c) => ({ key: c.key, visible: c.visible })),
        setActive,
      });
      setLayouts((prev) => [
        ...prev.map((l) => (setActive ? { ...l, isActive: false } : l)),
        { ...layout, isActive: setActive },
      ]);
      if (setActive) setActiveId(layout.id);
      return layout;
    },
    [tableKey],
  );

  const updateLayout = useCallback(
    async (id: string, cols: ColumnItem[], name?: string): Promise<TableLayoutApi> => {
      const updated = await backendApi.updateTableLayout(id, {
        ...(name !== undefined ? { name } : {}),
        columns: cols.map((c) => ({ key: c.key, visible: c.visible })),
      });
      setLayouts((prev) => prev.map((l) => (l.id === id ? { ...l, ...updated } : l)));
      return updated;
    },
    [],
  );

  const deleteLayout = useCallback(
    async (id: string): Promise<void> => {
      await backendApi.deleteTableLayout(id);
      setLayouts((prev) => prev.filter((l) => l.id !== id));
      if (activeId === id) setActiveId(null);
    },
    [activeId],
  );

  const activateLayout = useCallback(
    async (id: string | null): Promise<void> => {
      await backendApi.setActiveTableLayout(tableKey, id);
      setLayouts((prev) => prev.map((l) => ({ ...l, isActive: l.id === id })));
      setActiveId(id);
    },
    [tableKey],
  );

  const activeLayoutName = activeId
    ? (layouts.find((l) => l.id === activeId)?.name ?? null)
    : null;

  return {
    layouts,
    activeId,
    activeLayoutName,
    loading,
    getColumnItems,
    visibleKeys,
    createLayout,
    updateLayout,
    deleteLayout,
    activateLayout,
    reload: load,
  };
}
