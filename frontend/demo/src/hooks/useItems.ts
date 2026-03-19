import { useCallback, useEffect, useState } from 'react'
import { itemsApi } from '../api/items'
import type { Item, ItemCreate } from '../types/item'

interface UseItemsResult {
  items: Item[]
  loading: boolean
  error: string | null
  createItem: (data: ItemCreate) => Promise<void>
  deleteItem: (id: string) => Promise<void>
  refetch: () => void
}

export function useItems(): UseItemsResult {
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)

  const refetch = useCallback(() => setTick((t) => t + 1), [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    itemsApi
      .list()
      .then((data) => {
        if (!cancelled) setItems(data.items)
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Unknown error')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [tick])

  const createItem = useCallback(async (data: ItemCreate) => {
    await itemsApi.create(data)
    refetch()
  }, [refetch])

  const deleteItem = useCallback(async (id: string) => {
    await itemsApi.delete(id)
    refetch()
  }, [refetch])

  return { items, loading, error, createItem, deleteItem, refetch }
}
