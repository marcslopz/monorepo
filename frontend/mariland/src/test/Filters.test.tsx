import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import Filters from '../components/Filters'

function renderFilters(overrides: { hideDescartados?: boolean } = {}) {
  const props = {
    search: '',
    setSearch: vi.fn(),
    estadoFilter: '',
    setEstadoFilter: vi.fn(),
    barrioFilter: '',
    setBarrioFilter: vi.fn(),
    barrios: [],
    hideDescartados: overrides.hideDescartados ?? true,
    setHideDescartados: vi.fn(),
  }
  render(<Filters {...props} />)
  return props
}

describe('Filters - hideDescartados checkbox', () => {
  it('renders the ocultar descartados checkbox', () => {
    renderFilters()
    expect(screen.getByRole('checkbox', { name: /ocultar descartados/i })).toBeInTheDocument()
  })

  it('checkbox is checked by default', () => {
    renderFilters({ hideDescartados: true })
    expect(screen.getByRole('checkbox', { name: /ocultar descartados/i })).toBeChecked()
  })

  it('checkbox is unchecked when hideDescartados is false', () => {
    renderFilters({ hideDescartados: false })
    expect(screen.getByRole('checkbox', { name: /ocultar descartados/i })).not.toBeChecked()
  })

  it('calls setHideDescartados(false) when unchecking', async () => {
    const user = userEvent.setup()
    const props = renderFilters({ hideDescartados: true })

    await user.click(screen.getByRole('checkbox', { name: /ocultar descartados/i }))

    expect(props.setHideDescartados).toHaveBeenCalledWith(false)
  })

  it('calls setHideDescartados(true) when checking', async () => {
    const user = userEvent.setup()
    const props = renderFilters({ hideDescartados: false })

    await user.click(screen.getByRole('checkbox', { name: /ocultar descartados/i }))

    expect(props.setHideDescartados).toHaveBeenCalledWith(true)
  })
})
