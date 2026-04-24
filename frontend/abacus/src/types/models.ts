export type AssetClass = 'stock' | 'crypto' | 'fund' | 'etf'
export type TransactionType = 'buy' | 'sell'

export interface Asset {
  id: string
  name: string
  ticker: string | null
  isin: string | null
  asset_class: AssetClass
  currency: string
  created_at: string
  updated_at: string
}

export interface Transaction {
  id: string
  asset_id: string
  date: string
  type: TransactionType
  quantity: string
  price_per_unit: string
  fee: string
  broker: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface PaginatedTransactions {
  items: Transaction[]
  total: number
  limit: number
  offset: number
}

export interface AssetCreate {
  name: string
  ticker: string | null
  isin: string | null
  asset_class: AssetClass
  currency: string
}

export interface TransactionCreate {
  asset_id: string
  date: string
  type: TransactionType
  quantity: string
  price_per_unit: string
  fee: string
  broker: string | null
  notes: string | null
}
