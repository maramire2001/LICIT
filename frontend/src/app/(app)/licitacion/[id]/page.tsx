"use client"
import { useEffect, useRef, useState } from "react"
import { useSearchParams } from "next/navigation"
import { api } from "@/lib/api"
import { createAnalisisSocket } from "@/lib/ws"
import type { Analisis } from "@/types"
import { PanelDecision } from "@/components/analisis/PanelDecision"

export default function LicitacionPage({
  params,
}: {
  params: { id: string }
}) {
  const searchParams = useSearchParams()
  const analisisId = searchParams.get("analisis")
  const [analisis, setAnalisis] = useState<Analisis | null>(null)
  const [progress, setProgress] = useState(0)
  const [step, setStep] = useState("Iniciando análisis...")
  const wsRef = useRef<WebSocket | null>(null)

  useEffect(() => {
    if (!analisisId) return

    wsRef.current = createAnalisisSocket(
      analisisId,
      (stepLabel, pct) => {
        setStep(stepLabel)
        setProgress(pct)
      },
      async () => {
        const data = await api.analisis.get(analisisId)
        setAnalisis(data)
      }
    )

    return () => wsRef.current?.close()
  }, [analisisId])

  return (
    <div className="min-h-screen bg-gray-950 p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-xl font-bold text-white">
            {analisis ? "Panel de Decisión" : "Analizando licitación..."}
          </h1>
          {!analisis && (
            <p className="text-gray-500 text-sm mt-1">
              La IA está procesando los documentos de la licitación
            </p>
          )}
        </div>

        {/* Progress */}
        {!analisis && (
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-5 mb-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-gray-400 text-sm">{step}</span>
              <span className="text-blue-400 text-sm font-medium">
                {progress}%
              </span>
            </div>
            <div className="w-full bg-gray-800 rounded-full h-1.5">
              <div
                className="bg-blue-500 h-1.5 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Panel */}
        {analisis && <PanelDecision analisis={analisis} />}
      </div>
    </div>
  )
}
