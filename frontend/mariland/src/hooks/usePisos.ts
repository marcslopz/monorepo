import { useCallback, useEffect, useState } from 'react'
import { commentsApi, pisosApi, pricesApi } from '../api/pisos'
import type { Comment, CommentCreate, Piso, PisoCreate, PisoUpdate, PriceHistory, PriceHistoryCreate } from '../types/piso'

export function usePisos() {
  const [pisos, setPisos] = useState<Piso[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadPisos = useCallback(async () => {
    try {
      const data = await pisosApi.list()
      setPisos(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadPisos()
  }, [loadPisos])

  function updatePisoInState(updated: Piso) {
    setPisos((ps) => ps.map((p) => (p.id === updated.id ? updated : p)))
  }

  async function createPiso(data: PisoCreate): Promise<Piso> {
    const created = await pisosApi.create(data)
    setPisos((ps) => [created, ...ps])
    return created
  }

  function prependPiso(piso: Piso): void {
    setPisos((ps) => [piso, ...ps])
  }

  async function updatePiso(id: number, data: PisoUpdate): Promise<Piso> {
    const updated = await pisosApi.update(id, data)
    updatePisoInState(updated)
    return updated
  }

  async function deletePiso(id: number): Promise<void> {
    await pisosApi.delete(id)
    setPisos((ps) => ps.filter((p) => p.id !== id))
  }

  async function addComment(pisoId: number, data: CommentCreate): Promise<Comment> {
    const comment = await commentsApi.add(pisoId, data)
    setPisos((ps) =>
      ps.map((p) =>
        p.id === pisoId ? { ...p, comments: [comment, ...p.comments] } : p,
      ),
    )
    return comment
  }

  async function deleteComment(pisoId: number, commentId: number): Promise<void> {
    await commentsApi.delete(pisoId, commentId)
    setPisos((ps) =>
      ps.map((p) =>
        p.id === pisoId
          ? { ...p, comments: p.comments.filter((c) => c.id !== commentId) }
          : p,
      ),
    )
  }

  async function addPrice(pisoId: number, data: PriceHistoryCreate): Promise<PriceHistory> {
    const price = await pricesApi.add(pisoId, data)
    setPisos((ps) =>
      ps.map((p) =>
        p.id === pisoId
          ? { ...p, price_history: [price, ...p.price_history] }
          : p,
      ),
    )
    return price
  }

  async function deletePrice(pisoId: number, priceId: number): Promise<void> {
    await pricesApi.delete(pisoId, priceId)
    setPisos((ps) =>
      ps.map((p) =>
        p.id === pisoId
          ? { ...p, price_history: p.price_history.filter((ph) => ph.id !== priceId) }
          : p,
      ),
    )
  }

  return {
    pisos,
    loading,
    error,
    createPiso,
    prependPiso,
    updatePiso,
    deletePiso,
    addComment,
    deleteComment,
    addPrice,
    deletePrice,
  }
}
