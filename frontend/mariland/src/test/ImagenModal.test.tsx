import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import ImagenModal from '../components/ImagenModal'

describe('ImagenModal', () => {
  it('renders the image with the provided url', () => {
    render(<ImagenModal url="https://example.com/foto.jpg" onClose={vi.fn()} />)
    const img = screen.getByRole('img')
    expect(img).toHaveAttribute('src', 'https://example.com/foto.jpg')
  })

  it('calls onClose when pressing Escape', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(<ImagenModal url="https://example.com/foto.jpg" onClose={onClose} />)

    await user.keyboard('{Escape}')

    expect(onClose).toHaveBeenCalledOnce()
  })

  it('calls onClose when clicking the overlay', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(<ImagenModal url="https://example.com/foto.jpg" onClose={onClose} />)

    await user.click(screen.getByRole('dialog'))

    expect(onClose).toHaveBeenCalledOnce()
  })
})
