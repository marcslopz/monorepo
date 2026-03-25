import { useEffect, useRef, useState } from 'react'
import { ESTADO_COLORS, ESTADOS } from '../utils/estadoUtils'

interface EstadoDropdownProps {
  pisoId: number
  estado: string
  onEstadoChange: (id: number, estado: string) => void
}

export default function EstadoDropdown({ pisoId, estado, onEstadoChange }: EstadoDropdownProps) {
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  async function handleSelect(nuevoEstado: string) {
    if (nuevoEstado === estado) {
      setOpen(false)
      return
    }
    setOpen(false)
    setSaving(true)
    try {
      await onEstadoChange(pisoId, nuevoEstado)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium transition ${ESTADO_COLORS[estado] ?? 'bg-gray-100 text-gray-600'} ${saving ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:ring-2 hover:ring-offset-1 hover:ring-gray-300'}`}
        disabled={saving}
      >
        {estado}
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 min-w-[130px] rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
          {ESTADOS.map((e) => (
            <button
              key={e}
              type="button"
              onClick={() => handleSelect(e)}
              className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs hover:bg-gray-50 ${e === estado ? 'font-semibold' : ''}`}
            >
              <span className={`rounded-full px-2 py-0.5 ${ESTADO_COLORS[e] ?? 'bg-gray-100 text-gray-600'}`}>
                {e}
              </span>
              {e === estado && <span className="ml-auto text-gray-400">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
