"use client"
export const dynamic = "force-dynamic"
import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { api } from "@/lib/api"
import Link from "next/link"

type PagoInfo = {
  analisis_id: string
  nivel_complejidad: string
  tipo_plan: string
  monto: number
  pago_status: string
  referencia: string
  banco: string
  clabe: string
  titular: string
}

const NIVEL_COLOR: Record<string, string> = {
  bronce: "text-amber-400 border-amber-700 bg-amber-950",
  plata:  "text-gray-300 border-gray-600 bg-gray-900",
  oro:    "text-yellow-400 border-yellow-700 bg-yellow-950",
}

function formatMXN(n: number) {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(n)
}

export default function PagoPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [info, setInfo] = useState<PagoInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [notificando, setNotificando] = useState(false)
  const [notificado, setNotificado] = useState(false)
  const [error, setError] = useState("")

  const fetchInfo = useCallback(async () => {
    try {
      const data = await api.pagos.info(params.id)
      setInfo(data)
      if (data.pago_status === "confirmado") {
        router.replace(`/expediente/${params.id}`)
      }
      if (data.pago_status === "en_revision") {
        setNotificado(true)
      }
    } catch {
      setError("No se pudo cargar la información de pago")
    } finally {
      setLoading(false)
    }
  }, [params.id, router])

  useEffect(() => {
    fetchInfo()
    const interval = setInterval(fetchInfo, 30_000)
    return () => clearInterval(interval)
  }, [fetchInfo])

  async function handleNotificar() {
    setNotificando(true)
    try {
      await api.pagos.notificar(params.id)
      setNotificado(true)
      setInfo((prev) => prev ? { ...prev, pago_status: "en_revision" } : prev)
    } catch {
      setError("Error al registrar tu notificación. Intenta de nuevo.")
    } finally {
      setNotificando(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-gray-500 text-sm">Cargando información de pago...</div>
      </div>
    )
  }

  if (error || !info) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 text-sm mb-4">{error}</p>
          <Link href="/dashboard" className="text-blue-400 text-sm hover:underline">← Volver al dashboard</Link>
        </div>
      </div>
    )
  }

  const nivelKey = (info.nivel_complejidad || "bronce").toLowerCase()
  const colorClass = NIVEL_COLOR[nivelKey] || NIVEL_COLOR.bronce

  return (
    <div className="min-h-screen bg-gray-950 p-6 flex items-center justify-center">
      <div className="w-full max-w-md space-y-5">

        <div>
          <Link href="/dashboard" className="text-gray-500 text-xs hover:text-gray-300 transition-colors">
            ← Dashboard
          </Link>
          <h1 className="text-xl font-bold text-white mt-2">Acceso al Expediente</h1>
          <p className="text-gray-500 text-sm mt-1">
            Realiza tu transferencia para desbloquear el expediente completo
          </p>
        </div>

        <div className={`border rounded-lg p-5 ${colorClass}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest opacity-70">
                Nivel {info.nivel_complejidad || "Bronce"}
              </p>
              <p className="text-3xl font-bold mt-1">{formatMXN(info.monto)}</p>
              <p className="text-xs opacity-60 mt-1">
                {info.tipo_plan === "radar" ? "Tarifa miembro Radar" : "Tarifa acceso directo"}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-lg p-5 space-y-4">
          <p className="text-white text-sm font-semibold">Datos para transferencia SPEI</p>
          <div className="space-y-3">
            <div>
              <p className="text-gray-500 text-xs">Banco</p>
              <p className="text-white text-sm font-mono">{info.banco}</p>
            </div>
            <div>
              <p className="text-gray-500 text-xs">CLABE</p>
              <p className="text-white text-sm font-mono tracking-wider">{info.clabe}</p>
            </div>
            <div>
              <p className="text-gray-500 text-xs">Titular</p>
              <p className="text-white text-sm font-mono">{info.titular}</p>
            </div>
            <div>
              <p className="text-gray-500 text-xs">Referencia (pon este código en el concepto)</p>
              <p className="text-blue-400 text-sm font-mono font-bold tracking-widest">{info.referencia}</p>
            </div>
            <div>
              <p className="text-gray-500 text-xs">Monto exacto</p>
              <p className="text-white text-sm font-mono font-bold">{formatMXN(info.monto)}</p>
            </div>
          </div>
        </div>

        {notificado ? (
          <div className="bg-blue-950 border border-blue-800 rounded-lg p-5 text-center">
            <p className="text-blue-300 text-sm font-semibold">Transferencia registrada</p>
            <p className="text-blue-400 text-xs mt-1">
              Confirmaremos tu pago en las próximas horas y recibirás acceso automáticamente.
            </p>
          </div>
        ) : (
          <button
            onClick={handleNotificar}
            disabled={notificando}
            className={`w-full py-3 rounded-lg text-sm font-semibold transition-colors ${
              notificando
                ? "bg-gray-700 text-gray-400 cursor-not-allowed"
                : "bg-white text-gray-950 hover:bg-gray-100"
            }`}
          >
            {notificando ? "Registrando..." : "Ya realicé mi transferencia"}
          </button>
        )}

        {error && <p className="text-red-400 text-xs text-center">{error}</p>}

        <p className="text-gray-600 text-xs text-center">
          ¿Dudas? Escríbenos a marioantonioramirezbarajas@gmail.com
        </p>
      </div>
    </div>
  )
}
