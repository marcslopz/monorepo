import { useState, type FormEvent } from 'react'
import type { AssetClass, AssetCreate } from '../types/models'

interface Props {
  onSave: (data: AssetCreate) => Promise<void>
  onClose: () => void
}

const ASSET_CLASSES: { value: AssetClass; label: string }[] = [
  { value: 'stock', label: 'Acción' },
  { value: 'crypto', label: 'Cripto' },
  { value: 'fund', label: 'Fondo' },
  { value: 'etf', label: 'ETF' },
]

export default function AssetModal({ onSave, onClose }: Props) {
  const [name, setName] = useState('')
  const [ticker, setTicker] = useState('')
  const [isin, setIsin] = useState('')
  const [assetClass, setAssetClass] = useState<AssetClass>('stock')
  const [currency, setCurrency] = useState('EUR')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      await onSave({
        name,
        ticker: ticker || null,
        isin: isin || null,
        asset_class: assetClass,
        currency: currency.toUpperCase(),
      })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error guardando asset')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-2xl w-full max-w-md shadow-xl">
        <div className="flex items-center justify-between p-6 border-b border-slate-700">
          <h2 className="text-lg font-semibold text-white">Nuevo asset</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm text-slate-300 mb-1">Nombre *</label>
            <input
              required
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Apple Inc."
              className="w-full bg-slate-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-slate-300 mb-1">Ticker</label>
              <input
                value={ticker}
                onChange={e => setTicker(e.target.value.toUpperCase())}
                placeholder="AAPL"
                className="w-full bg-slate-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-300 mb-1">ISIN</label>
              <input
                value={isin}
                onChange={e => setIsin(e.target.value.toUpperCase())}
                placeholder="US0378331005"
                className="w-full bg-slate-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-slate-300 mb-1">Tipo *</label>
              <select
                value={assetClass}
                onChange={e => setAssetClass(e.target.value as AssetClass)}
                className="w-full bg-slate-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {ASSET_CLASSES.map(ac => (
                  <option key={ac.value} value={ac.value}>{ac.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-slate-300 mb-1">Moneda *</label>
              <input
                required
                value={currency}
                onChange={e => setCurrency(e.target.value.toUpperCase())}
                placeholder="EUR"
                minLength={3}
                maxLength={3}
                pattern="[A-Z]{3}"
                title="Código ISO 4217 de 3 letras (ej: EUR, USD)"
                className="w-full bg-slate-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-200 py-2.5 rounded-lg text-sm font-medium transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white py-2.5 rounded-lg text-sm font-medium transition-colors"
            >
              {saving ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
