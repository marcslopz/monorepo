import { useState, type FormEvent } from 'react'
import type { Asset, TransactionCreate, TransactionType } from '../types/models'
import AssetModal from './AssetModal'
import type { AssetCreate } from '../types/models'

interface Props {
  assets: Asset[]
  onSubmit: (data: TransactionCreate) => Promise<void>
  onAddAsset: (data: AssetCreate) => Promise<Asset>
}

export default function TransactionForm({ assets, onSubmit, onAddAsset }: Props) {
  const today = new Date().toISOString().split('T')[0]

  const [assetId, setAssetId] = useState('')
  const [date, setDate] = useState(today)
  const [type, setType] = useState<TransactionType>('buy')
  const [quantity, setQuantity] = useState('')
  const [price, setPrice] = useState('')
  const [fee, setFee] = useState('0')
  const [currency, setCurrency] = useState('')
  const [broker, setBroker] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showAssetModal, setShowAssetModal] = useState(false)

  function handleAssetChange(id: string) {
    setAssetId(id)
    const asset = assets.find(a => a.id === id)
    if (asset) setCurrency(asset.currency)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!assetId) { setError('Selecciona un asset'); return }
    setSubmitting(true)
    setError(null)
    try {
      await onSubmit({
        asset_id: assetId,
        date,
        type,
        quantity,
        price_per_unit: price,
        fee,
        currency: currency || null,
        broker: broker || null,
        notes: notes || null,
      })
      // Reset form
      setAssetId('')
      setDate(today)
      setType('buy')
      setQuantity('')
      setPrice('')
      setFee('0')
      setCurrency('')
      setBroker('')
      setNotes('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error guardando transacción')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleAddAsset(data: AssetCreate) {
    await onAddAsset(data)
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="bg-slate-800 rounded-2xl p-6 space-y-4">
        <h2 className="text-base font-semibold text-white">Nueva transacción</h2>

        {/* Asset + type row */}
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="block text-xs text-slate-400 mb-1">Asset *</label>
            <div className="flex gap-2">
              <select
                value={assetId}
                onChange={e => handleAssetChange(e.target.value)}
                className="flex-1 bg-slate-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Selecciona…</option>
                {assets.map(a => (
                  <option key={a.id} value={a.id}>
                    {a.ticker ? `${a.ticker} – ` : ''}{a.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setShowAssetModal(true)}
                className="bg-slate-700 hover:bg-slate-600 text-slate-300 px-3 py-2 rounded-lg text-sm transition-colors"
                title="Añadir nuevo asset"
              >
                +
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1">Tipo *</label>
            <div className="flex rounded-lg overflow-hidden border border-slate-600">
              {(['buy', 'sell'] as TransactionType[]).map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={`px-4 py-2 text-sm font-medium transition-colors ${
                    type === t
                      ? t === 'buy'
                        ? 'bg-green-600 text-white'
                        : 'bg-red-600 text-white'
                      : 'bg-slate-700 text-slate-400 hover:text-white'
                  }`}
                >
                  {t === 'buy' ? 'Compra' : 'Venta'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Date + quantity + price */}
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Fecha *</label>
            <input
              type="date"
              required
              value={date}
              onChange={e => setDate(e.target.value)}
              className="w-full bg-slate-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Cantidad *</label>
            <input
              type="number"
              required
              min="0"
              step="any"
              value={quantity}
              onChange={e => setQuantity(e.target.value)}
              placeholder="10"
              className="w-full bg-slate-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Precio/u *</label>
            <input
              type="number"
              required
              min="0"
              step="any"
              value={price}
              onChange={e => setPrice(e.target.value)}
              placeholder="150.00"
              className="w-full bg-slate-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Fee + currency + broker */}
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Comisión</label>
            <input
              type="number"
              min="0"
              step="any"
              value={fee}
              onChange={e => setFee(e.target.value)}
              className="w-full bg-slate-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Divisa</label>
            <input
              value={currency}
              onChange={e => setCurrency(e.target.value.toUpperCase())}
              placeholder="USD"
              maxLength={3}
              className="w-full bg-slate-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Broker/Exchange</label>
            <input
              value={broker}
              onChange={e => setBroker(e.target.value)}
              placeholder="Degiro, Binance…"
              className="w-full bg-slate-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs text-slate-400 mb-1">Notas</label>
          <input
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Opcional…"
            className="w-full bg-slate-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white py-2.5 rounded-lg font-medium text-sm transition-colors"
        >
          {submitting ? 'Guardando…' : 'Añadir transacción'}
        </button>
      </form>

      {showAssetModal && (
        <AssetModal
          onSave={handleAddAsset}
          onClose={() => setShowAssetModal(false)}
        />
      )}
    </>
  )
}
