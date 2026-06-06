import { useEffect, useState } from 'react';
import { backendApi, EnumValueApi } from '../utils/backendApi';

/** Load active enum options from Reference Data for dropdowns and labels. */
export function useEnumOptions(enumType: string, activeOnly = true) {
  const [options, setOptions] = useState<EnumValueApi[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    backendApi.listEnumValues(enumType, activeOnly)
      .then(setOptions)
      .catch(() => setOptions([]))
      .finally(() => setLoading(false));
  }, [enumType, activeOnly]);

  const labelByValue = (value: string) =>
    options.find((o) => o.value === value)?.label ?? value;

  return { options, loading, labelByValue };
}
