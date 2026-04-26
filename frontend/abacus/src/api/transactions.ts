import { request } from './client'
import type {
  AvailableBuysResponse,
  AssetPnLSummary,
  PaginatedTransactions,
  Transaction,
  TransactionCreate,
} from '../types/models'

export function listTransactions(limit = 50, offset = 0): Promise<PaginatedTransactions> {
  return request<PaginatedTransactions>('GET', `/transactions/?limit=${limit}&offset=${offset}`)
}

export function createTransaction(data: TransactionCreate): Promise<Transaction> {
  return request('POST', '/transactions/', data)
}

export function updateSellLinks(
  sellId: string,
  links: [string, string][],
): Promise<Transaction> {
  return request('PUT', `/transactions/${sellId}/links`, { links })
}

export function getAvailableBuys(sellId: string): Promise<AvailableBuysResponse> {
  return request('GET', `/transactions/${sellId}/available-buys`)
}

export function getSummaryByAsset(): Promise<AssetPnLSummary[]> {
  return request('GET', '/transactions/summary/by-asset')
}
