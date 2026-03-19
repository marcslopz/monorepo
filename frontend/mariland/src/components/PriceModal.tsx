import { useState } from 'react'
import type { Piso, PriceHistory, PriceHistoryCreate } from '../types/piso'
import Modal from './Modal'

function formatPrice(n: number): string {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)
}

function formatDate(d: string): string {
  return new Date(d).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })
}

interface PriceModalProps {
  piso: Piso
  onAdd: (pisoId: number, data: PriceHistoryCreate) => Promise<PriceHistory>
  onDelete: (pisoId: number, priceId: number) => Promise<void>
  onClose: () => void
}

export default function PriceModal({ piso, onAdd, onDelete, onClose }: PriceModalProps) {
  const [precio, setPrecio] = useState('')
  const [notas, setNotas] = useState('')
  const [loading, setLoading] = useState(false)

  const sorted = [...piso.price_history].sort(
    (a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime(),
  )

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!precio) return
    setLoading(true)
    try {
      await onAdd(piso.id, { precio: parseInt(precio), notas: notas || null })
      setPrecio('')
      setNotas('')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal title={`Historial precios — ${piso.direccion ?? 'Piso sin dirección'}`} onClose={onClose} size="lg">
      <div className="space-y-4">
        <div className="max-h-60 overflow-y-auto space-y-2">
          {sorted.length === 0 && <p className="text-sm text-gray-400 italic">Sin historial de precios.</p>}
          {sorted.map((p, i) => {
            const prev = sorted[i + 1]
            const diff = prev != null ? p.precio - prev.precio : null
            return (
              <div key={p.id} className="flex items-center justify-between gap-2 rounded-lg bg-gray-50 px-3 py-2">
                <div>
                  <span className="font-semibold">{formatPrice(p.precio)}</span>
                  {diff !== null && (
                    <span className={`ml-2 text-xs ${diff < 0 ? 'text-green-600' : 'text-red-500'}`}>
                      {diff < 0 ? '▼' : '▲'} {formatPrice(Math.abs(diff))}
                    </span>
                  )}
                  {p.notas && <span className="ml-2 text-xs text-gray-500">{p.notas}</span>}
                  <p className="text-xs text-gray-400">{formatDate(p.fecha)}</p>
                </div>
                <button onClick={() => void onDelete(piso.id, p.id)}
                  className="text-gray-300 hover:text-red-400 text-xs">✕</button>
              </div>
            )
          })}
        </div>
        <form onSubmit={(e) => void handleAdd(e)} className="space-y-2">
          <div className="flex gap-2">
            <input value={precio} onChange={(e) => setPrecio(e.target.value)} type="number" min="0" placeholder="Nuevo precio €"
              className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
            <button type="submit" disabled={loading || !precio}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
              Añadir
            </button>
          </div>
          <input value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Notas (opcional)"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
        </form>
      </div>
    </Modal>
  )
}
