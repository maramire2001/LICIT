"use client"
import Link from "next/link"
import type { Analisis } from "@/types"
import { Semaforo } from "./Semaforo"
import { PriceToWin } from "./PriceToWin"

export function PanelDecision({ analisis }: { analisis: Analisis }) {
  return (
    <div className="space-y-4">
      {/* Semaforo */}
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-5">
        <Semaforo
          viabilidad={analisis.viabilidad!}
          score={analisis.score_viabilidad}
        />
        <p className="text-gray-600 text-xs mt-3">
          Modelo de evaluación:{" "}
          <span className="text-gray-400">
            {analisis.modelo_evaluacion_detectado ?? "—"}
          </span>
        </p>
        <p className="text-gray-600 text-xs mt-2">
          Índice estimado basado en datos históricos y perfil declarado. No constituye garantía de adjudicación.
        </p>
      </div>

      {/* Price to Win */}
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-5">
        <h3 className="text-white text-sm font-semibold mb-3">Price to Win</h3>
        <PriceToWin
          conservador={analisis.price_to_win_conservador}
          optimo={analisis.ptw_optimo}
          agresivo={analisis.ptw_agresivo}
        />
      </div>

      {/* Competidores */}
      {analisis.competidores.top?.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-5">
          <h3 className="text-white text-sm font-semibold mb-3">
            Competidores históricos
          </h3>
          <div className="space-y-2">
            {analisis.competidores.top.slice(0, 3).map((c) => (
              <div
                key={c.empresa}
                className="flex justify-between items-center text-sm"
              >
                <span className="text-gray-300 truncate flex-1 mr-2">
                  {c.empresa}
                </span>
                <span className="text-xs text-gray-500 shrink-0">
                  {c.wins} {c.wins === 1 ? "victoria" : "victorias"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Requisitos críticos */}
      {analisis.requisitos_criticos.items?.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-5">
          <h3 className="text-white text-sm font-semibold mb-3">
            Requisitos críticos
          </h3>
          <ul className="space-y-1.5">
            {analisis.requisitos_criticos.items.slice(0, 6).map((req, i) => (
              <li key={i} className="flex gap-2 text-xs text-gray-400">
                <span className="text-blue-400 shrink-0 mt-0.5">•</span>
                {req}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Riesgos */}
      {analisis.riesgos.items?.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-5">
          <h3 className="text-white text-sm font-semibold mb-3">
            Riesgos de descalificación
          </h3>
          <ul className="space-y-1.5">
            {analisis.riesgos.items.slice(0, 4).map((r, i) => (
              <li key={i} className="flex gap-2 text-xs text-red-400">
                <span className="shrink-0 mt-0.5">⚠</span>
                {r}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* CTA */}
      <Link
        href={`/expediente/${analisis.id}`}
        className="block w-full text-center bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
      >
        Ver expediente generado →
      </Link>
    </div>
  )
}
