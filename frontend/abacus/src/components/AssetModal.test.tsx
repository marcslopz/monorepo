import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import AssetModal from './AssetModal'

vi.mock('../api/assets', () => ({
  searchAssets: vi.fn(),
  getAssetProfile: vi.fn(),
}))

import { getAssetProfile, searchAssets } from '../api/assets'
const mockSearch = vi.mocked(searchAssets)
const mockGetProfile = vi.mocked(getAssetProfile)

const APPLE_RESULT = { ticker: 'AAPL', name: 'Apple Inc.', asset_class: 'stock' as const }

describe('AssetModal', () => {
  const onSave = vi.fn().mockResolvedValue(undefined)
  const onClose = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    mockSearch.mockResolvedValue([])
    mockGetProfile.mockResolvedValue(null)
  })

  it('renders the search input', () => {
    render(<AssetModal onSave={onSave} onClose={onClose} />)
    expect(screen.getByPlaceholderText(/AAPL o Apple/i)).toBeInTheDocument()
  })

  it('shows search results after typing', async () => {
    mockSearch.mockResolvedValue([APPLE_RESULT])
    render(<AssetModal onSave={onSave} onClose={onClose} />)

    const searchInput = screen.getByPlaceholderText(/AAPL o Apple/i)
    await userEvent.type(searchInput, 'AAPL')

    await waitFor(() => {
      expect(screen.getByText(/Apple Inc\./)).toBeInTheDocument()
    })
  })

  it('prefills form fields when a result is selected', async () => {
    mockSearch.mockResolvedValue([APPLE_RESULT])
    mockGetProfile.mockResolvedValue({ ticker: 'AAPL', name: 'Apple Inc.', currency: 'USD', isin: null })
    render(<AssetModal onSave={onSave} onClose={onClose} />)

    await userEvent.type(screen.getByPlaceholderText(/AAPL o Apple/i), 'AAPL')
    await waitFor(() => screen.getByText(/Apple Inc\./))

    await userEvent.click(screen.getByText(/Apple Inc\./))

    await waitFor(() => {
      expect((screen.getByPlaceholderText('Apple Inc.') as HTMLInputElement).value).toBe('Apple Inc.')
      expect((screen.getByPlaceholderText('AAPL') as HTMLInputElement).value).toBe('AAPL')
      expect((screen.getByPlaceholderText('EUR') as HTMLInputElement).value).toBe('USD')
    })
    expect(mockGetProfile).toHaveBeenCalledWith('AAPL')
  })

  it('calls onSave with correct data on submit', async () => {
    render(<AssetModal onSave={onSave} onClose={onClose} />)

    await userEvent.type(screen.getByPlaceholderText('Apple Inc.'), 'Test Corp')
    await userEvent.type(screen.getByPlaceholderText('AAPL'), 'TEST')

    const currencyInput = screen.getByPlaceholderText('EUR') as HTMLInputElement
    await userEvent.clear(currencyInput)
    await userEvent.type(currencyInput, 'USD')

    await userEvent.click(screen.getByText('Guardar'))

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Test Corp', ticker: 'TEST', currency: 'USD' }),
      )
    })
  })
})
