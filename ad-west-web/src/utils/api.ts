const API_URL = import.meta.env.VITE_API_URL || '/api/v1'

interface RequestOptions {
  token?: string
}

async function parseError(response: Response): Promise<Error> {
  try {
    const payload = await response.json()
    const message = Array.isArray(payload?.message)
      ? payload.message.join(', ')
      : payload?.message || response.statusText
    return new Error(`API error (${response.status}): ${message}`)
  } catch {
    return new Error(`API error (${response.status}): ${response.statusText}`)
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
    })
    if (!response.ok) throw await parseError(response)
    return response.json()
  },

  async post<T>(endpoint: string, data: unknown, options?: RequestOptions): Promise<T> {
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'POST',
      headers: createHeaders(options?.token),
      body: JSON.stringify(data),
    })
    if (!response.ok) throw await parseError(response)
    return response.json()
  },

  async patch<T>(endpoint: string, data: unknown, options?: RequestOptions): Promise<T> {
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'PATCH',
      headers: createHeaders(options?.token),
      body: JSON.stringify(data),
    })
    if (!response.ok) throw await parseError(response)
    return response.json()
  },

  async put<T>(endpoint: string, data: unknown, options?: RequestOptions): Promise<T> {
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'PUT',
      headers: createHeaders(options?.token),
      body: JSON.stringify(data),
    })
    if (!response.ok) throw await parseError(response)
    return response.json()
  },

  async delete<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'DELETE',
      headers: createHeaders(options?.token),
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
    })
    if (!response.ok) throw await parseError(response)
    return response.json()
  },
}
