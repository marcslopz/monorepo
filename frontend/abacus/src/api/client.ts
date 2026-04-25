import { authClient } from '../auth/neonAuth'

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

  if (res.status === 401 && authClient) {
    const result = await authClient.getSession()
    const jwt = result.data?.session?.token
    if (jwt) {
      localStorage.setItem('abacus_token', jwt)
      const retry = await fetch(`${BASE}${path}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${jwt}`,
        },
        body: body !== undefined ? JSON.stringify(body) : undefined,
      })
      if (!retry.ok) {
        const text = await retry.text()
        throw new Error(`${retry.status}: ${text}`)
      }
      if (retry.status === 204) return undefined as T
      return retry.json() as Promise<T>
    }
  }

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`${res.status}: ${text}`)
  }
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}
