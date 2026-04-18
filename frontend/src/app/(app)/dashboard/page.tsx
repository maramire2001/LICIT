"use client"
export const dynamic = "force-dynamic"
import { useEffect, useRef, useState } from "react"
import { api } from "@/lib/api"
import { LicitacionCard } from "@/components/dashboard/LicitacionCard"
import type { Licitacion } from "@/types"

export default function DashboardPage() {
  const [licitaciones, setLicitaciones] = useState<Licitacion[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState("")
  const [sinPerfil, setSinPerfil] = useState(false)
  const [companyNombre, setCompanyNombre] = useState("")
  const [ingesta, setIngesta] = useState<{
    progreso: number
    status: string
    registros: number
  } | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  async function cargarRadar() {
    setLoading(true)
    try {
      const data = await api.licitaciones.radar()
      setLicitaciones(data.resultados)
      setSinPerfil(data.sin_perfil)
    } catch {
      setSinPerfil(false)
    } finally {
      setLoading(false)
    }
  }

  async function cargarBusqueda(q: string) {
    setLoading(true)
    try {
      const data = await api.licitaciones.list({ q })
      setLicitaciones(data)
      setSinPerfil(false)
    } catch {
      setLicitaciones([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    cargarRadar()
    api.licitaciones.ingestaStatus().then(setIngesta).catch(() => null)
    api.auth.me().then((me: any) => {
      if (me?.company_nombre) setCompanyNombre(me.company_nombre)
    }).catch(() => null)
  }, [])

  function handleQuery(value: string) {
    setQuery(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (value === "") {
      cargarRadar()
      return
    }
    debounceRef.current = setTimeout(() => cargarBusqueda(value), 400)
  }

  const subtitulo = query ? "Búsqueda libre" : "Oportunidades filtradas por tu ADN"

  return (
    <div className="min-h-screen bg-gray-950 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-white">
              {companyNombre
                ? <>Radar · <span className="text-blue-400">{companyNombre}</span></>
                : <>LICIT<span className="text-blue-400">-IA</span></>
              }
            </h1>
            <p className="text-gray-500 text-sm mt-0.5">{subtitulo}</p>
          </div>
          {ingesta && ingesta.status !== "completado" && (
            <div className="flex items-center gap-2 text-xs text-gray-500 bg-gray-900 border border-gray-800 rounded-lg px-3 py-2">
              <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
              <span>
                Ingesta histórica: {ingesta.progreso}% ·{" "}
                {ingesta.registros.toLocaleString()} registros
              </span>
            </div>
          )}
        </div>

        {/* Búsqueda */}
        <div className="mb-6">
          <input
            type="text"
            value={query}
            onChange={(e) => handleQuery(e.target.value)}
            placeholder="Buscar licitaciones por nombre o dependencia..."
            className="w-full bg-gray-900 border border-gray-800 rounded-lg px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-gray-600 transition-colors"
          />
        </div>

        {/* Content */}
        {loading ? (
          <div className="space-y-3">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="h-28 bg-gray-900 rounded-lg animate-pulse border border-gray-800"
              />
            ))}
          </div>
        ) : licitaciones.length === 0 ? (
          <div className="text-center py-24">
            {sinPerfil ? (
              <>
                <p className="text-gray-400 font-medium">Completa tu perfil ADN</p>
                <p className="text-gray-600 text-sm mt-1 mb-4">
                  Para ver oportunidades personalizadas necesitamos conocer tu empresa
                </p>
                <a
                  href="/onboarding"
                  className="text-blue-400 text-sm hover:underline"
                >
                  Completar perfil →
                </a>
              </>
            ) : query ? (
              <>
                <p className="text-gray-400 font-medium">Sin resultados para &ldquo;{query}&rdquo;</p>
                <p className="text-gray-600 text-sm mt-1">Intenta con otro término</p>
              </>
            ) : (
              <>
                <div className="w-12 h-12 rounded-full bg-gray-900 border border-gray-800 flex items-center justify-center mx-auto mb-4">
                  <div className="w-4 h-4 rounded-full bg-blue-400 animate-pulse" />
                </div>
                <p className="text-gray-400 font-medium">
                  No hay licitaciones activas que coincidan con tu perfil
                </p>
                <button
                  onClick={() => { setQuery(""); cargarRadar() }}
                  className="text-blue-400 text-sm hover:underline mt-2"
                >
                  Ver todas las licitaciones
                </button>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {licitaciones.map((l) => (
              // TODO: add relevancia={l.score_relevancia} once Task 5 adds the prop to LicitacionCard
              <LicitacionCard key={l.id} licitacion={l} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
