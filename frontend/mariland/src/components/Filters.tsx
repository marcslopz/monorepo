const ESTADOS = ['candidato', 'visitado', 'descartado', 'oferta', 'comprado']

interface FiltersProps {
  search: string
  setSearch: (v: string) => void
  estadoFilter: string
  setEstadoFilter: (v: string) => void
  barrioFilter: string
  setBarrioFilter: (v: string) => void
  barrios: string[]
}

export default function Filters({
  search,
  setSearch,
  estadoFilter,
  setEstadoFilter,
  barrioFilter,
  setBarrioFilter,
  barrios,
}: FiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Buscar por dirección o notas..."
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
    </div>
  )
}
