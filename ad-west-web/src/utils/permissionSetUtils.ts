import type { LocationDefinitionApi, PermissionApi, SreniDefinitionApi } from './backendApi';

export const formatPermissionLabel = (
  p: PermissionApi | undefined,
  pid: string,
  locationById: Map<string, LocationDefinitionApi>,
  sreniById: Map<string, SreniDefinitionApi>,
): string => {
  if (!p) return `${pid.slice(0, 8)}…`;
  if (p.name?.trim()) return p.name;
  const loc = locationById.get(p.locationId);
  const sreni = sreniById.get(p.sreniId);
  if (loc && sreni) return `${loc.name} — ${sreni.name}`;
  return p.code;
};
