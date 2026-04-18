"use client"
export const dynamic = "force-dynamic"
import { useEffect, useState } from "react"
import { api } from "@/lib/api"
import Link from "next/link"

type PagoPendiente = {
  analisis_id: string
  company_id: string
  nivel_complejidad: string
  pago_monto: number | null
  pago_status: string
  comprobante_url: string | null
  created_at: string
}

function formatMXN(n: number | null) {
  if (n === null || n === undefined) return "—"
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(n)
}

export default function AdminPagosPage() {
  const [pagos, setPagos] = useState<PagoPendiente[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [bloqueando, setBloqueando] = useState<string | null>(null)

  async function cargar() {
    setLoading(true)
    try {
      const data = await api.pagos.recientes()
      setPagos(data)
      setError("")
    } catch {
      setError("Sin acceso o error al cargar. ¿Estás logueado como admin?")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { cargar() }, [])

  async function bloquear(analisis_id: string) {
    setBloqueando(analisis_id)
    try {
      await api.pagos.bloquear(analisis_id)
      setPagos((prev) => prev.filter((p) => p.analisis_id !== analisis_id))
    } catch {
      setError("Error al bloquear. Intenta de nuevo.")
    } finally {
      setBloqueando(null)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-gray-500 text-sm">Cargando panel de pagos...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 p-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-white">Panel Admin — Pagos Confirmados</h1>
            <p className="text-gray-500 text-sm mt-0.5">Bloquea si el pago no se acredita en tu banco</p>
          </div>
          <Link href="/dashboard" className="text-gray-500 text-sm hover:text-gray-300 transition-colors">
            ← Dashboard
          </Link>
        </div>

        {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

        {pagos.length === 0 ? (
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-8 text-center">
            <p className="text-gray-500 text-sm">No hay pagos confirmados</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pagos.map((p) => (
              <div key={p.analisis_id} className="bg-gray-900 border border-gray-800 rounded-lg p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1 min-w-0">
                    <p className="text-white text-sm font-semibold capitalize">
                      Nivel {p.nivel_complejidad || "—"}
                      <span className="ml-2 text-green-400 font-bold">{formatMXN(p.pago_monto)}</span>
                    </p>
                    <p className="text-gray-500 text-xs font-mono truncate">
                      Análisis: {p.analisis_id}
                    </p>
                    <p className="text-gray-500 text-xs font-mono truncate">
                      Empresa: {p.company_id}
                    </p>
                    <p className="text-gray-600 text-xs">
                      {new Date(p.created_at).toLocaleString("es-MX")}
                    </p>
                    {p.comprobante_url && (
                      <a
                        href={p.comprobante_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 text-xs hover:underline"
                      >
                        Ver comprobante →
                      </a>
                    )}
                  </div>
                  <button
                    onClick={() => bloquear(p.analisis_id)}
                    disabled={bloqueando === p.analisis_id}
                    className={`shrink-0 px-4 py-2 rounded-md text-xs font-semibold transition-colors ${
                      bloqueando === p.analisis_id
                        ? "bg-gray-700 text-gray-400 cursor-not-allowed"
                        : "bg-red-700 hover:bg-red-800 text-white"
                    }`}
                  >
                    {bloqueando === p.analisis_id ? "Bloqueando..." : "Bloquear acceso"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <button
          onClick={cargar}
          disabled={loading}
          className="mt-4 text-gray-500 text-xs hover:text-gray-300 transition-colors disabled:opacity-40"
        >
          Actualizar lista
        </button>
      </div>
    </div>
  )
}
