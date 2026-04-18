export interface Licitacion {
  id: string
  numero_procedimiento: string
  titulo: string
  dependencia: string
  fecha_apertura: string | null
  monto_estimado: number | null
  estado: string
  score_relevancia?: number
}

export interface RadarResponse {
  sin_perfil: boolean
  resultados: Licitacion[]
}

export interface MatrizItem {
  requisito: string
  nivel_riesgo: "alto" | "medio" | "bajo"
}

export interface RoiDatos {
  horas_equipo: number
  costo_por_hora_mxn: number
  costo_total_mxn: number
  tiempo_licit_ia: string
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
  nivel_complejidad: "bronce" | "plata" | "oro" | null
  matriz_humana: { items: MatrizItem[] } | null
  matriz_materiales: { items: MatrizItem[] } | null
  matriz_financiera: { items: MatrizItem[] } | null
  roi_datos: RoiDatos | null
  pago_status?: string
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
