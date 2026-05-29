const API_URL = import.meta.env.VITE_API_URL || '/api/v1'

interface RequestOptions {
  token?: string
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
  }

  const resolvedToken = token || localStorage.getItem('adwest_token') || undefined
  if (resolvedToken) {
    headers.Authorization = `Bearer ${resolvedToken}`
  }

  return headers
}

export const api = {
  async get<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    const response = await fetch(`${API_URL}${endpoint}`, {
      headers: createHeaders(options?.token),
      cache: 'no-store',
    })
    if (!response.ok) throw await parseError(response)
    return response.json()
  },

  async getBlob(endpoint: string, options?: RequestOptions): Promise<Blob> {
    const response = await fetch(`${API_URL}${endpoint}`, {
      headers: createHeaders(options?.token),
      cache: 'no-store',
    })
    if (!response.ok) throw await parseError(response)
    return response.blob()
  },

  async post<T>(endpoint: string, data: unknown, options?: RequestOptions): Promise<T> {
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'POST',
      headers: createHeaders(options?.token),
      body: JSON.stringify(data),
      cache: 'no-store',
    })
    if (!response.ok) throw await parseError(response)
    return response.json()
  },

  async patch<T>(endpoint: string, data: unknown, options?: RequestOptions): Promise<T> {
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'PATCH',
      headers: createHeaders(options?.token),
      body: JSON.stringify(data),
      cache: 'no-store',
    })
    if (!response.ok) throw await parseError(response)
    return response.json()
  },

  async put<T>(endpoint: string, data: unknown, options?: RequestOptions): Promise<T> {
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'PUT',
      headers: createHeaders(options?.token),
      body: JSON.stringify(data),
      cache: 'no-store',
    })
    if (!response.ok) throw await parseError(response)
    return response.json()
  },

  async delete<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'DELETE',
      headers: createHeaders(options?.token),
      cache: 'no-store',
    })
    if (!response.ok) throw await parseError(response)
    const text = await response.text()
    return (text ? JSON.parse(text) : undefined) as T
  },

  /** POST with a FormData body (for file uploads — no Content-Type override) */
  async postForm<T>(endpoint: string, form: FormData, options?: RequestOptions): Promise<T> {
    const resolvedToken = options?.token || localStorage.getItem('adwest_token') || undefined
    const headers: Record<string, string> = {}
    if (resolvedToken) headers.Authorization = `Bearer ${resolvedToken}`
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'POST',
      headers,
      body: form,
      cache: 'no-store',
    })
    if (!response.ok) throw await parseError(response)
    return response.json()
  },
}
