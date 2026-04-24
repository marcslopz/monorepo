import { request } from './client'
import type { PaginatedTransactions, TransactionCreate } from '../types/models'

export function listTransactions(limit = 50, offset = 0): Promise<PaginatedTransactions> {
  return request<PaginatedTransactions>('GET', `/transactions/?limit=${limit}&offset=${offset}`)
}

export function createTransaction(data: TransactionCreate): Promise<PaginatedTransactions['items'][0]> {
  return request('POST', '/transactions/', data)
}
