import { useEffect, useState } from 'react';
import { backendApi, EnumValueApi } from '../utils/backendApi';

interface UseEnumOptionsConfig {
  activeOnly?: boolean;
  enabled?: boolean;
}

/** Load active enum options from Reference Data for dropdowns and labels. */
export function useEnumOptions(
  enumType: string,
  activeOnlyOrConfig: boolean | UseEnumOptionsConfig = true,
) {
  const config = typeof activeOnlyOrConfig === 'boolean'
    ? { activeOnly: activeOnlyOrConfig, enabled: true }
    : { activeOnly: activeOnlyOrConfig.activeOnly ?? true, enabled: activeOnlyOrConfig.enabled ?? true };
  const { activeOnly, enabled } = config;

  const [options, setOptions] = useState<EnumValueApi[]>([]);
  const [loading, setLoading] = useState(enabled);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    setLoading(true);
    backendApi.listEnumValues(enumType, activeOnly)
      .then(setOptions)
      .catch(() => setOptions([]))
      .finally(() => setLoading(false));
  }, [enumType, activeOnly, enabled]);

  const labelByValue = (value: string) =>
    options.find((o) => o.value === value)?.label ?? value;

  return { options, loading, labelByValue };
}
