import type { AssetPnLSummary } from '../types/models'
import { formatCurrency } from '../utils/format'

interface Props {
  summaries: AssetPnLSummary[]
  loading: boolean
}

function PnlBadge({ pnl, pct, currency }: { pnl: string; pct: string | null; currency: string }) {
  const value = Number(pnl)
  const isPositive = value >= 0
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded ${
        isPositive ? 'bg-green-900/40 text-green-400' : 'bg-red-900/40 text-red-400'
      }`}
    >
      {isPositive ? '+' : ''}
      {formatCurrency(pnl, currency)}
      {pct !== null && (
        <span className="opacity-75">
          ({isPositive ? '+' : ''}
          {Number(pct).toFixed(2)}%)
        </span>
      )}
    </span>
  )
}

export default function AssetSummary({ summaries, loading }: Props) {
  if (loading || summaries.length === 0) return null

  const totalPnl = summaries.reduce((s, a) => s + Number(a.realized_pnl), 0)
  const totalCost = summaries.reduce((s, a) => s + Number(a.cost_basis), 0)
  const totalPct = totalCost > 0 ? (totalPnl / totalCost) * 100 : null

  return (
    <div className="bg-slate-800 rounded-2xl overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-700 flex items-center justify-between">
        <h2 className="text-base font-semibold text-white">Rentabilidad realizada</h2>
        <PnlBadge
          pnl={String(totalPnl.toFixed(8))}
          pct={totalPct !== null ? String(totalPct.toFixed(2)) : null}
          currency={summaries[0]?.currency ?? 'EUR'}
        />
      </div>

      <div className="divide-y divide-slate-700">
        {summaries.map(s => (
          <div key={s.asset_id} className="px-6 py-3 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-white">
                {s.asset_ticker ?? s.asset_name}
                {s.asset_ticker && (
                  <span className="ml-1.5 text-xs text-slate-400 font-normal">{s.asset_name}</span>
                )}
              </p>
              <p className="text-xs text-slate-500">
                {s.sells_count} venta{s.sells_count !== 1 ? 's' : ''} · coste{' '}
                {formatCurrency(s.cost_basis, s.currency)}
              </p>
            </div>
            <PnlBadge pnl={s.realized_pnl} pct={s.realized_pnl_pct} currency={s.currency} />
          </div>
        ))}
      </div>
    </div>
  )
}
