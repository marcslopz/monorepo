export interface PriceHistory {
  id: number
  piso_id: number
  precio: number
  notas: string | null
  fecha: string
}

export interface Comment {
  id: number
  piso_id: number
  texto: string
  fecha: string
}

export interface Piso {
  id: number
  url: string | null
  imagen_url: string | null
  direccion: string | null
  barrio: string | null
  precio: number | null
  habitaciones: number | null
  banos: number | null
  metros: number | null
  planta: string | null
  ascensor: boolean | null
  parking: number | null
  certificacion_energetica: string | null
  orientacion: string | null
  contacto_nombre: string | null
  contacto_telefono: string | null
  contacto_inmobiliaria: string | null
  estado: string
  owner: string | null
  extras: Record<string, boolean> | null
  notas: string | null
  created_at: string
  updated_at: string
  price_history: PriceHistory[]
  comments: Comment[]
}

export interface PisoCreate {
  url?: string | null
  imagen_url?: string | null
  direccion?: string | null
  barrio?: string | null
  precio?: number | null
  habitaciones?: number | null
  banos?: number | null
  metros?: number | null
  planta?: string | null
  ascensor?: boolean | null
  parking?: number | null
  certificacion_energetica?: string | null
  orientacion?: string | null
  contacto_nombre?: string | null
  contacto_telefono?: string | null
  contacto_inmobiliaria?: string | null
  estado?: string
  owner?: string | null
  extras?: Record<string, boolean> | null
  notas?: string | null
}

export type PisoUpdate = PisoCreate

export type SseProgressEvent = { type: 'progress'; step: string; message: string }
export type SseDoneEvent = { type: 'done'; piso: Piso }
export type SseErrorEvent = { type: 'error'; step: string; message: string }
export type SseEvent = SseProgressEvent | SseDoneEvent | SseErrorEvent

export interface PriceHistoryCreate {
  precio: number
  notas?: string | null
}

export interface CommentCreate {
  texto: string
}
