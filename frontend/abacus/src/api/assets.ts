import { request } from './client'
import type { Asset, AssetCreate, StockProfile, StockSearchResult } from '../types/models'

export function listAssets(): Promise<Asset[]> {
  return request<Asset[]>('GET', '/assets/')
}

export function createAsset(data: AssetCreate): Promise<Asset> {
  return request<Asset>('POST', '/assets/', data)
}

export function searchAssets(q: string): Promise<StockSearchResult[]> {
  return request<StockSearchResult[]>('GET', `/assets/search?q=${encodeURIComponent(q)}`)
}

export function getAssetProfile(symbol: string): Promise<StockProfile | null> {
  return request<StockProfile | null>('GET', `/assets/profile?symbol=${encodeURIComponent(symbol)}`)
}
