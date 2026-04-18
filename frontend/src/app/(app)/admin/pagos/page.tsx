"use client"
export const dynamic = "force-dynamic"
import { useEffect, useState } from "react"
import { api } from "@/lib/api"
import Link from "next/link"

type PendientePago = {
  analisis_id: string
  company_id: string
  nivel_complejidad: string
  pago_monto: number | null
  pago_status: string
  created_at: string
}

function formatMXN(n: number | null) {
  if (n === null || n === undefined) return "—"
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(n)
}

export default function AdminPagosPage() {
  const [pagos, setPagos] = useState<PendientePago[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [confirmando, setConfirmando] = useState<string | null>(null)

  async function cargar() {
    setLoading(true)
    try {
      const data = await api.pagos.pendientes()
      setPagos(data)
      setError("")
    } catch {
      setError("Sin acceso o error al cargar. ¿Estás logueado como admin?")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { cargar() }, [])

  async function confirmar(analisis_id: string) {
    setConfirmando(analisis_id)
    try {
      await api.pagos.confirmar(analisis_id)
      setPagos((prev) => prev.filter((p) => p.analisis_id !== analisis_id))
    } catch {
      setError("Error al confirmar. Intenta de nuevo.")
    } finally {
      setConfirmando(null)
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
            <h1 className="text-xl font-bold text-white">Panel Admin — Pagos en Revisión</h1>
            <p className="text-gray-500 text-sm mt-0.5">Confirma transferencias para desbloquear expedientes</p>
          </div>
          <Link href="/dashboard" className="text-gray-500 text-sm hover:text-gray-300 transition-colors">
            ← Dashboard
          </Link>
        </div>

        {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

        {pagos.length === 0 ? (
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-8 text-center">
            <p className="text-gray-500 text-sm">No hay pagos en revisión</p>
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
                  </div>
                  <button
                    onClick={() => confirmar(p.analisis_id)}
                    disabled={confirmando === p.analisis_id}
                    className={`shrink-0 px-4 py-2 rounded-md text-xs font-semibold transition-colors ${
                      confirmando === p.analisis_id
                        ? "bg-gray-700 text-gray-400 cursor-not-allowed"
                        : "bg-green-600 hover:bg-green-700 text-white"
                    }`}
                  >
                    {confirmando === p.analisis_id ? "Confirmando..." : "Confirmar pago"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <button
          onClick={cargar}
          className="mt-4 text-gray-500 text-xs hover:text-gray-300 transition-colors"
        >
          Actualizar lista
        </button>
      </div>
    </div>
  )
}
