import { useState, useEffect, useCallback } from 'react'
import { listTransactions, createTransaction, updateSellLinks } from '../api/transactions'
import type { Transaction, TransactionCreate } from '../types/models'

const PAGE_SIZE = 50

export function useTransactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [total, setTotal] = useState(0)
  const [offset, setOffset] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchPage = useCallback(async (pageOffset: number) => {
    try {
      setLoading(true)
      setError(null)
      const data = await listTransactions(PAGE_SIZE, pageOffset)
      if (pageOffset === 0) {
        setTransactions(data.items)
      } else {
        setTransactions(prev => [...prev, ...data.items])
      }
      setTotal(data.total)
      setOffset(pageOffset)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error cargando transacciones')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPage(0)
  }, [fetchPage])

  const loadMore = useCallback(() => {
    const nextOffset = offset + PAGE_SIZE
    if (nextOffset < total) {
      fetchPage(nextOffset)
    }
  }, [offset, total, fetchPage])

  const addTransaction = useCallback(async (data: TransactionCreate): Promise<void> => {
    await createTransaction(data)
    // Reload from the beginning to get correct ordering
    await fetchPage(0)
  }, [fetchPage])

  const updateLinks = useCallback(
    async (sellId: string, links: [string, string][]): Promise<void> => {
      await updateSellLinks(sellId, links)
      await fetchPage(0)
    },
    [fetchPage],
  )

  const hasMore = transactions.length < total

  return { transactions, total, loading, error, addTransaction, updateLinks, loadMore, hasMore }
}
