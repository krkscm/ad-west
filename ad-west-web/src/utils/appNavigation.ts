export function normalizePathname(pathname: string): string {
  return pathname.replace(/\/+$/, '') || '/';
}

type NavigationListener = () => void;

const listeners = new Set<NavigationListener>();
let historyPatched = false;

function notifyNavigationListeners(): void {
  listeners.forEach((listener) => listener());
}

function ensureHistoryPatched(): void {
  if (historyPatched || typeof window === 'undefined') {
    return;
  }

  historyPatched = true;

  window.addEventListener('popstate', notifyNavigationListeners);

  const { pushState, replaceState } = window.history;
  window.history.pushState = function pushStatePatched(...args) {
    pushState.apply(this, args);
    notifyNavigationListeners();
  };
  window.history.replaceState = function replaceStatePatched(...args) {
    replaceState.apply(this, args);
    notifyNavigationListeners();
  };
}

export function subscribeNavigation(listener: NavigationListener): () => void {
  ensureHistoryPatched();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getAppPathname(): string {
  return normalizePathname(window.location.pathname);
}

export function getAppSearch(): string {
  return window.location.search;
}

export interface NavigateOptions {
  replace?: boolean;
  scroll?: boolean;
}

/** Client-side navigation — updates the URL without a full page reload. */
export function navigateTo(to: string, options: NavigateOptions = {}): void {
  ensureHistoryPatched();

  const target = new URL(to, window.location.origin);
  const nextUrl = `${target.pathname}${target.search}${target.hash}`;
  const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;

  if (nextUrl === currentUrl) {
    return;
  }

  if (options.replace) {
    window.history.replaceState(window.history.state, '', nextUrl);
  } else {
    window.history.pushState(window.history.state, '', nextUrl);
  }

  notifyNavigationListeners();

  if (options.scroll !== false) {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }
}

/** Intercept same-origin anchor clicks so internal links behave like an SPA. */
export function handleInternalLinkClick(event: MouseEvent): void {
  if (event.defaultPrevented || event.button !== 0) {
    return;
  }
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
    return;
  }

  const target = event.target;
  if (!(target instanceof Element)) {
    return;
  }

  const anchor = target.closest('a[href]');
  if (!(anchor instanceof HTMLAnchorElement) || anchor.target === '_blank' || anchor.hasAttribute('download')) {
    return;
  }

  const href = anchor.getAttribute('href');
  if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) {
    return;
  }

  let url: URL;
  try {
    url = new URL(href, window.location.origin);
  } catch {
    return;
  }

  if (url.origin !== window.location.origin) {
    return;
  }

  event.preventDefault();
  navigateTo(`${url.pathname}${url.search}${url.hash}`);
}
