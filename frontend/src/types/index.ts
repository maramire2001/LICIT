export interface Licitacion {
  id: string
  numero_procedimiento: string
  titulo: string
  dependencia: string
  fecha_apertura: string | null
  monto_estimado: number | null
  estado: string
  score_relevancia: number
}

export interface Analisis {
  id: string
  licitacion_id: string
  status: "procesando" | "listo" | "error"
  viabilidad: "participar" | "con_condiciones" | "no_participar" | null
  score_viabilidad: number | null
  modelo_evaluacion_detectado: string | null
  requisitos_criticos: { items: string[] }
  riesgos: { items: string[] }
  price_to_win_conservador: number | null
  ptw_optimo: number | null
  ptw_agresivo: number | null
  competidores: { top: Competidor[] }
  created_at: string
}

export interface Competidor {
  empresa: string
  wins: number
  montos: number[]
}

export interface Expediente {
  id: string
  analisis_id: string
  carpeta_admin: { documentos: string[] }
  propuesta_tecnica_draft: string | null
  propuesta_economica: { monto_propuesto: number | null; desglose: any[] }
  checklist: { items: string[] }
  faltantes: { items: string[] }
  version: number
}
