export interface Item {
  id: string
  name: string
  description: string | null
  created_at: string
  updated_at: string
}

export interface ItemCreate {
  name: string
  description?: string
}

export interface ItemUpdate {
  name?: string
  description?: string
}

export interface ItemListResponse {
  items: Item[]
  total: number
}
