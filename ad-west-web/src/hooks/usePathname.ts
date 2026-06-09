import { useEffect, useState, useCallback } from 'react';
import {
  getAppPathname,
  getAppSearch,
  navigateTo,
  subscribeNavigation,
  type NavigateOptions,
} from '../utils/appNavigation';

export { normalizePathname } from '../utils/appNavigation';

/** Keeps React in sync with client-side and browser URL changes. */
export function usePathname(): string {
  const [pathname, setPathname] = useState(getAppPathname);

  useEffect(() => subscribeNavigation(() => setPathname(getAppPathname())), []);

  return pathname;
}

/** Pathname + query string — re-renders when either changes. */
export function useAppLocation(): { pathname: string; search: string } {
  const [location, setLocation] = useState(() => ({
    pathname: getAppPathname(),
    search: getAppSearch(),
  }));

  useEffect(() => subscribeNavigation(() => {
    setLocation({ pathname: getAppPathname(), search: getAppSearch() });
  }), []);

  return location;
}

export function useNavigate() {
  return useCallback((to: string, options?: NavigateOptions) => navigateTo(to, options), []);
}
