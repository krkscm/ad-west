const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'

export const api = {
  async get<T>(endpoint: string): Promise<T> {
    const response = await fetch(`${API_URL}${endpoint}`)
    if (!response.ok) throw new Error(`API error: ${response.statusText}`)
    return response.json()
  },

  async post<T>(endpoint: string, data: unknown): Promise<T> {
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!response.ok) throw new Error(`API error: ${response.statusText}`)
    return response.json()
  },

  async put<T>(endpoint: string, data: unknown): Promise<T> {
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!response.ok) throw new Error(`API error: ${response.statusText}`)
    return response.json()
  },

  async delete<T>(endpoint: string): Promise<T> {
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'DELETE',
    })
    if (!response.ok) throw new Error(`API error: ${response.statusText}`)
    return response.json()
  },
}
