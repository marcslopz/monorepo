import { useEffect, useRef, useState } from 'react'
import { searchAssets } from '../api/assets'
import type { StockSearchResult } from '../types/models'

const DEBOUNCE_MS = 300

export function useStockSearch() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<StockSearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)

    if (!query.trim()) {
      setResults([])
      setLoading(false)
      return
    }

    setLoading(true)
    timerRef.current = setTimeout(async () => {
      try {
        const data = await searchAssets(query.trim())
        setResults(data)
        setError(null)
      } catch {
        setError('Error al buscar. Inténtalo de nuevo.')
        setResults([])
      } finally {
        setLoading(false)
      }
    }, DEBOUNCE_MS)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [query])

  return { query, setQuery, results, loading, error }
}
