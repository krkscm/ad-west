import { useEffect } from 'react';
import { handleInternalLinkClick } from '../../utils/appNavigation';

/** Turns same-origin <a href> clicks into client-side navigation app-wide. */
export function InternalLinkInterceptor() {
  useEffect(() => {
    document.addEventListener('click', handleInternalLinkClick);
    return () => document.removeEventListener('click', handleInternalLinkClick);
  }, []);

  return null;
}
