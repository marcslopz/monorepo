import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import Stats from '../components/Stats'
import type { Piso } from '../types/piso'

function makePiso(overrides: Partial<Piso> = {}): Piso {
  return {
    id: 1,
    url: null,
    direccion: 'Test',
    barrio: null,
    precio: null,
    habitaciones: null,
    banos: null,
    metros: null,
    planta: null,
    ascensor: null,
    parking: null,
    certificacion_energetica: null,
    orientacion: null,
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
    ...overrides,
  }
}

describe('Stats', () => {
  it('renders total count', () => {
    render(<Stats pisos={[makePiso(), makePiso({ id: 2 })]} />)
    const totalCard = screen.getByText('Total').closest('div')!
    expect(totalCard).toHaveTextContent('2')
  })

  it('renders activos excluding descartados', () => {
    render(<Stats pisos={[
      makePiso({ estado: 'candidato' }),
      makePiso({ id: 2, estado: 'descartado' }),
    ]} />)
    const activosCard = screen.getByText('Activos').closest('div')!
    expect(activosCard).toHaveTextContent('1')
  })

  it('renders average price', () => {
    render(<Stats pisos={[
      makePiso({ precio: 200000 }),
      makePiso({ id: 2, precio: 300000 }),
    ]} />)
    expect(screen.getByText('Precio medio')).toBeInTheDocument()
    expect(screen.getByText(/250\.000/)).toBeInTheDocument()
  })

  it('renders estado breakdown', () => {
    render(<Stats pisos={[
      makePiso({ estado: 'candidato' }),
      makePiso({ id: 2, estado: 'visitado' }),
    ]} />)
    expect(screen.getByText('candidato')).toBeInTheDocument()
    expect(screen.getByText('visitado')).toBeInTheDocument()
  })

  it('renders contactado in estado breakdown', () => {
    render(<Stats pisos={[
      makePiso({ estado: 'contactado' }),
    ]} />)
    expect(screen.getByText('contactado')).toBeInTheDocument()
  })

  it('renders agendado in estado breakdown', () => {
    render(<Stats pisos={[
      makePiso({ estado: 'agendado' }),
    ]} />)
    expect(screen.getByText('agendado')).toBeInTheDocument()
  })
})
