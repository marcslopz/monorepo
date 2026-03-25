import { ESTADOS } from '../utils/estadoUtils'

interface FiltersProps {
  search: string
  setSearch: (v: string) => void
  estadoFilter: string
  setEstadoFilter: (v: string) => void
  barrioFilter: string
  setBarrioFilter: (v: string) => void
  barrios: string[]
  hideDescartados: boolean
  setHideDescartados: (v: boolean) => void
}

export default function Filters({
  search,
  setSearch,
  estadoFilter,
  setEstadoFilter,
  barrioFilter,
  setBarrioFilter,
  barrios,
  hideDescartados,
  setHideDescartados,
}: FiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Buscar por dirección, inmobiliaria o notas..."
        className="flex-1 min-w-48 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
      />
      <select
        value={estadoFilter}
        onChange={(e) => setEstadoFilter(e.target.value)}
        className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none bg-white"
      >
        <option value="">Todos los estados</option>
        {ESTADOS.map((e) => <option key={e} value={e}>{e}</option>)}
      </select>
      <select
        value={barrioFilter}
        onChange={(e) => setBarrioFilter(e.target.value)}
        className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none bg-white"
      >
        <option value="">Todos los barrios</option>
        {barrios.map((b) => <option key={b} value={b}>{b}</option>)}
      </select>
      <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={hideDescartados}
          onChange={(e) => setHideDescartados(e.target.checked)}
          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
        Ocultar descartados
      </label>
    </div>
  )
}
