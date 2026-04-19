import type { Licitacion, RadarResponse } from "@/types"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

async function getToken(): Promise<string | null> {
  const { createBrowserClient } = await import("@supabase/ssr")
  const sb = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  const { data } = await sb.auth.getSession()
  return data.session?.access_token ?? null
}

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await getToken()
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  })
  if (!res.ok) throw new Error(`API error: ${res.status}`)
  return res.json()
}

export const api = {
  licitaciones: {
    list: (params?: { page?: number; q?: string }) => {
      const page = params?.page ?? 1
      const q = params?.q ? `&q=${encodeURIComponent(params.q)}` : ""
      return apiFetch<Licitacion[]>(`/api/licitaciones/?page=${page}${q}`)
    },
    radar: () => apiFetch<RadarResponse>("/api/licitaciones/radar"),
    get: (id: string) => apiFetch<any>(`/api/licitaciones/${id}`),
    ingestaStatus: () => apiFetch<any>("/api/licitaciones/ingesta-status"),
  },
  analisis: {
    create: (licitacion_id: string) =>
      apiFetch<any>("/api/analisis/", {
        method: "POST",
        body: JSON.stringify({ licitacion_id }),
      }),
    get: (id: string) => apiFetch<any>(`/api/analisis/${id}`),
  },
  expediente: {
    get: (analisis_id: string) => apiFetch<any>(`/api/expediente/${analisis_id}`),
    updatePropuesta: (expediente_id: string, text: string) =>
      apiFetch<any>(`/api/expediente/${expediente_id}/propuesta-tecnica`, {
        method: "PATCH",
        body: JSON.stringify({ propuesta_tecnica_draft: text }),
      }),
    aiRefine: (expediente_id: string, instruccion: string) =>
      apiFetch<any>(
        `/api/expediente/${expediente_id}/ai-refine?instruccion=${encodeURIComponent(instruccion)}`,
        { method: "POST" }
      ),
    descargarZip: async (analisis_id: string) => {
      const token = await getToken()
      const res = await fetch(
        `${API_URL}/api/expediente/${analisis_id}/zip`,
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      )
      if (!res.ok) throw new Error(`Error ${res.status}`)
      return res.blob()
    },
  },
  auth: {
    me: () => apiFetch<any>("/api/auth/me"),
    onboarding: (data: any) =>
      apiFetch<any>("/api/auth/onboarding", {
        method: "POST",
        body: JSON.stringify(data),
      }),
  },
  vault: {
    list: () => apiFetch<any[]>("/api/vault/"),
    requerimiento: (analisis_id: string) =>
      apiFetch<any[]>(`/api/vault/requerimiento/${analisis_id}`),
  },
  pagos: {
    info: (analisis_id: string) =>
      apiFetch<{
        analisis_id: string
        nivel_complejidad: string
        tipo_plan: string
        monto: number
        pago_status: string
        referencia: string
        banco: string
        clabe: string
        titular: string
      }>(`/api/pagos/info/${analisis_id}`),
    notificar: (analisis_id: string) =>
      apiFetch<{ status: string; monto?: number }>(`/api/pagos/notificar/${analisis_id}`, {
        method: "POST",
      }),
    subirComprobante: (analisis_id: string, file: File, token: string) => {
      const formData = new FormData()
      formData.append("file", file)
      return fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/pagos/comprobante/${analisis_id}`,
        { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: formData }
      ).then(async (res) => {
        if (!res.ok) throw new Error(`Error ${res.status}`)
        return res.json() as Promise<{ comprobante_url: string }>
      })
    },
    bloquear: (analisis_id: string) =>
      apiFetch<{ status: string }>(`/api/pagos/bloquear/${analisis_id}`, {
        method: "POST",
      }),
    recientes: () =>
      apiFetch<
        {
          analisis_id: string
          company_id: string
          nivel_complejidad: string
          pago_monto: number | null
          pago_status: string
          comprobante_url: string | null
          created_at: string
        }[]
      >("/api/pagos/recientes"),
  },
}
