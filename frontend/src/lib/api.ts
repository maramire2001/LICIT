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
    list: (page = 1) => apiFetch<any[]>(`/api/licitaciones/?page=${page}`),
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
  },
}
