import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import EstadoDropdown from '../components/EstadoDropdown'

function renderDropdown(estado = 'candidato', onEstadoChange = vi.fn()) {
  render(<EstadoDropdown pisoId={1} estado={estado} onEstadoChange={onEstadoChange} />)
  return { onEstadoChange }
}

describe('EstadoDropdown', () => {
  it('renders current estado badge', () => {
    renderDropdown('candidato')
    expect(screen.getByText('candidato')).toBeInTheDocument()
  })

  it('opens dropdown when badge is clicked', async () => {
    const user = userEvent.setup()
    renderDropdown('candidato')
    await user.click(screen.getByText('candidato'))
    expect(screen.getByText('contactado')).toBeInTheDocument()
    expect(screen.getByText('agendado')).toBeInTheDocument()
  })

  it('calls onEstadoChange with new estado when option is selected', async () => {
    const user = userEvent.setup()
    const { onEstadoChange } = renderDropdown('candidato')
    await user.click(screen.getByText('candidato'))
    await user.click(screen.getAllByText('contactado')[0])
    expect(onEstadoChange).toHaveBeenCalledWith(1, 'contactado')
  })

  it('closes dropdown after selecting an option', async () => {
    const user = userEvent.setup()
    renderDropdown('candidato')
    await user.click(screen.getByText('candidato'))
    await user.click(screen.getAllByText('contactado')[0])
    expect(screen.queryByText('agendado')).not.toBeInTheDocument()
  })

  it('closes dropdown when pressing Escape', async () => {
    const user = userEvent.setup()
    renderDropdown('candidato')
    await user.click(screen.getByText('candidato'))
    expect(screen.getByText('agendado')).toBeInTheDocument()
    await user.keyboard('{Escape}')
    expect(screen.queryByText('agendado')).not.toBeInTheDocument()
  })
})
