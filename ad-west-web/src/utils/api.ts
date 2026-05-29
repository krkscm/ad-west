const API_URL = import.meta.env.VITE_API_URL || '/api/v1'
const REQUEST_TIMEOUT_MS = Number(import.meta.env.VITE_API_TIMEOUT_MS || 15000)

interface RequestOptions {
  token?: string
  timeoutMs?: number
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

async function request<T>(endpoint: string, init: RequestInit, timeoutMs: number): Promise<T> {
  const controller = new AbortController()
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(`${API_URL}${normalizeEndpoint(endpoint)}`, {
      ...init,
      cache: 'no-store',
      signal: controller.signal,
    })
    if (!response.ok) throw await parseError(response)

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

export const api = {
  async get<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return request<T>(endpoint, {
      headers: createHeaders(options?.token),
    }, options?.timeoutMs ?? REQUEST_TIMEOUT_MS)
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
    }, options?.timeoutMs ?? REQUEST_TIMEOUT_MS)
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
