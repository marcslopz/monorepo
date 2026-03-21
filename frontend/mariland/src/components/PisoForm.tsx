import { useState } from 'react'
import type { Piso, PisoCreate, PisoUpdate } from '../types/piso'
import Modal from './Modal'

const ESTADOS = ['candidato', 'contactado', 'agendado', 'visitado', 'descartado', 'oferta', 'comprado']
const CERT_ENERGETICA = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'en trámite', 'exento']
const ORIENTACIONES = ['Norte', 'Noreste', 'Este', 'Sureste', 'Sur', 'Suroeste', 'Oeste', 'Noroeste']
const BARRIOS = [
  'Centre',
  'Marianao',
  'Vinyets - Molí Vell',
  'Molí Nou - Ciutat Cooperativa',
  'Casablanca',
  'Camps Blancs - Els Canons',
  'La Muntanyeta',
  'Les Orioles',
]

type FormState = {
  direccion: string
  barrio: string
  url: string
  imagen_url: string
  precio: string
  habitaciones: string
  banos: string
  metros: string
  planta: string
  ascensor: string
  parking: string
  certificacion_energetica: string
  orientacion: string
  contacto_nombre: string
  contacto_telefono: string
  contacto_inmobiliaria: string
  estado: string
  notas: string
}

interface PisoFormProps {
  piso?: Piso
  onSave: (data: PisoCreate | PisoUpdate) => Promise<void>
  onClose: () => void
}

export default function PisoForm({ piso, onSave, onClose }: PisoFormProps) {
  const [form, setForm] = useState<FormState>({
    direccion: piso?.direccion ?? '',
    barrio: piso?.barrio ?? '',
    url: piso?.url ?? '',
    imagen_url: piso?.imagen_url ?? '',
    precio: piso?.precio != null ? String(piso.precio) : '',
    habitaciones: piso?.habitaciones != null ? String(piso.habitaciones) : '',
    banos: piso?.banos != null ? String(piso.banos) : '',
    metros: piso?.metros != null ? String(piso.metros) : '',
    planta: piso?.planta ?? '',
    ascensor: piso?.ascensor == null ? '' : String(piso.ascensor),
    parking: piso?.parking != null ? String(piso.parking) : '',
    certificacion_energetica: piso?.certificacion_energetica ?? '',
    orientacion: piso?.orientacion ?? '',
    contacto_nombre: piso?.contacto_nombre ?? '',
    contacto_telefono: piso?.contacto_telefono ?? '',
    contacto_inmobiliaria: piso?.contacto_inmobiliaria ?? '',
    estado: piso?.estado ?? 'candidato',
    notas: piso?.notas ?? '',
  })
  const [loading, setLoading] = useState(false)

  const set = (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const data: PisoCreate = {
        ...form,
        direccion: form.direccion || null,
        barrio: form.barrio || null,
        url: form.url || null,
        imagen_url: form.imagen_url || null,
        precio: form.precio ? parseInt(form.precio) : null,
        habitaciones: form.habitaciones ? parseInt(form.habitaciones) : null,
        banos: form.banos ? parseInt(form.banos) : null,
        metros: form.metros ? parseInt(form.metros) : null,
        parking: form.parking ? parseInt(form.parking) : null,
        ascensor: form.ascensor === 'true' ? true : form.ascensor === 'false' ? false : null,
        certificacion_energetica: form.certificacion_energetica || null,
        orientacion: form.orientacion || null,
        contacto_nombre: form.contacto_nombre || null,
        contacto_telefono: form.contacto_telefono || null,
        contacto_inmobiliaria: form.contacto_inmobiliaria || null,
        notas: form.notas || null,
      }
      await onSave(data)
      onClose()
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal title={piso ? 'Editar piso' : 'Nuevo piso'} onClose={onClose} size="lg">
      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Dirección</label>
          <input value={form.direccion} onChange={set('direccion')} placeholder="Pendiente de visita..."
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Barrio</label>
            <select value={form.barrio} onChange={set('barrio')}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none bg-white">
              <option value="">—</option>
              {BARRIOS.map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Estado</label>
            <select value={form.estado} onChange={set('estado')}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none">
              {ESTADOS.map((e) => <option key={e} value={e}>{e}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">URL del anuncio</label>
          <input value={form.url} onChange={set('url')} type="url"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">URL de imagen</label>
          <input value={form.imagen_url} onChange={set('imagen_url')} type="url" placeholder="https://..."
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Precio (€)</label>
            <input value={form.precio} onChange={set('precio')} type="number" min="0"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Habitaciones</label>
            <input value={form.habitaciones} onChange={set('habitaciones')} type="number" min="1"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Baños</label>
            <input value={form.banos} onChange={set('banos')} type="number" min="1"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">m²</label>
            <input value={form.metros} onChange={set('metros')} type="number" min="1"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Planta</label>
            <input value={form.planta} onChange={set('planta')} placeholder="Ej: 3º 2ª"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Parking (plazas)</label>
            <input value={form.parking} onChange={set('parking')} type="number" min="0"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Ascensor</label>
            <select value={form.ascensor} onChange={set('ascensor')}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none">
              <option value="">—</option>
              <option value="true">Sí</option>
              <option value="false">No</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Cert. energética</label>
            <select value={form.certificacion_energetica} onChange={set('certificacion_energetica')}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none">
              <option value="">—</option>
              {CERT_ENERGETICA.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Orientación</label>
            <select value={form.orientacion} onChange={set('orientacion')}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none">
              <option value="">—</option>
              {ORIENTACIONES.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
        </div>
        <div className="border-t border-gray-100 pt-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">Contacto</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Nombre</label>
              <input value={form.contacto_nombre} onChange={set('contacto_nombre')} placeholder="Ej: Juan García"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Teléfono</label>
              <input value={form.contacto_telefono} onChange={set('contacto_telefono')} type="tel" placeholder="Ej: 612 345 678"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
            </div>
          </div>
          <div className="mt-3">
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Inmobiliaria <span className="font-normal text-gray-400">(dejar vacío si es particular)</span>
            </label>
            <input value={form.contacto_inmobiliaria} onChange={set('contacto_inmobiliaria')} placeholder="Ej: Tecnocasa, Engel & Völkers..."
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Notas</label>
          <textarea value={form.notas} onChange={set('notas')} rows={3}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
            Cancelar
          </button>
          <button type="submit" disabled={loading}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
            {loading ? 'Guardando...' : piso ? 'Guardar cambios' : 'Añadir piso'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
