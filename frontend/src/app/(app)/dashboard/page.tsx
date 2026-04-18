"use client"
import { useEffect, useState } from "react"
import { api } from "@/lib/api"
import { LicitacionCard } from "@/components/dashboard/LicitacionCard"
import type { Licitacion } from "@/types"

export default function DashboardPage() {
  const [licitaciones, setLicitaciones] = useState<Licitacion[]>([])
  const [loading, setLoading] = useState(true)
  const [ingesta, setIngesta] = useState<{
    progreso: number
    status: string
    registros: number
  } | null>(null)

  useEffect(() => {
    api.licitaciones
      .list()
      .then((data) => {
        setLicitaciones(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))

    api.licitaciones.ingestaStatus().then(setIngesta).catch(() => null)
  }, [])

  return (
    <div className="min-h-screen bg-gray-950 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">
              LICIT<span className="text-blue-400">-IA</span>
            </h1>
            <p className="text-gray-500 text-sm mt-0.5">
              Oportunidades de licitación pública
            </p>
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
            <div className="w-12 h-12 rounded-full bg-gray-900 border border-gray-800 flex items-center justify-center mx-auto mb-4">
              <div className="w-4 h-4 rounded-full bg-blue-400 animate-pulse" />
            </div>
            <p className="text-gray-400 font-medium">Ingesta en progreso</p>
            <p className="text-gray-600 text-sm mt-1">
              Las licitaciones aparecerán aquí en breve
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {licitaciones.map((l) => (
              <LicitacionCard key={l.id} licitacion={l} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
