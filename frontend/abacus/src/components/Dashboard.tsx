import { useAuth } from '../auth/AuthContext'
import { useAssets } from '../hooks/useAssets'
import { useTransactions } from '../hooks/useTransactions'
import TransactionForm from './TransactionForm'
import TransactionList from './TransactionList'

export default function Dashboard() {
  const { logout } = useAuth()
  const { assets, loading: assetsLoading, addAsset } = useAssets()
  const { transactions, total, loading: txLoading, hasMore, addTransaction, loadMore } =
    useTransactions()

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
            onSubmit={addTransaction}
            onAddAsset={addAsset}
          />
        )}

        <TransactionList
          transactions={transactions}
          assets={assets}
          total={total}
          hasMore={hasMore}
          loading={txLoading}
          onLoadMore={loadMore}
        />
      </main>
    </div>
  )
}
