"use client"
import { useState } from "react"
import { api } from "@/lib/api"
import type { Expediente } from "@/types"

function fmt(n: number | null): string {
  if (n == null) return "—"
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(n)
}

export function ExpedienteEditor({
  expediente: initial,
}: {
  expediente: Expediente
}) {
  const [exp, setExp] = useState(initial)
  const [tab, setTab] = useState<"admin" | "tecnica" | "economica">("tecnica")
  const [instruccion, setInstruccion] = useState("")
  const [saving, setSaving] = useState(false)
  const [refining, setRefining] = useState(false)

  async function handleSave() {
    setSaving(true)
    try {
      const updated = await api.expediente.updatePropuesta(
        exp.id,
        exp.propuesta_tecnica_draft ?? ""
      )
      setExp(updated)
    } finally {
      setSaving(false)
    }
  }

  async function handleRefine() {
    if (!instruccion.trim()) return
    setRefining(true)
    try {
      const result = await api.expediente.aiRefine(exp.id, instruccion)
      setExp({ ...exp, propuesta_tecnica_draft: result.propuesta_tecnica_draft })
      setInstruccion("")
    } finally {
      setRefining(false)
    }
  }

  const tabs = [
    { key: "admin", label: "Carpeta Admin" },
    { key: "tecnica", label: "Propuesta Técnica" },
    { key: "economica", label: "Propuesta Económica" },
  ] as const

  return (
    <div>
      {/* Tab bar */}
      <div className="flex border-b border-gray-800 mb-4">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === t.key
                ? "border-blue-500 text-white"
                : "border-transparent text-gray-500 hover:text-gray-300"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Admin tab */}
      {tab === "admin" && (
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-5">
          <p className="text-gray-400 text-sm mb-4">
            Documentos requeridos en carpeta administrativa:
          </p>
          <ul className="space-y-2">
            {exp.carpeta_admin.documentos?.map((doc, i) => (
              <li key={i} className="flex items-center gap-3 text-sm">
                <div className="w-4 h-4 rounded border border-gray-600 shrink-0" />
                <span className="text-gray-300">{doc}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Técnica tab */}
      {tab === "tecnica" && (
        <div className="space-y-3">
          <textarea
            value={exp.propuesta_tecnica_draft ?? ""}
            onChange={(e) =>
              setExp({ ...exp, propuesta_tecnica_draft: e.target.value })
            }
            className="w-full min-h-[400px] bg-gray-900 border border-gray-700 rounded-lg p-4 text-gray-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
          />
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 text-white text-sm rounded-md transition-colors"
            >
              {saving ? "Guardando..." : "Guardar cambios"}
            </button>
            <span className="text-gray-600 text-xs self-center">
              v{exp.version}
            </span>
          </div>
          {/* AI refine */}
          <div className="flex gap-2 pt-2 border-t border-gray-800">
            <input
              value={instruccion}
              onChange={(e) => setInstruccion(e.target.value)}
              placeholder="Instrucción para la IA (ej: hazlo más formal)"
              className="flex-1 bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              onKeyDown={(e) => e.key === "Enter" && handleRefine()}
            />
            <button
              onClick={handleRefine}
              disabled={refining || !instruccion.trim()}
              className="px-3 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white text-sm rounded-md transition-colors"
            >
              {refining ? "..." : "Refinar con IA"}
            </button>
          </div>
        </div>
      )}

      {/* Económica tab */}
      {tab === "economica" && (
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-5 space-y-4">
          <div>
            <p className="text-gray-500 text-xs mb-1">Monto propuesto (óptimo)</p>
            <p className="text-white text-3xl font-bold">
              {fmt(exp.propuesta_economica.monto_propuesto)}
            </p>
          </div>
          <p className="text-gray-600 text-xs">
            Basado en análisis de adjudicaciones históricas para esta dependencia
          </p>
        </div>
      )}
    </div>
  )
}
