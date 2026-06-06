import { useEffect, useState } from 'react';

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined') {
      return false;
    }
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    const mediaQuery = window.matchMedia(query);
    const onChange = () => setMatches(mediaQuery.matches);
    mediaQuery.addEventListener('change', onChange);
    setMatches(mediaQuery.matches);
    return () => mediaQuery.removeEventListener('change', onChange);
  }, [query]);

  return matches;
}

export const MOBILE_LAYOUT_QUERY = '(max-width: 768px)';
