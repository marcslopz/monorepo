import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import PisoCard from '../components/PisoCard'
import type { Piso } from '../types/piso'

const basePiso: Piso = {
  id: 1,
  url: null,
  direccion: 'Calle Falsa 123',
  barrio: 'Centre',
  precio: 250000,
  habitaciones: 3,
  banos: 1,
  metros: 80,
  planta: '2º 1ª',
  ascensor: true,
  parking: null,
  certificacion_energetica: 'C',
  orientacion: 'Sur',
  contacto_nombre: null,
  contacto_telefono: null,
  contacto_inmobiliaria: null,
  estado: 'candidato',
  extras: null,
  notas: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  price_history: [],
  comments: [],
}

function renderCard(overrides: Partial<Piso> = {}) {
  const props = {
    piso: { ...basePiso, ...overrides },
    onEdit: vi.fn(),
    onDelete: vi.fn(),
    onComments: vi.fn(),
    onPrices: vi.fn(),
    onExtras: vi.fn(),
  }
  render(<PisoCard {...props} />)
  return props
}

describe('PisoCard', () => {
  it('renders direccion and barrio', () => {
    renderCard()
    expect(screen.getByText('Calle Falsa 123')).toBeInTheDocument()
    expect(screen.getByText('Centre')).toBeInTheDocument()
  })

  it('renders estado badge', () => {
    renderCard()
    expect(screen.getByText('candidato')).toBeInTheDocument()
  })

  it('renders precio formatted', () => {
    renderCard()
    expect(screen.getByText(/250\.000/)).toBeInTheDocument()
  })

  it('renders placeholder when no direccion', () => {
    renderCard({ direccion: null })
    expect(screen.getByText('Dirección pendiente')).toBeInTheDocument()
  })

  it('calls onEdit when action menu edit is clicked', async () => {
    const user = userEvent.setup()
    const props = renderCard()

    await user.click(screen.getByRole('button', { name: '' }))
    await user.click(screen.getByText('Editar'))

    expect(props.onEdit).toHaveBeenCalledOnce()
  })

  it('shows comment count when comments exist', () => {
    renderCard({
      comments: [{ id: 1, piso_id: 1, texto: 'test', fecha: '2026-01-01T00:00:00Z' }],
    })
    expect(screen.getByText('💬 1')).toBeInTheDocument()
  })

  it('renders badge for estado contactado', () => {
    renderCard({ estado: 'contactado' })
    expect(screen.getByText('contactado')).toBeInTheDocument()
  })

  it('renders badge for estado agendado', () => {
    renderCard({ estado: 'agendado' })
    expect(screen.getByText('agendado')).toBeInTheDocument()
  })
})
