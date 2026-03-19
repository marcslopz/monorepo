import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ItemList } from '../components/ItemList'
import * as itemsApi from '../api/items'
import type { Item } from '../types/item'

const makeItem = (overrides: Partial<Item> = {}): Item => ({
  id: crypto.randomUUID(),
  name: 'Test Item',
  description: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
})

vi.mock('../api/items', () => ({
  itemsApi: {
    list: vi.fn(),
    create: vi.fn(),
    delete: vi.fn(),
  },
}))

describe('ItemList', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows loading state initially', () => {
    vi.mocked(itemsApi.itemsApi.list).mockReturnValue(new Promise(() => {}))
    render(<ItemList />)
    expect(screen.getByText('Loading…')).toBeInTheDocument()
  })

  it('renders items after loading', async () => {
    const items = [makeItem({ name: 'Widget A' }), makeItem({ name: 'Widget B' })]
    vi.mocked(itemsApi.itemsApi.list).mockResolvedValue({ items, total: 2 })

    render(<ItemList />)

    await waitFor(() => {
      expect(screen.getByText('Widget A')).toBeInTheDocument()
      expect(screen.getByText('Widget B')).toBeInTheDocument()
    })
  })

  it('shows empty state when no items', async () => {
    vi.mocked(itemsApi.itemsApi.list).mockResolvedValue({ items: [], total: 0 })

    render(<ItemList />)

    await waitFor(() => {
      expect(screen.getByText(/No items yet/)).toBeInTheDocument()
    })
  })

  it('shows error message on fetch failure', async () => {
    vi.mocked(itemsApi.itemsApi.list).mockRejectedValue(new Error('Network error'))

    render(<ItemList />)

    await waitFor(() => {
      expect(screen.getByText(/Error: Network error/)).toBeInTheDocument()
    })
  })

  it('creates a new item on form submit', async () => {
    const user = userEvent.setup()
    const newItem = makeItem({ name: 'New Widget' })

    vi.mocked(itemsApi.itemsApi.list)
      .mockResolvedValueOnce({ items: [], total: 0 })
      .mockResolvedValueOnce({ items: [newItem], total: 1 })
    vi.mocked(itemsApi.itemsApi.create).mockResolvedValue(newItem)

    render(<ItemList />)

    await waitFor(() => screen.getByText(/No items yet/))

    await user.type(screen.getByPlaceholderText('Item name'), 'New Widget')
    await user.click(screen.getByRole('button', { name: 'Add' }))

    await waitFor(() => {
      expect(screen.getByText('New Widget')).toBeInTheDocument()
    })

    expect(itemsApi.itemsApi.create).toHaveBeenCalledWith({ name: 'New Widget' })
  })
})
