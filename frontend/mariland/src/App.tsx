import { useState } from 'react'
import type { Piso, PisoCreate, PisoUpdate } from './types/piso'
import CommentModal from './components/CommentModal'
import DeleteModal from './components/DeleteModal'
import ExtrasModal from './components/ExtrasModal'
import Filters from './components/Filters'
import PisoCard from './components/PisoCard'
import PisoForm from './components/PisoForm'
import PriceModal from './components/PriceModal'
import Stats from './components/Stats'
import { usePisos } from './hooks/usePisos'

export default function App() {
  const { pisos, loading, error, createPiso, updatePiso, deletePiso, addComment, deleteComment, addPrice, deletePrice } = usePisos()

  const [showForm, setShowForm] = useState(false)
  const [editPiso, setEditPiso] = useState<Piso | null>(null)
  const [deletingPiso, setDeletingPiso] = useState<Piso | null>(null)
  const [commentPiso, setCommentPiso] = useState<Piso | null>(null)
  const [pricePiso, setPricePiso] = useState<Piso | null>(null)
  const [extrasPiso, setExtrasPiso] = useState<Piso | null>(null)

  const [search, setSearch] = useState('')
  const [estadoFilter, setEstadoFilter] = useState('')
  const [barrioFilter, setBarrioFilter] = useState('')

  const barrios = [...new Set(pisos.map((p) => p.barrio).filter((b): b is string => b != null))].sort()

  const filtered = pisos.filter((p) => {
    const q = search.toLowerCase()
    const matchSearch = !q
      || (p.direccion ?? '').toLowerCase().includes(q)
      || (p.notas ?? '').toLowerCase().includes(q)
      || (p.barrio ?? '').toLowerCase().includes(q)
    const matchEstado = !estadoFilter || p.estado === estadoFilter
    const matchBarrio = !barrioFilter || p.barrio === barrioFilter
    return matchSearch && matchEstado && matchBarrio
  })

  async function handleCreate(data: PisoCreate | PisoUpdate) {
    await createPiso(data as PisoCreate)
  }

  async function handleUpdate(id: number, data: PisoCreate | PisoUpdate) {
    const updated = await updatePiso(id, data)
    if (editPiso?.id === id) setEditPiso(updated)
    if (commentPiso?.id === id) setCommentPiso(updated)
    if (pricePiso?.id === id) setPricePiso(updated)
  }

  async function handleDelete(id: number) {
    await deletePiso(id)
    setDeletingPiso(null)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {import.meta.env.DEV && (
        <div className="bg-yellow-400 text-yellow-900 text-center text-xs font-bold py-1 tracking-widest uppercase">
          Entorno de desarrollo local
        </div>
      )}
      <header className="border-b border-gray-200 bg-white shadow-sm">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">🏠 Mariland</h1>
              <p className="text-sm text-gray-500">Sant Boi de Llobregat</p>
            </div>
            <button
              onClick={() => setShowForm(true)}
              className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 shadow-sm"
            >
              + Añadir piso
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 space-y-6">
        {pisos.length > 0 && <Stats pisos={pisos} />}

        <Filters
          search={search} setSearch={setSearch}
          estadoFilter={estadoFilter} setEstadoFilter={setEstadoFilter}
          barrioFilter={barrioFilter} setBarrioFilter={setBarrioFilter}
          barrios={barrios}
        />

        {loading && <p className="text-center text-gray-500 py-12">Cargando pisos...</p>}
        {error && <p className="text-center text-red-500 py-12">Error: {error}</p>}

        {!loading && !error && filtered.length === 0 && (
          <div className="py-16 text-center text-gray-400">
            <p className="text-4xl mb-3">🏘️</p>
            <p className="font-medium">{pisos.length === 0 ? 'No hay pisos todavía' : 'No hay resultados'}</p>
            {pisos.length === 0 && (
              <button onClick={() => setShowForm(true)} className="mt-3 text-sm text-blue-600 hover:underline">
                Añadir el primer piso
              </button>
            )}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((piso) => (
            <PisoCard
              key={piso.id}
              piso={piso}
              onEdit={() => setEditPiso(piso)}
              onDelete={() => setDeletingPiso(piso)}
              onComments={() => setCommentPiso(piso)}
              onPrices={() => setPricePiso(piso)}
              onExtras={() => setExtrasPiso(piso)}
            />
          ))}
        </div>
      </main>

      {showForm && <PisoForm onSave={handleCreate} onClose={() => setShowForm(false)} />}
      {editPiso && (
        <PisoForm
          piso={editPiso}
          onSave={(data) => handleUpdate(editPiso.id, data)}
          onClose={() => setEditPiso(null)}
        />
      )}
      {deletingPiso && (
        <DeleteModal piso={deletingPiso} onDelete={handleDelete} onClose={() => setDeletingPiso(null)} />
      )}
      {commentPiso && (
        <CommentModal
          piso={commentPiso}
          onAdd={addComment}
          onDelete={deleteComment}
          onClose={() => setCommentPiso(null)}
        />
      )}
      {pricePiso && (
        <PriceModal
          piso={pricePiso}
          onAdd={addPrice}
          onDelete={deletePrice}
          onClose={() => setPricePiso(null)}
        />
      )}
      {extrasPiso && (
        <ExtrasModal
          piso={extrasPiso}
          onSave={(id, data) => handleUpdate(id, data)}
          onClose={() => setExtrasPiso(null)}
        />
      )}
    </div>
  )
}
