import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import TransactionList from './TransactionList'
import type { Asset, Transaction } from '../types/models'

vi.mock('../api/transactions', () => ({
  getAvailableBuys: vi.fn().mockResolvedValue({ available_buys: [] }),
}))

const ASSET: Asset = {
  id: 'a1',
  name: 'Apple Inc.',
  ticker: 'AAPL',
  isin: null,
  currency: 'USD',
  asset_class: 'stock',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
}

const BUY_TX: Transaction = {
  id: 'tx1',
  asset_id: 'a1',
  type: 'buy',
  quantity: '10',
  price_per_unit: '150',
  fee: '1',
  currency: 'USD',
  date: '2024-01-01',
  broker: null,
  notes: null,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  realized_pnl: null,
  realized_pnl_pct: null,
  cost_basis: null,
  unlinked_quantity: null,
  links: [],
}

const SELL_TX: Transaction = {
  id: 'tx2',
  asset_id: 'a1',
  type: 'sell',
  quantity: '5',
  price_per_unit: '180',
  fee: '1',
  currency: 'USD',
  date: '2024-06-01',
  broker: null,
  notes: null,
  created_at: '2024-06-01T00:00:00Z',
  updated_at: '2024-06-01T00:00:00Z',
  realized_pnl: '148.50',
  realized_pnl_pct: '20.33',
  cost_basis: '730.50',
  unlinked_quantity: null,
  links: [],
}

const SELL_UNLINKED: Transaction = {
  ...SELL_TX,
  id: 'tx3',
  realized_pnl: null,
  realized_pnl_pct: null,
  cost_basis: null,
  unlinked_quantity: '3',
}

const defaultProps = {
  transactions: [BUY_TX, SELL_TX],
  assets: [ASSET],
  total: 2,
  hasMore: false,
  loading: false,
  onLoadMore: vi.fn(),
  onUpdateLinks: vi.fn().mockResolvedValue(undefined),
}

describe('TransactionList', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders empty state when no transactions', () => {
    render(<TransactionList {...defaultProps} transactions={[]} total={0} />)
    expect(screen.getByText(/Sin transacciones todavía/)).toBeInTheDocument()
  })

  it('shows asset ticker and buy/sell badge', () => {
    render(<TransactionList {...defaultProps} />)
    expect(screen.getAllByText('AAPL').length).toBeGreaterThan(0)
    expect(screen.getByText('C')).toBeInTheDocument()
    expect(screen.getByText('V')).toBeInTheDocument()
  })

  it('shows P&L badge on sell with realized_pnl', () => {
    render(<TransactionList {...defaultProps} />)
    expect(screen.getByText(/\+20\.33%/)).toBeInTheDocument()
  })

  it('shows "sin linkar" badge when unlinked_quantity > 0', () => {
    render(<TransactionList {...defaultProps} transactions={[SELL_UNLINKED]} total={1} />)
    expect(screen.getByText(/sin linkar/)).toBeInTheDocument()
  })

  it('opens LinksModal when "Enlaces" button is clicked', async () => {
    render(<TransactionList {...defaultProps} />)
    await userEvent.click(screen.getByText('Enlaces'))
    expect(screen.getByText('Editar enlaces')).toBeInTheDocument()
  })
})
