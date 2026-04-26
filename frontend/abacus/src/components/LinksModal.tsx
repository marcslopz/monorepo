import { useEffect, useState } from 'react'
import { getAvailableBuys } from '../api/transactions'
import type { AvailableBuy, Transaction } from '../types/models'
import { formatDate, formatCurrency, formatQuantity } from '../utils/format'

interface Props {
  sell: Transaction
  onSave: (sellId: string, links: [string, string][]) => Promise<void>
  onClose: () => void
}

export default function LinksModal({ sell, onSave, onClose }: Props) {
  const [availableBuys, setAvailableBuys] = useState<AvailableBuy[]>([])
  const [quantities, setQuantities] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getAvailableBuys(sell.id)
      .then(({ available_buys }) => {
        setAvailableBuys(available_buys)
        const initial: Record<string, string> = {}
        for (const { buy, qty_linked } of available_buys) {
          initial[buy.id] = Number(qty_linked) > 0 ? qty_linked : ''
        }
        setQuantities(initial)
      })
      .catch(() => setError('Error cargando compras disponibles'))
      .finally(() => setLoading(false))
  }, [sell.id])

  const handleSave = async () => {
    const links: [string, string][] = Object.entries(quantities)
      .filter(([, qty]) => qty && Number(qty) > 0)
      .map(([buyId, qty]) => [buyId, qty])

    const totalLinked = links.reduce((s, [, q]) => s + Number(q), 0)
    if (totalLinked > Number(sell.quantity)) {
      setError(`La cantidad total (${totalLinked}) supera la venta (${sell.quantity})`)
      return
    }

    setSaving(true)
    setError(null)
    try {
      await onSave(sell.id, links)
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error guardando enlaces')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-slate-800 rounded-2xl w-full max-w-lg mx-4 overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-700 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-white">Editar enlaces</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Venta de {formatQuantity(sell.quantity)} el {formatDate(sell.date)} ·{' '}
              {formatCurrency(sell.price_per_unit, sell.currency)}/u
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-xl leading-none">
            ×
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-4 max-h-80 overflow-y-auto">
          {loading && (
            <p className="text-sm text-slate-400 text-center py-4">Cargando compras…</p>
          )}
          {!loading && availableBuys.length === 0 && (
            <p className="text-sm text-slate-400 text-center py-4">
              No hay compras disponibles para este activo y divisa.
            </p>
          )}
          {!loading && availableBuys.length > 0 && (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-slate-400 border-b border-slate-700">
                  <th className="text-left pb-2">Compra</th>
                  <th className="text-right pb-2">Disponible</th>
                  <th className="text-right pb-2 w-28">Asignar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {availableBuys.map(({ buy, qty_available }) => (
                  <tr key={buy.id}>
                    <td className="py-2.5">
                      <p className="text-slate-200">{formatDate(buy.date)}</p>
                      <p className="text-xs text-slate-400">
                        {formatQuantity(buy.quantity)} × {formatCurrency(buy.price_per_unit, buy.currency)}
                      </p>
                    </td>
                    <td className="py-2.5 text-right text-slate-300">
                      {formatQuantity(qty_available)}
                    </td>
                    <td className="py-2.5 pl-3">
                      <input
                        type="number"
                        min="0"
                        max={qty_available}
                        step="any"
                        value={quantities[buy.id] ?? ''}
                        onChange={e =>
                          setQuantities(prev => ({ ...prev, [buy.id]: e.target.value }))
                        }
                        placeholder="0"
                        className="w-full bg-slate-700 text-white text-right rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {error && (
          <p className="px-6 py-2 text-xs text-red-400 bg-red-900/20">{error}</p>
        )}

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-700 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving || loading}
            className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg font-medium transition-colors"
          >
            {saving ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  )
}
