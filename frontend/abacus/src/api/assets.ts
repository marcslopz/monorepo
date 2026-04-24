import { request } from './client'
import type { Asset, AssetCreate } from '../types/models'

export function listAssets(): Promise<Asset[]> {
  return request<Asset[]>('GET', '/assets/')
}

export function createAsset(data: AssetCreate): Promise<Asset> {
  return request<Asset>('POST', '/assets/', data)
}
