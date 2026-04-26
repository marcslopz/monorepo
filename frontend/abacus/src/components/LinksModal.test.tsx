import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import LinksModal from './LinksModal'
import type { Transaction } from '../types/models'

vi.mock('../api/transactions', () => ({
  getAvailableBuys: vi.fn(),
}))

import { getAvailableBuys } from '../api/transactions'
const mockGetAvailableBuys = vi.mocked(getAvailableBuys)

const SELL: Transaction = {
  id: 'sell1',
  asset_id: 'a1',
  type: 'sell',
  quantity: '10',
  price_per_unit: '180',
  fee: '1',
  currency: 'USD',
  date: '2024-06-01',
  broker: null,
  notes: null,
  created_at: '2024-06-01T00:00:00Z',
  updated_at: '2024-06-01T00:00:00Z',
  realized_pnl: null,
  realized_pnl_pct: null,
  cost_basis: null,
  unlinked_quantity: null,
  links: [],
}

const BUY_TX: Transaction = {
  id: 'buy1',
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

const BUY_ENTRY = {
  buy: BUY_TX,
  qty_available: '10',
  qty_linked: '0',
}

describe('LinksModal', () => {
  const onSave = vi.fn().mockResolvedValue(undefined)
  const onClose = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    mockGetAvailableBuys.mockResolvedValue({ sell: SELL, available_buys: [BUY_ENTRY] })
  })

  it('renders header with sell info', () => {
    render(<LinksModal sell={SELL} onSave={onSave} onClose={onClose} />)
    expect(screen.getByText('Editar enlaces')).toBeInTheDocument()
  })

  it('loads and shows available buys', async () => {
    render(<LinksModal sell={SELL} onSave={onSave} onClose={onClose} />)
    await waitFor(() => {
      expect(screen.getByText('1/1/2024')).toBeInTheDocument()
    })
  })

  it('shows empty state when no buys available', async () => {
    mockGetAvailableBuys.mockResolvedValue({ sell: SELL, available_buys: [] })
    render(<LinksModal sell={SELL} onSave={onSave} onClose={onClose} />)
    await waitFor(() => {
      expect(screen.getByText(/No hay compras disponibles/)).toBeInTheDocument()
    })
  })

  it('calls onSave with correct links on submit', async () => {
    render(<LinksModal sell={SELL} onSave={onSave} onClose={onClose} />)
    await waitFor(() => screen.getByText('1/1/2024'))

    const input = screen.getByPlaceholderText('0')
    await userEvent.clear(input)
    await userEvent.type(input, '5')

    await userEvent.click(screen.getByText('Guardar'))
    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith('sell1', [['buy1', '5']])
    })
  })

  it('shows error when total quantity exceeds sell quantity', async () => {
    render(<LinksModal sell={SELL} onSave={onSave} onClose={onClose} />)
    await waitFor(() => screen.getByText('1/1/2024'))

    const input = screen.getByPlaceholderText('0')
    await userEvent.clear(input)
    await userEvent.type(input, '99')

    await userEvent.click(screen.getByText('Guardar'))
    await waitFor(() => {
      expect(screen.getByText(/supera la venta/)).toBeInTheDocument()
    })
    expect(onSave).not.toHaveBeenCalled()
  })

  it('calls onClose when cancel is clicked', async () => {
    render(<LinksModal sell={SELL} onSave={onSave} onClose={onClose} />)
    await userEvent.click(screen.getByText('Cancelar'))
    expect(onClose).toHaveBeenCalled()
  })
})
