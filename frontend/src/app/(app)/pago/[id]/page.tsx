"use client"
export const dynamic = "force-dynamic"
import { use, useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { api } from "@/lib/api"
import { supabase } from "@/lib/supabase"
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

export default function PagoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [info, setInfo] = useState<PagoInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [notificando, setNotificando] = useState(false)
  const [error, setError] = useState("")
  const [comprobante, setComprobante] = useState<File | null>(null)
  const [subiendo, setSubiendo] = useState(false)
  const [comprobanteSubido, setComprobanteSubido] = useState(false)
  const [token, setToken] = useState<string | null>(null)

  const fetchInfo = useCallback(async () => {
    try {
      const data = await api.pagos.info(id)
      setInfo(data)
      if (data.pago_status === "confirmado") {
        router.replace(`/expediente/${id}`)
      }
    } catch {
      setError("No se pudo cargar la información de pago")
    } finally {
      setLoading(false)
    }
  }, [id, router])

  useEffect(() => {
    fetchInfo()
    const interval = setInterval(fetchInfo, 30_000)
    return () => clearInterval(interval)
  }, [fetchInfo])

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setToken(data.session?.access_token ?? null)
    })
  }, [])

  async function handleSubirComprobante() {
    if (!comprobante || !token) return
    setSubiendo(true)
    setError("")
    try {
      await api.pagos.subirComprobante(id, comprobante, token)
      setComprobanteSubido(true)
    } catch {
      setError("Error al subir el comprobante. Intenta de nuevo.")
    } finally {
      setSubiendo(false)
    }
  }

  async function handleNotificar() {
    setNotificando(true)
    setError("")
    try {
      await api.pagos.notificar(id)
      router.replace(`/expediente/${id}`)
    } catch {
      setError("Error al confirmar. Verifica que tu comprobante esté subido.")
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

        {/* Step 1: Upload comprobante */}
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-5 space-y-3">
          <p className="text-white text-sm font-semibold">
            Paso 1 — Sube tu comprobante de transferencia
          </p>
          <p className="text-gray-500 text-xs">PDF, imagen o XML del comprobante bancario</p>
          {comprobanteSubido ? (
            <div className="flex items-center gap-2 text-green-400 text-xs">
              <span>✓</span>
              <span>Comprobante cargado correctamente</span>
            </div>
          ) : (
            <div className="space-y-2">
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.xml"
                onChange={(e) => setComprobante(e.target.files?.[0] ?? null)}
                className="text-gray-400 text-sm file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:bg-gray-700 file:text-gray-300 hover:file:bg-gray-600"
              />
              <button
                onClick={handleSubirComprobante}
                disabled={!comprobante || subiendo}
                className={`w-full py-2 rounded-lg text-sm font-semibold transition-colors ${
                  !comprobante || subiendo
                    ? "bg-gray-700 text-gray-400 cursor-not-allowed"
                    : "bg-gray-700 hover:bg-gray-600 text-white"
                }`}
              >
                {subiendo ? "Subiendo..." : "Subir comprobante"}
              </button>
            </div>
          )}
        </div>

        {/* Step 2: Confirm access */}
        <button
          onClick={handleNotificar}
          disabled={!comprobanteSubido || notificando}
          className={`w-full py-3 rounded-lg text-sm font-semibold transition-colors ${
            !comprobanteSubido || notificando
              ? "bg-gray-700 text-gray-400 cursor-not-allowed"
              : "bg-white text-gray-950 hover:bg-gray-100"
          }`}
        >
          {notificando ? "Procesando..." : "Confirmar y acceder al expediente →"}
        </button>

        {error && <p className="text-red-400 text-xs text-center">{error}</p>}

        <p className="text-gray-600 text-xs text-center">
          ¿Dudas? Escríbenos a marioantonioramirezbarajas@gmail.com
        </p>
      </div>
    </div>
  )
}
