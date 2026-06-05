export function normalizeApiBaseUrl(raw: string | undefined): string {
  const value = (raw || '/api/v1').trim()
  const withoutTrailingSlash = value.replace(/\/+$/, '')
  if (withoutTrailingSlash.endsWith('/api/v1')) {
    return withoutTrailingSlash
  }
  if (withoutTrailingSlash.endsWith('/api')) {
    return `${withoutTrailingSlash}/v1`
  }
  return withoutTrailingSlash
}

export function isCrossOriginApiBaseUrl(apiBaseUrl: string): boolean {
  if (!/^https?:\/\//i.test(apiBaseUrl)) {
    return false
  }
  if (typeof window === 'undefined') {
    return true
  }
  try {
    return new URL(apiBaseUrl).origin !== window.location.origin
  } catch {
    return true
  }
}
