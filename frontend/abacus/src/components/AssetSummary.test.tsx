import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import AssetSummary from './AssetSummary'
import type { AssetPnLSummary } from '../types/models'

const SUMMARIES: AssetPnLSummary[] = [
  {
    asset_id: 'a1',
    asset_ticker: 'AAPL',
    asset_name: 'Apple Inc.',
    currency: 'USD',
    realized_pnl: '150.00',
    realized_pnl_pct: '10.00',
    cost_basis: '1500.00',
    sells_count: 2,
  },
  {
    asset_id: 'a2',
    asset_ticker: null,
    asset_name: 'Bitcoin',
    currency: 'EUR',
    realized_pnl: '-50.00',
    realized_pnl_pct: '-5.00',
    cost_basis: '1000.00',
    sells_count: 1,
  },
]

describe('AssetSummary', () => {
  it('renders nothing while loading', () => {
    const { container } = render(<AssetSummary summaries={[]} loading={true} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders nothing when no summaries', () => {
    const { container } = render(<AssetSummary summaries={[]} loading={false} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders asset rows', () => {
    render(<AssetSummary summaries={SUMMARIES} loading={false} />)
    expect(screen.getByText('AAPL')).toBeInTheDocument()
    expect(screen.getByText('Apple Inc.')).toBeInTheDocument()
    expect(screen.getByText('Bitcoin')).toBeInTheDocument()
  })

  it('shows positive P&L with green badge', () => {
    render(<AssetSummary summaries={[SUMMARIES[0]]} loading={false} />)
    const badge = screen.getAllByText(/\+/)[0]
    expect(badge).toBeInTheDocument()
  })

  it('shows sells count and cost basis', () => {
    render(<AssetSummary summaries={SUMMARIES} loading={false} />)
    expect(screen.getByText(/2 ventas/)).toBeInTheDocument()
    expect(screen.getByText(/1 venta[^s]/)).toBeInTheDocument()
  })
})
