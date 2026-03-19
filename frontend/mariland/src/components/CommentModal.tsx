import { useState } from 'react'
import type { Comment, CommentCreate, Piso } from '../types/piso'
import Modal from './Modal'

function formatDate(d: string): string {
  return new Date(d).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

interface CommentModalProps {
  piso: Piso
  onAdd: (pisoId: number, data: CommentCreate) => Promise<Comment>
  onDelete: (pisoId: number, commentId: number) => Promise<void>
  onClose: () => void
}

export default function CommentModal({ piso, onAdd, onDelete, onClose }: CommentModalProps) {
  const [texto, setTexto] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!texto.trim()) return
    setLoading(true)
    try {
      await onAdd(piso.id, { texto: texto.trim() })
      setTexto('')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal title={`Comentarios — ${piso.direccion ?? 'Piso sin dirección'}`} onClose={onClose} size="lg">
      <div className="space-y-4">
        <div className="max-h-72 overflow-y-auto space-y-2">
          {piso.comments.length === 0 && <p className="text-sm text-gray-400 italic">Sin comentarios aún.</p>}
          {piso.comments.map((c) => (
            <div key={c.id} className="flex items-start justify-between gap-2 rounded-lg bg-gray-50 px-3 py-2">
              <div>
                <p className="text-sm text-gray-800">{c.texto}</p>
                <p className="mt-0.5 text-xs text-gray-400">{formatDate(c.fecha)}</p>
              </div>
              <button onClick={() => void onDelete(piso.id, c.id)}
                className="shrink-0 text-gray-300 hover:text-red-400 text-xs">✕</button>
            </div>
          ))}
        </div>
        <form onSubmit={(e) => void handleAdd(e)} className="flex gap-2">
          <input value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Añadir comentario..."
            className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
          <button type="submit" disabled={loading || !texto.trim()}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
            Añadir
          </button>
        </form>
      </div>
    </Modal>
  )
}
