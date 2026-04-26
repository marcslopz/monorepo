import { useState, useEffect, useCallback } from 'react'
import { getSummaryByAsset } from '../api/transactions'
import type { AssetPnLSummary } from '../types/models'

export function useAssetSummary(refreshKey: number) {
  const [summaries, setSummaries] = useState<AssetPnLSummary[]>([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    try {
      setLoading(true)
      const data = await getSummaryByAsset()
      setSummaries(data)
    } catch {
      // non-critical; fail silently
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetch()
  }, [fetch, refreshKey])

  return { summaries, loading, refresh: fetch }
}
