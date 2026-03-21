import { useState } from 'react'
import { pisosApi } from '../api/pisos'
import type { Piso } from '../types/piso'
import Modal from './Modal'

interface ImportFromUrlModalProps {
  onImported: (piso: Piso) => void
  onClose: () => void
}

export default function ImportFromUrlModal({ onImported, onClose }: ImportFromUrlModalProps) {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!url.trim()) return
    setLoading(true)
    setError(null)
    try {
      const piso = await pisosApi.importFromUrl(url.trim())
      if (piso) {
        onImported(piso)
        onClose()
      }
    } catch {
      setError('No se ha podido importar el piso. Comprueba el enlace e inténtalo de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal title="Importar piso desde URL" onClose={onClose} size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-sm text-gray-500">
          Pega el enlace del piso de Fotocasa, Idealista u otro portal y lo importaremos automáticamente.
        </p>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">URL del piso</label>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://www.fotocasa.es/..."
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            required
            autoFocus
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading || !url.trim()}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {loading && (
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
            )}
            {loading ? 'Importando...' : 'Importar'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
