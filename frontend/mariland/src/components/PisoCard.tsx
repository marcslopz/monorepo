import type { Piso, PriceHistory } from '../types/piso'
import ActionMenu from './ActionMenu'

const ESTADO_COLORS: Record<string, string> = {
  candidato: 'bg-blue-100 text-blue-700',
  visitado: 'bg-purple-100 text-purple-700',
  descartado: 'bg-gray-100 text-gray-500',
  oferta: 'bg-yellow-100 text-yellow-700',
  comprado: 'bg-green-100 text-green-700',
}

const CERT_COLORS: Record<string, string> = {
  A: 'bg-green-600', B: 'bg-green-400', C: 'bg-yellow-400',
  D: 'bg-yellow-500', E: 'bg-orange-400', F: 'bg-orange-600', G: 'bg-red-600',
}

function formatPrice(n: number | null): string {
  if (!n) return '—'
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)
}

function priceVariation(piso: Piso): { diff: number; pct: string } | null {
  if (!piso.price_history || piso.price_history.length < 2) return null
  const sorted = [...piso.price_history].sort(
    (a: PriceHistory, b: PriceHistory) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime(),
  )
  const diff = sorted[0].precio - sorted[1].precio
  const pct = ((diff / sorted[1].precio) * 100).toFixed(1)
  return { diff, pct }
}

interface PisoCardProps {
  piso: Piso
  onEdit: () => void
  onDelete: () => void
  onComments: () => void
  onPrices: () => void
  onExtras: () => void
}

export default function PisoCard({ piso, onEdit, onDelete, onComments, onPrices, onExtras }: PisoCardProps) {
  const variation = priceVariation(piso)
  const precioM2 = piso.precio && piso.metros ? Math.round(piso.precio / piso.metros) : null
  const certColor = piso.certificacion_energetica ? CERT_COLORS[piso.certificacion_energetica] : undefined

  return (
    <div className={`rounded-2xl border bg-white p-5 shadow-sm transition hover:shadow-md ${piso.estado === 'descartado' ? 'opacity-60' : ''}`}>
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h3 className="truncate font-semibold text-gray-900">
            {piso.direccion ?? <span className="italic text-gray-400">Dirección pendiente</span>}
          </h3>
          {piso.barrio && <p className="text-sm text-gray-500">{piso.barrio}</p>}
        </div>
        <div className="flex items-center gap-2">
          {certColor && (
            <span className={`shrink-0 rounded px-1.5 py-0.5 text-xs font-bold text-white ${certColor}`}>
              {piso.certificacion_energetica}
            </span>
          )}
          {!certColor && piso.certificacion_energetica && (
            <span className="shrink-0 rounded bg-gray-100 px-1.5 py-0.5 text-xs font-medium text-gray-600">
              {piso.certificacion_energetica}
            </span>
          )}
          <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${ESTADO_COLORS[piso.estado] ?? 'bg-gray-100 text-gray-600'}`}>
            {piso.estado}
          </span>
          <ActionMenu
            onEdit={onEdit}
            onDelete={onDelete}
            onComments={onComments}
            onPrices={onPrices}
            onExtras={onExtras}
          />
        </div>
      </div>

      <div className="mb-3 flex items-end gap-2">
        <span className="text-2xl font-bold text-gray-900">{formatPrice(piso.precio)}</span>
        {variation && (
          <span className={`mb-0.5 text-sm font-medium ${variation.diff < 0 ? 'text-green-600' : 'text-red-500'}`}>
            {variation.diff < 0 ? '▼' : '▲'} {Math.abs(parseFloat(variation.pct))}%
          </span>
        )}
      </div>

      <div className="flex flex-wrap gap-3 text-sm text-gray-600">
        {piso.habitaciones && <span>🛏 {piso.habitaciones} hab.</span>}
        {piso.banos && <span>🚿 {piso.banos} baños</span>}
        {piso.metros && <span>📐 {piso.metros} m²</span>}
        {precioM2 && <span>💶 {formatPrice(precioM2)}/m²</span>}
        {piso.planta && <span>🏢 {piso.planta}</span>}
        {piso.orientacion && <span>🧭 {piso.orientacion}</span>}
        {piso.ascensor === true && <span>🛗 Ascensor</span>}
        {piso.ascensor === false && <span className="text-gray-400">🚶 Sin ascensor</span>}
        {piso.parking != null && piso.parking > 0 && (
          <span>🅿️ {piso.parking} plaza{piso.parking > 1 ? 's' : ''}</span>
        )}
      </div>

      {piso.notas && <p className="mt-2 text-sm text-gray-500 italic truncate">{piso.notas}</p>}

      {(piso.contacto_nombre ?? piso.contacto_telefono ?? piso.contacto_inmobiliaria) && (
        <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
          <span>{piso.contacto_inmobiliaria ? '🏢' : '👤'}</span>
          {piso.contacto_nombre && <span className="font-medium">{piso.contacto_nombre}</span>}
          {piso.contacto_inmobiliaria && <span className="text-gray-400">· {piso.contacto_inmobiliaria}</span>}
          {piso.contacto_telefono && (
            <a href={`tel:${piso.contacto_telefono}`} className="ml-auto text-blue-500 hover:underline">
              📞 {piso.contacto_telefono}
            </a>
          )}
        </div>
      )}
      <div className="mt-2 flex gap-3 text-xs text-gray-400">
        {piso.comments.length > 0 && <span>💬 {piso.comments.length}</span>}
        {piso.price_history.length > 0 && <span>📊 {piso.price_history.length} precios</span>}
        {piso.url && (
          <a href={piso.url} target="_blank" rel="noopener noreferrer" className="ml-auto text-blue-500 hover:underline">
            Ver anuncio →
          </a>
        )}
      </div>
    </div>
  )
}
