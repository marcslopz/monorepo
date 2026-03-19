import { config } from '../config'

interface RequestOptions extends RequestInit {
  params?: Record<string, string | number>
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { params, ...init } = options

  let url = `${config.apiBaseUrl}${path}`
  if (params) {
    const search = new URLSearchParams(
      Object.entries(params).map(([k, v]) => [k, String(v)])
    )
    url += `?${search}`
  }

  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...init.headers,
    },
    ...init,
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Unknown error' }))
    throw new Error(error.detail ?? `HTTP ${response.status}`)
  }

  if (response.status === 204) {
    return undefined as T
  }

  return response.json() as Promise<T>
}

export const apiClient = {
  get: <T>(path: string, options?: RequestOptions) =>
    request<T>(path, { method: 'GET', ...options }),
  post: <T>(path: string, body: unknown, options?: RequestOptions) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body), ...options }),
  patch: <T>(path: string, body: unknown, options?: RequestOptions) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(body), ...options }),
  delete: <T>(path: string, options?: RequestOptions) =>
    request<T>(path, { method: 'DELETE', ...options }),
}
