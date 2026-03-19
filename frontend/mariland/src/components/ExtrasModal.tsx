import { useState } from 'react'
import type { Piso, PisoUpdate } from '../types/piso'
import Modal from './Modal'

const EXTRAS_PREDEFINED = [
  { key: 'terraza', label: 'Terraza' },
  { key: 'balcon', label: 'Balcón' },
  { key: 'garaje', label: 'Garaje' },
  { key: 'trastero', label: 'Trastero' },
  { key: 'piscina', label: 'Piscina' },
  { key: 'aire_acondicionado', label: 'Aire acondicionado' },
  { key: 'calefaccion', label: 'Calefacción' },
  { key: 'armarios', label: 'Armarios empotrados' },
  { key: 'luminoso', label: 'Luminoso' },
  { key: 'reformado', label: 'Reformado' },
  { key: 'obra_nueva', label: 'Obra nueva' },
]

interface ExtrasModalProps {
  piso: Piso
  onSave: (pisoId: number, data: PisoUpdate) => Promise<void>
  onClose: () => void
}

export default function ExtrasModal({ piso, onSave, onClose }: ExtrasModalProps) {
  const [extras, setExtras] = useState<Record<string, boolean>>(piso.extras ?? {})
  const [customKey, setCustomKey] = useState('')
  const [loading, setLoading] = useState(false)

  function toggle(key: string) {
    setExtras((e) => ({ ...e, [key]: !e[key] }))
  }

  function addCustom() {
    const key = customKey.trim().toLowerCase().replace(/\s+/g, '_')
    if (!key) return
    setExtras((e) => ({ ...e, [key]: true }))
    setCustomKey('')
  }

  async function handleSave() {
    setLoading(true)
    try {
      await onSave(piso.id, { extras })
      onClose()
    } finally {
      setLoading(false)
    }
  }

  const customExtras = Object.keys(extras).filter((k) => !EXTRAS_PREDEFINED.some((p) => p.key === k))

  return (
    <Modal title={`Extras — ${piso.direccion ?? 'Piso sin dirección'}`} onClose={onClose} size="lg">
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {EXTRAS_PREDEFINED.map(({ key, label }) => (
            <button key={key} onClick={() => toggle(key)}
              className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${extras[key] ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
              {label}
            </button>
          ))}
          {customExtras.map((key) => (
            <button key={key} onClick={() => toggle(key)}
              className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${extras[key] ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
              {key.replace(/_/g, ' ')}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <input value={customKey} onChange={(e) => setCustomKey(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCustom())}
            placeholder="Extra personalizado..."
            className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
          <button onClick={addCustom}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50">
            Añadir
          </button>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
            Cancelar
          </button>
          <button onClick={() => void handleSave()} disabled={loading}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
            {loading ? 'Guardando...' : 'Guardar extras'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
