import type { Asset, Transaction } from '../types/models'
import { formatDate, formatCurrency, formatQuantity } from '../utils/format'

interface Props {
  transactions: Transaction[]
  assets: Asset[]
  total: number
  hasMore: boolean
  loading: boolean
  onLoadMore: () => void
}

function getAsset(assets: Asset[], id: string): Asset | undefined {
  return assets.find(a => a.id === id)
}

export default function TransactionList({
  transactions,
  assets,
  total,
  hasMore,
  loading,
  onLoadMore,
}: Props) {
  if (transactions.length === 0 && !loading) {
    return (
      <div className="bg-slate-800 rounded-2xl p-8 text-center text-slate-400">
        <p className="text-sm">Sin transacciones todavía.</p>
        <p className="text-xs mt-1">Añade tu primera compra o venta arriba.</p>
      </div>
    )
  }

  return (
    <div className="bg-slate-800 rounded-2xl overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-700 flex items-center justify-between">
        <h2 className="text-base font-semibold text-white">Transacciones</h2>
        <span className="text-xs text-slate-400">{total} total</span>
      </div>

      <div className="divide-y divide-slate-700">
        {transactions.map(tx => {
          const asset = getAsset(assets, tx.asset_id)
          const isBuy = tx.type === 'buy'
          const total = Number(tx.quantity) * Number(tx.price_per_unit) + Number(tx.fee)

          return (
            <div key={tx.id} className="px-6 py-4 flex items-center gap-4">
              {/* Type badge */}
              <span
                className={`shrink-0 text-xs font-semibold px-2 py-0.5 rounded ${
                  isBuy
                    ? 'bg-green-900/50 text-green-400'
                    : 'bg-red-900/50 text-red-400'
                }`}
              >
                {isBuy ? 'C' : 'V'}
              </span>

              {/* Asset + date */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {asset ? (asset.ticker ?? asset.name) : tx.asset_id.slice(0, 8)}
                  {asset?.ticker && (
                    <span className="ml-1.5 text-xs text-slate-400 font-normal">{asset.name}</span>
                  )}
                </p>
                <p className="text-xs text-slate-400">
                  {formatDate(tx.date)}
                  {tx.broker && ` · ${tx.broker}`}
                </p>
              </div>

              {/* Quantity */}
              <div className="text-right shrink-0">
                <p className="text-sm text-slate-200">{formatQuantity(tx.quantity)}</p>
                <p className="text-xs text-slate-400">
                  {formatCurrency(tx.price_per_unit, tx.currency)}/u
                </p>
              </div>

              {/* Total */}
              <div className="text-right shrink-0 w-24">
                <p className={`text-sm font-medium ${isBuy ? 'text-red-400' : 'text-green-400'}`}>
                  {isBuy ? '−' : '+'}
                  {formatCurrency(total, tx.currency)}
                </p>
                {Number(tx.fee) > 0 && (
                  <p className="text-xs text-slate-500">
                    com. {formatCurrency(tx.fee, tx.currency)}
                  </p>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {hasMore && (
        <div className="px-6 py-4 border-t border-slate-700">
          <button
            onClick={onLoadMore}
            disabled={loading}
            className="w-full text-sm text-slate-400 hover:text-white disabled:opacity-50 transition-colors"
          >
            {loading ? 'Cargando…' : 'Cargar más'}
          </button>
        </div>
      )}
    </div>
  )
}
