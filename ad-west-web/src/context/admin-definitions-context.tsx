import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  backendApi,
  LocationDefinitionApi,
  SreniDefinitionApi,
  SthanBasicApi,
} from '../utils/backendApi';

export interface AdminDefinitionsContextValue {
  sreniDefinitions: SreniDefinitionApi[];
  locationDefinitions: LocationDefinitionApi[];
  uploadSrenies: Array<{ id: string; name: string }>;
  locationNames: Array<{ name: string; level: string }>;
  activeSthanLocations: LocationDefinitionApi[];
  refreshDefinitions: () => Promise<void>;
  ensureSthansLoaded: () => void;
  sthans: SthanBasicApi[];
  sthansLoading: boolean;
}

const AdminDefinitionsContext = createContext<AdminDefinitionsContextValue | null>(null);

const EMPTY: AdminDefinitionsContextValue = {
  sreniDefinitions: [],
  locationDefinitions: [],
  uploadSrenies: [],
  locationNames: [],
  activeSthanLocations: [],
  refreshDefinitions: async () => {},
  ensureSthansLoaded: () => {},
  sthans: [],
  sthansLoading: false,
};

interface AdminDefinitionsProviderProps {
  children: React.ReactNode;
  sreniDefinitions: SreniDefinitionApi[];
  locationDefinitions: LocationDefinitionApi[];
  onRefresh?: () => Promise<void>;
}

export function AdminDefinitionsProvider({
  children,
  sreniDefinitions,
  locationDefinitions,
  onRefresh,
}: AdminDefinitionsProviderProps) {
  const [sthans, setSthans] = useState<SthanBasicApi[]>([]);
  const [sthansLoading, setSthansLoading] = useState(false);
  const sthansLoadStarted = useRef(false);

  const uploadSrenies = useMemo(
    () => sreniDefinitions
      .filter((s) => s.showInUploadExcel)
      .map((s) => ({ id: s.id, name: s.name })),
    [sreniDefinitions],
  );

  const locationNames = useMemo(
    () => locationDefinitions.map((l) => ({ name: l.name, level: l.level })),
    [locationDefinitions],
  );

  const activeSthanLocations = useMemo(
    () => locationDefinitions.filter((l) => l.level === 'STHAN' && l.active),
    [locationDefinitions],
  );

  const ensureSthansLoaded = useCallback(() => {
    if (sthansLoadStarted.current) return;
    sthansLoadStarted.current = true;
    setSthansLoading(true);
    backendApi.listSthans()
      .then(setSthans)
      .catch(() => { sthansLoadStarted.current = false; })
      .finally(() => setSthansLoading(false));
  }, []);

  const refreshDefinitions = useCallback(async () => {
    if (onRefresh) await onRefresh();
  }, [onRefresh]);

  const value = useMemo<AdminDefinitionsContextValue>(
    () => ({
      sreniDefinitions,
      locationDefinitions,
      uploadSrenies,
      locationNames,
      activeSthanLocations,
      refreshDefinitions,
      ensureSthansLoaded,
      sthans,
      sthansLoading,
    }),
    [
      sreniDefinitions,
      locationDefinitions,
      uploadSrenies,
      locationNames,
      activeSthanLocations,
      refreshDefinitions,
      ensureSthansLoaded,
      sthans,
      sthansLoading,
    ],
  );

  return (
    <AdminDefinitionsContext.Provider value={value}>
      {children}
    </AdminDefinitionsContext.Provider>
  );
}

export function useAdminDefinitions(): AdminDefinitionsContextValue {
  return useContext(AdminDefinitionsContext) ?? EMPTY;
}
