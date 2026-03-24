import type { Comment, CommentCreate, Piso, PisoCreate, PisoUpdate, PriceHistory, PriceHistoryCreate, SseEvent } from '../types/piso'
import { apiClient } from './client'
import { fetchSSE } from './sse'

const BASE = (import.meta.env.VITE_MARILAND_API_BASE_URL ?? '') + '/api'

export const pisosApi = {
  list: () => apiClient.get<Piso[]>('/pisos/'),
  get: (id: number) => apiClient.get<Piso>(`/pisos/${id}`),
  create: (data: PisoCreate) => apiClient.post<Piso>('/pisos/', data),
  importFromUrlStream: (url: string, onEvent: (event: SseEvent) => void, signal?: AbortSignal) =>
    fetchSSE(`${BASE}/pisos/from-url`, { url }, (data) => onEvent(data as SseEvent), signal),
  update: (id: number, data: PisoUpdate) => apiClient.put<Piso>(`/pisos/${id}`, data),
  delete: (id: number) => apiClient.delete<void>(`/pisos/${id}`),
}

export const commentsApi = {
  add: (pisoId: number, data: CommentCreate) =>
    apiClient.post<Comment>(`/pisos/${pisoId}/comments`, data),
  delete: (pisoId: number, commentId: number) =>
    apiClient.delete<void>(`/pisos/${pisoId}/comments/${commentId}`),
}

export const pricesApi = {
  add: (pisoId: number, data: PriceHistoryCreate) =>
    apiClient.post<PriceHistory>(`/pisos/${pisoId}/prices`, data),
  delete: (pisoId: number, priceId: number) =>
    apiClient.delete<void>(`/pisos/${pisoId}/prices/${priceId}`),
}
