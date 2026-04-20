"use client"
export const dynamic = "force-dynamic"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { api } from "@/lib/api"
import type { Expediente, Analisis } from "@/types"
import { ExpedienteEditor } from "@/components/expediente/ExpedienteEditor"
import Link from "next/link"

type DocRequerido = {
  tipo: string
  descripcion: string
  cubierto: boolean
  vault_doc_id: string | null
}

function VaultGap({ analisisId }: { analisisId: string }) {
  const [docs, setDocs] = useState<DocRequerido[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.vault
      .requerimiento(analisisId)
      .then(setDocs)
      .catch((err) => { console.error("VaultGap fetch failed:", err); setDocs([]) })
      .finally(() => setLoading(false))
  }, [analisisId])

  if (loading) return null

  const faltantes = docs.filter((d) => !d.cubierto)
  const cubiertos = docs.filter((d) => d.cubierto)

  if (docs.length === 0) return null

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-5 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-white text-sm font-semibold">Documentos requeridos para esta licitación</h2>
        {faltantes.length > 0 && (
          <Link
            href="/vault"
            className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
          >
            Subir al Vault →
          </Link>
        )}
      </div>

      {faltantes.length > 0 && (
        <div className="mb-4">
          <p className="text-red-400 text-xs font-medium mb-2">
            Faltan {faltantes.length} documento{faltantes.length !== 1 ? "s" : ""}
          </p>
          <ul className="space-y-2">
            {faltantes.map((doc) => (
              <li key={doc.tipo} className="flex items-start gap-2 text-xs">
                <span className="text-red-400 shrink-0 mt-0.5">✗</span>
                <span className="text-gray-300">{doc.descripcion}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {cubiertos.length > 0 && (
        <div>
          {faltantes.length > 0 && <div className="border-t border-gray-800 my-3" />}
          <p className="text-green-400 text-xs font-medium mb-2">
            {cubiertos.length} documento{cubiertos.length !== 1 ? "s" : ""} en el Vault
          </p>
          <ul className="space-y-2">
            {cubiertos.map((doc) => (
              <li key={doc.tipo} className="flex items-start gap-2 text-xs">
                <span className="text-green-400 shrink-0 mt-0.5">✓</span>
                <span className="text-gray-500">{doc.descripcion}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

export default function ExpedientePage({
  params,
}: {
  params: { id: string }
}) {
  const router = useRouter()
  const [expediente, setExpediente] = useState<Expediente | null>(null)
  const [analisis, setAnalisis] = useState<Analisis | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [descargando, setDescargando] = useState(false)
  const [errorDescarga, setErrorDescarga] = useState("")

  useEffect(() => {
    api.pagos
      .info(params.id)
      .then((pagoInfo) => {
        if (pagoInfo.pago_status !== "confirmado") {
          router.replace(`/pago/${params.id}`)
          return undefined
        }
        return api.expediente.get(params.id)
      })
      .then((data) => {
        if (data) {
          setExpediente(data)
          return api.analisis.get(data.analisis_id)
        }
        return undefined
      })
      .then((analisisData) => {
        if (analisisData) setAnalisis(analisisData)
        setLoading(false)
      })
      .catch(() => {
        setError("Expediente no encontrado o análisis aún en proceso")
        setLoading(false)
      })
  }, [params.id, router])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-gray-500 text-sm">Cargando expediente...</div>
      </div>
    )
  }

  if (error || !expediente) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 text-sm mb-4">{error}</p>
          <Link href="/dashboard" className="text-blue-400 text-sm hover:underline">
            ← Volver al dashboard
          </Link>
        </div>
      </div>
    )
  }

  async function handleDescargar() {
    if (!expediente) return
    setDescargando(true)
    setErrorDescarga("")
    try {
      const blob = await api.expediente.descargarZip(expediente.analisis_id)
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `expediente_${expediente.analisis_id.slice(0, 8).toUpperCase()}.zip`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch {
      setErrorDescarga("No se pudo generar el expediente. Intenta de nuevo.")
    } finally {
      setDescargando(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 p-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-white">
              Expediente v{expediente.version}
            </h1>
            <p className="text-gray-500 text-sm mt-0.5">
              Revisión y ajuste del borrador generado por IA
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-3">
              <button
                onClick={handleDescargar}
                disabled={descargando}
                className={`px-4 py-2 rounded-md text-sm font-semibold transition-colors ${
                  descargando
                    ? "bg-gray-700 text-gray-400 cursor-not-allowed"
                    : "bg-white text-gray-950 hover:bg-gray-100"
                }`}
              >
                {descargando ? "Generando..." : "Descargar ZIP"}
              </button>
              <Link
                href="/dashboard"
                className="text-gray-500 hover:text-gray-300 text-sm transition-colors"
              >
                ← Dashboard
              </Link>
            </div>
          </div>
        </div>
        <p className="text-xs text-gray-600 text-center max-w-lg mx-auto mb-4 leading-relaxed">
          Este expediente es una guía de apoyo generada con IA. Debe ser revisado por el área
          jurídica antes de presentarse ante la dependencia. La responsabilidad de la presentación
          recae exclusivamente en el participante.
        </p>

        {errorDescarga && (
          <p className="text-red-400 text-sm mb-4 text-center">{errorDescarga}</p>
        )}

        <VaultGap analisisId={expediente.analisis_id} />
        <ExpedienteEditor expediente={expediente} analisis={analisis} />
      </div>
    </div>
  )
}
