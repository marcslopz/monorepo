import { useEffect, useRef, useState } from 'react'

const OWNERS = ['Nagore', 'Marcos']

const OWNER_COLORS: Record<string, string> = {
  Nagore: 'bg-purple-100 text-purple-700',
  Marcos: 'bg-indigo-100 text-indigo-700',
}

interface OwnerDropdownProps {
  pisoId: number
  owner: string | null
  onOwnerChange: (id: number, owner: string | null) => void
}

export default function OwnerDropdown({ pisoId, owner, onOwnerChange }: OwnerDropdownProps) {
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

  async function handleSelect(nuevoOwner: string | null) {
    if (nuevoOwner === owner) {
      setOpen(false)
      return
    }
    setOpen(false)
    setSaving(true)
    try {
      await onOwnerChange(pisoId, nuevoOwner)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={saving}
        className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium transition ${owner ? (OWNER_COLORS[owner] ?? 'bg-gray-100 text-gray-600') : 'bg-gray-100 text-gray-400'} ${saving ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:ring-2 hover:ring-offset-1 hover:ring-gray-300'}`}
      >
        {owner ?? '—'}
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 min-w-[120px] rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
          {OWNERS.map((o) => (
            <button
              key={o}
              type="button"
              onClick={() => handleSelect(o)}
              className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs hover:bg-gray-50 ${o === owner ? 'font-semibold' : ''}`}
            >
              <span className={`rounded-full px-2 py-0.5 ${OWNER_COLORS[o]}`}>{o}</span>
              {o === owner && <span className="ml-auto text-gray-400">✓</span>}
            </button>
          ))}
          {owner && (
            <button
              type="button"
              onClick={() => handleSelect(null)}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-gray-400 hover:bg-gray-50"
            >
              Quitar
            </button>
          )}
        </div>
      )}
    </div>
  )
}
