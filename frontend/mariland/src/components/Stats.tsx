import type { Piso } from '../types/piso'

function formatPrice(n: number | null): string {
  if (!n) return '—'
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)
}

interface StatsProps {
  pisos: Piso[]
}

export default function Stats({ pisos }: StatsProps) {
  const total = pisos.length
  const activos = pisos.filter((p) => p.estado !== 'descartado').length
  const precios = pisos.filter((p) => p.precio != null).map((p) => p.precio as number)
  const avgPrecio = precios.length ? Math.round(precios.reduce((a, b) => a + b, 0) / precios.length) : null
  const minPrecio = precios.length ? Math.min(...precios) : null
  const porEstado = pisos.reduce<Record<string, number>>((acc, p) => {
    acc[p.estado] = (acc[p.estado] ?? 0) + 1
    return acc
  }, {})

  const stats = [
    { label: 'Total', value: total },
    { label: 'Activos', value: activos },
    { label: 'Precio medio', value: formatPrice(avgPrecio) },
    { label: 'Precio mínimo', value: formatPrice(minPrecio) },
  ]

  return (
    <div className="flex flex-wrap gap-4">
      {stats.map(({ label, value }) => (
        <div key={label} className="rounded-xl bg-white border px-4 py-3 text-center shadow-sm min-w-24">
          <p className="text-xs text-gray-500 mb-0.5">{label}</p>
          <p className="text-lg font-bold text-gray-900">{value}</p>
        </div>
      ))}
      {Object.entries(porEstado).map(([estado, count]) => (
        <div key={estado} className="rounded-xl bg-white border px-4 py-3 text-center shadow-sm min-w-24">
          <p className="text-xs text-gray-500 mb-0.5">{estado}</p>
          <p className="text-lg font-bold text-gray-900">{count}</p>
        </div>
      ))}
    </div>
  )
}
