"use client"
import Link from "next/link"
import { useState } from "react"
import type { Analisis, MatrizItem } from "@/types"
import { Semaforo } from "./Semaforo"
import { PriceToWin } from "./PriceToWin"

const COMPLEJIDAD_CONFIG = {
  bronce: { label: "Bronce", color: "text-amber-600 border-amber-600 bg-amber-950" },
  plata: { label: "Plata", color: "text-gray-300 border-gray-500 bg-gray-800" },
  oro: { label: "Oro", color: "text-yellow-400 border-yellow-500 bg-yellow-950" },
}

const RIESGO_COLOR = {
  alto: "text-red-400",
  medio: "text-yellow-400",
  bajo: "text-green-400",
}

function MatrizSection({
  titulo,
  items,
}: {
  titulo: string
  items: MatrizItem[]
}) {
  const [open, setOpen] = useState(false)
  if (!items.length) return null
  return (
    <div className="border-b border-gray-800 last:border-0">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex justify-between items-center py-2.5 text-left"
      >
        <span className="text-gray-300 text-sm font-medium">{titulo}</span>
        <span className="text-gray-500 text-xs">{open ? "▲" : "▼"} {items.length} requisitos</span>
      </button>
      {open && (
        <ul className="pb-3 space-y-2">
          {items.map((item, i) => (
            <li key={i} className="flex gap-2 items-start text-xs">
              <span className={`shrink-0 font-medium mt-0.5 ${RIESGO_COLOR[item.nivel_riesgo]}`}>
                {item.nivel_riesgo.toUpperCase()}
              </span>
              <span className="text-gray-400">{item.requisito}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export function PanelDecision({ analisis }: { analisis: Analisis }) {
  const complejidad = analisis.nivel_complejidad
    ? COMPLEJIDAD_CONFIG[analisis.nivel_complejidad]
    : null

  const tieneMatrices =
    analisis.matriz_humana?.items.length ||
    analisis.matriz_materiales?.items.length ||
    analisis.matriz_financiera?.items.length

  return (
    <div className="space-y-4">
      {/* Badge complejidad + Semaforo */}
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-5">
        {complejidad && (
          <div className="flex justify-end mb-3">
            <span className={`text-xs font-semibold border rounded-full px-3 py-1 ${complejidad.color}`}>
              Nivel {complejidad.label}
            </span>
          </div>
        )}
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

      {/* Banner ROI */}
      {analisis.roi_datos && (
        <div className="bg-emerald-950 border border-emerald-800 rounded-lg p-4">
          <p className="text-emerald-400 text-xs font-semibold mb-1">Eficiencia operativa</p>
          <p className="text-emerald-300 text-sm">
            Análisis completado en{" "}
            <span className="font-bold">{analisis.roi_datos.tiempo_licit_ia}</span>.
            Su equipo habría tardado{" "}
            <span className="font-bold">{analisis.roi_datos.horas_equipo} horas</span> y costado{" "}
            <span className="font-bold">
              ${analisis.roi_datos.costo_total_mxn.toLocaleString("es-MX")} MXN
            </span>{" "}
            en honorarios profesionales.
          </p>
        </div>
      )}

      {/* Matrices de Anatomía */}
      {tieneMatrices ? (
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-5">
          <h3 className="text-white text-sm font-semibold mb-3">Anatomía de la convocatoria</h3>
          <MatrizSection
            titulo="Matriz Humana — Personal y certificaciones"
            items={analisis.matriz_humana?.items ?? []}
          />
          <MatrizSection
            titulo="Matriz de Materiales — Equipo e insumos"
            items={analisis.matriz_materiales?.items ?? []}
          />
          <MatrizSection
            titulo="Matriz Financiera — Capital y documentos"
            items={analisis.matriz_financiera?.items ?? []}
          />
        </div>
      ) : null}

      {/* Price to Win */}
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-5">
        <h3 className="text-white text-sm font-semibold mb-3">Price to Win</h3>
        <PriceToWin
          conservador={analisis.price_to_win_conservador}
          optimo={analisis.ptw_optimo}
          agresivo={analisis.ptw_agresivo}
        />
      </div>

      {/* Competidores históricos */}
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
                <span className="text-gray-300 truncate flex-1 mr-2">{c.empresa}</span>
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
          <h3 className="text-white text-sm font-semibold mb-3">Requisitos críticos</h3>
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
          <h3 className="text-white text-sm font-semibold mb-3">Riesgos de descalificación</h3>
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
