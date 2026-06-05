import { isCrossOriginApiBaseUrl, normalizeApiBaseUrl } from './apiBaseUrl'

const API_URL = normalizeApiBaseUrl(import.meta.env.VITE_API_URL)
const REQUEST_TIMEOUT_MS = Number(import.meta.env.VITE_API_TIMEOUT_MS || 15000)

export interface RequestRetryOptions {
  attempts?: number
  delayMs?: number
}

interface RequestOptions {
  token?: string
  timeoutMs?: number
  retry?: RequestRetryOptions
}

const sleep = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms))

function isTransientStatus(status: number): boolean {
  return status === 502 || status === 503 || status === 504
}

function isTransientFetchError(error: unknown): boolean {
  if (error instanceof DOMException && error.name === 'AbortError') {
    return false
  }
  if (error instanceof TypeError) {
    return true
  }
  if (error instanceof Error) {
    const message = error.message.toLowerCase()
    return (
      message.includes('failed to fetch')
      || message.includes('networkerror')
      || message.includes('network request failed')
      || message.includes('load failed')
    )
  }
  return false
}

function toFetchError(error: unknown): Error {
  if (error instanceof Error && isTransientFetchError(error)) {
    if (isCrossOriginApiBaseUrl(API_URL)) {
      return new Error(
        'Cannot reach the API server. Use VITE_API_URL=/api/v1 on Vercel (with vercel.json proxy) or add your site to CORS_ORIGIN on Railway.',
      )
    }
    return new Error(
      'Cannot reach the API server. Start ad-west-api (npm run start:dev on port 3001) and retry.',
    )
  }
  return error instanceof Error ? error : new Error('Request failed.')
}

async function parseError(response: Response): Promise<Error> {
  try {
    const payload = await response.json()
    // message may be a string or an array (NestJS validation errors).
    // error is the top-level field our global exception filter emits.
    const message = Array.isArray(payload?.message)
      ? payload.message.join(', ')
      : payload?.message || payload?.error || response.statusText
    return new Error(message)
  } catch {
    return new Error(response.statusText || `Request failed (${response.status})`)
  }
}

function createHeaders(token?: string): HeadersInit {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  }

  const resolvedToken = token || localStorage.getItem('adwest_token') || undefined
  if (resolvedToken) {
    headers.Authorization = `Bearer ${resolvedToken}`
  }

  return headers
}

function normalizeEndpoint(endpoint: string): string {
  if (!endpoint.startsWith('/')) {
    throw new Error('API endpoint must start with "/".')
  }
  if (endpoint.startsWith('//') || /^https?:\/\//i.test(endpoint)) {
    throw new Error('Absolute URLs are not allowed in API endpoint calls.')
  }
  return endpoint
}

async function requestOnce<T>(endpoint: string, init: RequestInit, timeoutMs: number): Promise<T> {
  const controller = new AbortController()
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(`${API_URL}${normalizeEndpoint(endpoint)}`, {
      ...init,
      cache: 'no-store',
      signal: controller.signal,
    })
    if (!response.ok) {
      const error = await parseError(response)
      if (isTransientStatus(response.status)) {
        throw Object.assign(error, { transient: true })
      }
      throw error
    }

    const text = await response.text()
    return (text ? JSON.parse(text) : undefined) as T
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error(`Request timed out after ${timeoutMs}ms`)
    }
    throw error
  } finally {
    window.clearTimeout(timeoutId)
  }
}

function shouldRetryRequest(error: unknown): boolean {
  if (error && typeof error === 'object' && 'transient' in error) {
    return true
  }
  if (isCrossOriginApiBaseUrl(API_URL) && isTransientFetchError(error)) {
    return false
  }
  return isTransientFetchError(error)
}

async function request<T>(
  endpoint: string,
  init: RequestInit,
  timeoutMs: number,
  retry?: RequestRetryOptions,
): Promise<T> {
  const attempts = Math.max(1, retry?.attempts ?? 1)
  const delayMs = Math.max(0, retry?.delayMs ?? 1500)

  let lastError: unknown
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await requestOnce<T>(endpoint, init, timeoutMs)
    } catch (error) {
      lastError = error
      if (!shouldRetryRequest(error) || attempt === attempts) {
        throw toFetchError(error)
      }
      await sleep(delayMs)
    }
  }

  throw toFetchError(lastError)
}

export const api = {
  async get<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return request<T>(endpoint, {
      headers: createHeaders(options?.token),
    }, options?.timeoutMs ?? REQUEST_TIMEOUT_MS, options?.retry)
  },

  async getBlob(endpoint: string, options?: RequestOptions): Promise<Blob> {
    const controller = new AbortController()
    const timeoutMs = options?.timeoutMs ?? REQUEST_TIMEOUT_MS
    const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs)

    try {
      const response = await fetch(`${API_URL}${normalizeEndpoint(endpoint)}`, {
        headers: createHeaders(options?.token),
        cache: 'no-store',
        signal: controller.signal,
      })
      if (!response.ok) throw await parseError(response)
      return response.blob()
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new Error(`Request timed out after ${timeoutMs}ms`)
      }
      throw error
    } finally {
      window.clearTimeout(timeoutId)
    }
  },

  async post<T>(endpoint: string, data: unknown, options?: RequestOptions): Promise<T> {
    return request<T>(endpoint, {
      method: 'POST',
      headers: createHeaders(options?.token),
      body: JSON.stringify(data),
    }, options?.timeoutMs ?? REQUEST_TIMEOUT_MS, options?.retry)
  },

  async patch<T>(endpoint: string, data: unknown, options?: RequestOptions): Promise<T> {
    return request<T>(endpoint, {
      method: 'PATCH',
      headers: createHeaders(options?.token),
      body: JSON.stringify(data),
    }, options?.timeoutMs ?? REQUEST_TIMEOUT_MS)
  },

  async put<T>(endpoint: string, data: unknown, options?: RequestOptions): Promise<T> {
    return request<T>(endpoint, {
      method: 'PUT',
      headers: createHeaders(options?.token),
      body: JSON.stringify(data),
    }, options?.timeoutMs ?? REQUEST_TIMEOUT_MS)
  },

  async delete<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return request<T>(endpoint, {
      method: 'DELETE',
      headers: createHeaders(options?.token),
    }, options?.timeoutMs ?? REQUEST_TIMEOUT_MS)
  },

  /** POST with a FormData body (for file uploads — no Content-Type override) */
  async postForm<T>(endpoint: string, form: FormData, options?: RequestOptions): Promise<T> {
    const resolvedToken = options?.token || localStorage.getItem('adwest_token') || undefined
    const headers: Record<string, string> = {}
    if (resolvedToken) headers.Authorization = `Bearer ${resolvedToken}`

    return request<T>(endpoint, {
      method: 'POST',
      headers,
      body: form,
    }, options?.timeoutMs ?? REQUEST_TIMEOUT_MS)
  },
}
