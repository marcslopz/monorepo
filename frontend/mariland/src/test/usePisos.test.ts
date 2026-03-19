import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { usePisos } from '../hooks/usePisos'
import * as pisosApiModule from '../api/pisos'
import type { Piso } from '../types/piso'

const basePiso: Piso = {
  id: 1,
  url: null,
  direccion: 'Calle Test 1',
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

beforeEach(() => {
  vi.restoreAllMocks()
})

describe('usePisos', () => {
  it('loads pisos on mount', async () => {
    vi.spyOn(pisosApiModule.pisosApi, 'list').mockResolvedValue([basePiso])

    const { result } = renderHook(() => usePisos())

    expect(result.current.loading).toBe(true)

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.pisos).toHaveLength(1)
    expect(result.current.pisos[0].direccion).toBe('Calle Test 1')
  })

  it('sets error when load fails', async () => {
    vi.spyOn(pisosApiModule.pisosApi, 'list').mockRejectedValue(new Error('Network error'))

    const { result } = renderHook(() => usePisos())

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.error).toBe('Network error')
  })

  it('createPiso prepends to list', async () => {
    vi.spyOn(pisosApiModule.pisosApi, 'list').mockResolvedValue([basePiso])
    const newPiso = { ...basePiso, id: 2, direccion: 'Calle Nueva 2' }
    vi.spyOn(pisosApiModule.pisosApi, 'create').mockResolvedValue(newPiso)

    const { result } = renderHook(() => usePisos())
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.createPiso({ direccion: 'Calle Nueva 2', estado: 'candidato' })
    })

    expect(result.current.pisos[0].id).toBe(2)
    expect(result.current.pisos).toHaveLength(2)
  })

  it('deletePiso removes from list', async () => {
    vi.spyOn(pisosApiModule.pisosApi, 'list').mockResolvedValue([basePiso])
    vi.spyOn(pisosApiModule.pisosApi, 'delete').mockResolvedValue(undefined)

    const { result } = renderHook(() => usePisos())
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.deletePiso(1)
    })

    expect(result.current.pisos).toHaveLength(0)
  })
})
