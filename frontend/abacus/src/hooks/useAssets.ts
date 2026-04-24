import { useState, useEffect, useCallback } from 'react'
import { listAssets, createAsset } from '../api/assets'
import type { Asset, AssetCreate } from '../types/models'

export function useAssets() {
  const [assets, setAssets] = useState<Asset[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAssets = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await listAssets()
      setAssets(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error cargando assets')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAssets()
  }, [fetchAssets])

  const addAsset = useCallback(async (data: AssetCreate): Promise<Asset> => {
    const asset = await createAsset(data)
    setAssets(prev => [...prev, asset].sort((a, b) => a.name.localeCompare(b.name)))
    return asset
  }, [])

  return { assets, loading, error, addAsset, refresh: fetchAssets }
}
