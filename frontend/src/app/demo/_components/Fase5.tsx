"use client"
import { useState } from "react"
import { DEMO_DOCS } from "../_data"

type DocEstado = "ok" | "flag" | "falta"

export function Fase5({ onNext }: { onNext: () => void }) {
  const [estados, setEstados] = useState<Record<string, DocEstado>>(
    Object.fromEntries(DEMO_DOCS.map(d => [d.id, d.estado]))
  )

  function simularSubida(id: string) {
    setEstados(prev => ({ ...prev, [id]: "ok" }))
  }

  const total = DEMO_DOCS.length
  const cubiertos = Object.values(estados).filter(e => e === "ok").length
  const pct = Math.round((cubiertos / total) * 100)
  const listo = pct === 100

  return (
    <div>
      <div className="bg-green-950/20 border border-green-700/40 rounded-xl p-4 mb-5 flex items-start gap-3">
        <span className="text-2xl shrink-0">🤖</span>
        <div>
          <div className="text-green-400 text-sm font-bold mb-1">LICIT-IA analizó el Anexo Técnico de la convocatoria</div>
          <div className="text-green-700 text-xs leading-relaxed">
            Para cumplir con los puntos <strong className="text-green-600">3.1, 4.2 y 6.8</strong> de las bases del IMSS,
            necesitas subir los siguientes documentos. Cada uno es obligatorio para no ser descalificado.
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2 mb-5">
        {DEMO_DOCS.map(doc => {
          const est = estados[doc.id]
          return (
            <div
              key={doc.id}
              className={`rounded-xl p-3.5 border flex items-center gap-3 transition-all ${
                est === "ok"
                  ? "bg-green-950/20 border-green-800/50"
                  : est === "flag"
                  ? "bg-yellow-950/20 border-yellow-700/50"
                  : "bg-red-950/20 border-red-900/40 border-dashed"
              }`}
            >
              <div className={`w-7 h-7 rounded-lg shrink-0 flex items-center justify-center text-xs font-bold ${
                est === "ok" ? "bg-green-700 text-white" :
                est === "flag" ? "bg-yellow-700 text-white" :
                "bg-red-900 text-red-300"
              }`}>
                {est === "ok" ? "✓" : est === "flag" ? "⚑" : "✗"}
              </div>
              <div className="flex-1 min-w-0">
                <div className={`text-sm font-semibold truncate ${
                  est === "ok" ? "text-green-300" :
                  est === "flag" ? "text-yellow-300" : "text-red-300"
                }`}>
                  {doc.label}
                </div>
                <div className={`text-xs mt-0.5 ${
                  est === "ok" ? "text-gray-600" :
                  est === "flag" ? "text-yellow-800" : "text-red-900"
                }`}>
                  {doc.nota}
                </div>
              </div>
              {(est === "flag" || est === "falta") && (
                <button
                  onClick={() => simularSubida(doc.id)}
                  className={`shrink-0 text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${
                    est === "flag"
                      ? "bg-yellow-900 text-yellow-400 hover:bg-yellow-800"
                      : "bg-red-900 text-red-300 hover:bg-red-800"
                  }`}
                >
                  {est === "flag" ? "Actualizar" : "Subir PDF"}
                </button>
              )}
            </div>
          )
        })}
      </div>

      {/* Barra de progreso */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 mb-5">
        <div className="flex justify-between mb-2">
          <span className="text-gray-400 text-sm">Cobertura documental</span>
          <span className={`text-sm font-bold ${listo ? "text-green-400" : "text-yellow-400"}`}>
            {pct}% · {cubiertos} de {total} documentos listos
          </span>
        </div>
        <div className="bg-gray-800 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-500 ${listo ? "bg-green-500" : "bg-yellow-500"}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        {!listo && (
          <p className="text-gray-600 text-xs mt-2">
            Sube los {total - cubiertos} documentos faltantes para habilitar la generación del expediente
          </p>
        )}
      </div>

      <button
        onClick={onNext}
        disabled={!listo}
        className={`w-full font-black py-4 rounded-xl text-base transition-all ${
          listo
            ? "bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white shadow-lg shadow-emerald-600/30"
            : "bg-gray-800 text-gray-600 cursor-not-allowed"
        }`}
      >
        📦 Generar mi Expediente de Propuesta →
      </button>
    </div>
  )
}
