import { useState } from 'react'
import type { Piso } from '../types/piso'
import Modal from './Modal'

interface DeleteModalProps {
  piso: Piso
  onDelete: (id: number) => Promise<void>
  onClose: () => void
}

export default function DeleteModal({ piso, onDelete, onClose }: DeleteModalProps) {
  const [loading, setLoading] = useState(false)

  async function handleDelete() {
    setLoading(true)
    try {
      await onDelete(piso.id)
      onClose()
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal title="Eliminar piso" onClose={onClose} size="sm">
      <div className="space-y-4">
        <p className="text-sm text-gray-600">
          ¿Seguro que quieres eliminar <strong>{piso.direccion}</strong>? Esta acción no se puede deshacer.
        </p>
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
            Cancelar
          </button>
          <button onClick={() => void handleDelete()} disabled={loading}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50">
            {loading ? 'Eliminando...' : 'Eliminar'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
