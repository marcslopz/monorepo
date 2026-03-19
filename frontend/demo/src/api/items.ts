import { apiClient } from './client'
import type { Item, ItemCreate, ItemListResponse, ItemUpdate } from '../types/item'

const BASE = '/api/v1/items'

export const itemsApi = {
  list: (limit = 100, offset = 0) =>
    apiClient.get<ItemListResponse>(BASE, { params: { limit, offset } }),

  get: (id: string) =>
    apiClient.get<Item>(`${BASE}/${id}`),

  create: (data: ItemCreate) =>
    apiClient.post<Item>(BASE, data),

  update: (id: string, data: ItemUpdate) =>
    apiClient.patch<Item>(`${BASE}/${id}`, data),

  delete: (id: string) =>
    apiClient.delete<void>(`${BASE}/${id}`),
}
