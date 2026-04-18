"use client"
import { useEffect, useState } from "react"
import { api } from "@/lib/api"
import type { Expediente } from "@/types"
import { ExpedienteEditor } from "@/components/expediente/ExpedienteEditor"
import Link from "next/link"

export default function ExpedientePage({
  params,
}: {
  params: { id: string }
}) {
  const [expediente, setExpediente] = useState<Expediente | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    api.expediente
      .get(params.id)
      .then((data) => {
        setExpediente(data)
        setLoading(false)
      })
      .catch(() => {
        setError("Expediente no encontrado o análisis aún en proceso")
        setLoading(false)
      })
  }, [params.id])

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

  return (
    <div className="min-h-screen bg-gray-950 p-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-white">
              Expediente v{expediente.version}
            </h1>
            <p className="text-gray-500 text-sm mt-0.5">
              Revisión y ajuste del borrador generado por IA
            </p>
          </div>
          <Link
            href="/dashboard"
            className="text-gray-500 hover:text-gray-300 text-sm transition-colors"
          >
            ← Dashboard
          </Link>
        </div>

        <ExpedienteEditor expediente={expediente} />
      </div>
    </div>
  )
}
