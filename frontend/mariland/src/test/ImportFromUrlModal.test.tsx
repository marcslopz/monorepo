import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ImportFromUrlModal from '../components/ImportFromUrlModal'
import * as pisosApiModule from '../api/pisos'
import type { Piso, SseEvent } from '../types/piso'

const basePiso: Piso = {
  id: 1,
  url: 'https://fotocasa.es/piso/1',
  imagen_url: null,
  direccion: 'Calle Mayor 1',
  barrio: 'Centre',
  precio: 250000,
  habitaciones: 3,
  banos: 1,
  metros: 80,
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
}

function mockImportStream(events: SseEvent[]) {
  return vi.spyOn(pisosApiModule.pisosApi, 'importFromUrlStream').mockImplementation(
    async (_url, onEvent) => {
      for (const event of events) {
        onEvent(event)
      }
    },
  )
}

describe('ImportFromUrlModal', () => {
  const onImported = vi.fn()
  const onClose = vi.fn()

  beforeEach(() => {
    vi.restoreAllMocks()
    onImported.mockClear()
    onClose.mockClear()
  })

  it('renders form with url input and submit button', () => {
    render(<ImportFromUrlModal onImported={onImported} onClose={onClose} />)
    expect(screen.getByPlaceholderText(/fotocasa/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /importar/i })).toBeInTheDocument()
  })

  it('shows progress steps while importing', async () => {
    const user = userEvent.setup()
    mockImportStream([
      { type: 'progress', step: 'fetching', message: 'Obteniendo página...' },
      { type: 'progress', step: 'extracting', message: 'Analizando...' },
      { type: 'progress', step: 'saving', message: 'Guardando...' },
      { type: 'done', piso: basePiso },
    ])

    render(<ImportFromUrlModal onImported={onImported} onClose={onClose} />)
    await user.type(screen.getByPlaceholderText(/fotocasa/i), 'https://fotocasa.es/piso/1')
    await user.click(screen.getByRole('button', { name: /importar/i }))

    await waitFor(() => {
      expect(screen.getByText('Obteniendo página del portal')).toBeInTheDocument()
      expect(screen.getByText('Analizando datos con IA')).toBeInTheDocument()
      expect(screen.getByText('Guardando piso')).toBeInTheDocument()
    })
  })

  it('calls onImported and onClose on done event', async () => {
    const user = userEvent.setup()
    mockImportStream([
      { type: 'progress', step: 'fetching', message: 'Obteniendo...' },
      { type: 'done', piso: basePiso },
    ])

    render(<ImportFromUrlModal onImported={onImported} onClose={onClose} />)
    await user.type(screen.getByPlaceholderText(/fotocasa/i), 'https://fotocasa.es/piso/1')
    await user.click(screen.getByRole('button', { name: /importar/i }))

    await waitFor(() => {
      expect(onImported).toHaveBeenCalledWith(basePiso)
      expect(onClose).toHaveBeenCalled()
    })
  })

  it('shows error message at failed step on error event', async () => {
    const user = userEvent.setup()
    mockImportStream([
      { type: 'progress', step: 'fetching', message: 'Obteniendo...' },
      {
        type: 'error',
        step: 'fetching',
        message: 'El portal puede estar bloqueando el acceso automático.',
      },
    ])

    render(<ImportFromUrlModal onImported={onImported} onClose={onClose} />)
    await user.type(screen.getByPlaceholderText(/fotocasa/i), 'https://idealista.com/inmueble/1')
    await user.click(screen.getByRole('button', { name: /importar/i }))

    await waitFor(() => {
      expect(
        screen.getByText('El portal puede estar bloqueando el acceso automático.'),
      ).toBeInTheDocument()
    })
    expect(onImported).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: /reintentar/i })).toBeInTheDocument()
  })

  it('does not call onImported on error', async () => {
    const user = userEvent.setup()
    mockImportStream([
      { type: 'error', step: 'fetching', message: 'Timeout' },
    ])

    render(<ImportFromUrlModal onImported={onImported} onClose={onClose} />)
    await user.type(screen.getByPlaceholderText(/fotocasa/i), 'https://idealista.com/inmueble/1')
    await user.click(screen.getByRole('button', { name: /importar/i }))

    await waitFor(() => {
      expect(screen.getByText('Timeout')).toBeInTheDocument()
    })
    expect(onImported).not.toHaveBeenCalled()
  })
})
