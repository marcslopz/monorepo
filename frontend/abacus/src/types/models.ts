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

export interface TransactionLink {
  id: string
  sell_id: string
  buy_id: string
  quantity: string
  created_at: string
}

export interface Transaction {
  id: string
  asset_id: string
  date: string
  type: TransactionType
  quantity: string
  price_per_unit: string
  fee: string
  currency: string
  broker: string | null
  notes: string | null
  created_at: string
  updated_at: string
  // P&L fields — only populated for SELL transactions
  realized_pnl: string | null
  realized_pnl_pct: string | null
  cost_basis: string | null
  unlinked_quantity: string | null
  links: TransactionLink[]
}

export interface AvailableBuy {
  buy: Transaction
  qty_available: string
  qty_linked: string
}

export interface AvailableBuysResponse {
  sell: Transaction
  available_buys: AvailableBuy[]
}

export interface AssetPnLSummary {
  asset_id: string
  asset_ticker: string | null
  asset_name: string
  currency: string
  realized_pnl: string
  cost_basis: string
  realized_pnl_pct: string | null
  sells_count: number
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

export interface StockSearchResult {
  ticker: string
  name: string
  asset_class: AssetClass
}

export interface StockProfile {
  ticker: string
  name: string
  currency: string
  isin: string | null
}

export interface TransactionCreate {
  asset_id: string
  date: string
  type: TransactionType
  quantity: string
  price_per_unit: string
  fee: string
  currency: string | null
  broker: string | null
  notes: string | null
}
