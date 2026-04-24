const BASE = (import.meta.env.VITE_ABACUS_API_BASE_URL ?? '') + '/api'

function getAuthHeader(): Record<string, string> {
  const token = localStorage.getItem('abacus_token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export async function request<T>(
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader(),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`${res.status}: ${text}`)
  }
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}
