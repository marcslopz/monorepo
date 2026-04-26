import { useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import { useAssets } from '../hooks/useAssets'
import { useAssetSummary } from '../hooks/useAssetSummary'
import { useTransactions } from '../hooks/useTransactions'
import AssetSummary from './AssetSummary'
import TransactionForm from './TransactionForm'
import TransactionList from './TransactionList'

export default function Dashboard() {
  const { logout } = useAuth()
  const { assets, loading: assetsLoading, addAsset } = useAssets()
  const [summaryKey, setSummaryKey] = useState(0)
  const { summaries, loading: summaryLoading } = useAssetSummary(summaryKey)
  const { transactions, total, loading: txLoading, hasMore, addTransaction, updateLinks, loadMore } =
    useTransactions()

  const handleAddTransaction = async (data: Parameters<typeof addTransaction>[0]) => {
    await addTransaction(data)
    setSummaryKey(k => k + 1)
  }

  const handleUpdateLinks = async (sellId: string, links: [string, string][]) => {
    await updateLinks(sellId, links)
    setSummaryKey(k => k + 1)
  }

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-base font-bold text-white">Abacus</h1>
          <button
            onClick={logout}
            className="text-xs text-slate-400 hover:text-white transition-colors"
          >
            Salir
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {assetsLoading ? (
          <div className="bg-slate-800 rounded-2xl p-6 text-center text-slate-400 text-sm">
            Cargando…
          </div>
        ) : (
          <TransactionForm
            assets={assets}
            onSubmit={handleAddTransaction}
            onAddAsset={addAsset}
          />
        )}

        <AssetSummary summaries={summaries} loading={summaryLoading} />

        <TransactionList
          transactions={transactions}
          assets={assets}
          total={total}
          hasMore={hasMore}
          loading={txLoading}
          onLoadMore={loadMore}
          onUpdateLinks={handleUpdateLinks}
        />
      </main>
    </div>
  )
}
