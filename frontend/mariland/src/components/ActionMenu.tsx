import { useEffect, useRef, useState } from 'react'

interface ActionMenuProps {
  onEdit: () => void
  onDelete: () => void
  onComments: () => void
  onPrices: () => void
  onExtras: () => void
}

export default function ActionMenu({ onEdit, onDelete, onComments, onPrices, onExtras }: ActionMenuProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const items = [
    { label: 'Editar', icon: '✏️', action: onEdit },
    { label: 'Comentarios', icon: '💬', action: onComments },
    { label: 'Historial precios', icon: '📊', action: onPrices },
    { label: 'Extras', icon: '⭐', action: onExtras },
    { label: 'Eliminar', icon: '🗑️', action: onDelete, danger: true },
  ]

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
      >
        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
          <circle cx="12" cy="5" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="12" cy="19" r="1.5" />
        </svg>
      </button>
      {open && (
        <div className="absolute right-0 z-10 mt-1 w-48 rounded-xl border border-gray-100 bg-white shadow-lg">
          {items.map(({ label, icon, action, danger }) => (
            <button
              key={label}
              onClick={() => { action(); setOpen(false) }}
              className={`flex w-full items-center gap-2 px-4 py-2.5 text-sm hover:bg-gray-50 ${danger ? 'text-red-500' : 'text-gray-700'} first:rounded-t-xl last:rounded-b-xl`}
            >
              <span>{icon}</span> {label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
