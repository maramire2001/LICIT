"use client"
import { useState } from "react"
import { api } from "@/lib/api"
import type { Expediente, Analisis, AnexoRespuesta } from "@/types"

function fmt(n: number | null): string {
  if (n == null) return "—"
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(n)
}

const RIESGO_COLORS: Record<string, string> = {
  alto: "bg-red-900/40 text-red-400 border-red-800",
  medio: "bg-yellow-900/40 text-yellow-400 border-yellow-800",
  bajo: "bg-green-900/40 text-green-400 border-green-800",
}

export function ExpedienteEditor({
  expediente: initial,
  analisis,
}: {
  expediente: Expediente
  analisis: Analisis | null
}) {
  const [exp, setExp] = useState(initial)
  const [tab, setTab] = useState<"anexo" | "admin" | "tecnica" | "economica">("anexo")
  const [instruccion, setInstruccion] = useState("")
  const [saving, setSaving] = useState(false)
  const [refining, setRefining] = useState(false)
  const [savingAnexo, setSavingAnexo] = useState(false)

  const requisitos = analisis?.anexo_tecnico_requisitos?.items ?? []

  function initRespuestas(): Record<string, AnexoRespuesta> {
    const map: Record<string, AnexoRespuesta> = {}
    requisitos.forEach((r) => {
      map[r.numero] = { numero: r.numero, cumple: null, nota: "" }
    })
    ;(exp.anexo_respuestas?.items ?? []).forEach((r) => {
      map[r.numero] = r
    })
    return map
  }

  const [respuestas, setRespuestas] = useState<Record<string, AnexoRespuesta>>(initRespuestas)

  function setRespuesta(numero: string, patch: Partial<AnexoRespuesta>) {
    setRespuestas((prev) => ({ ...prev, [numero]: { ...prev[numero], ...patch } }))
  }

  async function handleSave() {
    setSaving(true)
    try {
      const updated = await api.expediente.updatePropuesta(exp.id, exp.propuesta_tecnica_draft ?? "")
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

  async function handleSaveAnexo() {
    setSavingAnexo(true)
    try {
      const items = Object.values(respuestas)
      const updated = await api.expediente.updateAnexo(exp.id, items)
      setExp(updated)
    } finally {
      setSavingAnexo(false)
    }
  }

  const cumpleCount = Object.values(respuestas).filter((r) => r.cumple === true).length
  const noCumpleCount = Object.values(respuestas).filter((r) => r.cumple === false).length
  const pendienteCount = Object.values(respuestas).filter((r) => r.cumple === null).length

  const tabs = [
    { key: "anexo" as const, label: requisitos.length ? `Anexo Técnico (${requisitos.length})` : "Anexo Técnico" },
    { key: "admin" as const, label: "Carpeta Admin" },
    { key: "tecnica" as const, label: "Propuesta Técnica" },
    { key: "economica" as const, label: "Propuesta Económica" },
  ]

  return (
    <div>
      <div className="flex border-b border-gray-800 mb-4 overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              tab === t.key
                ? "border-blue-500 text-white"
                : "border-transparent text-gray-500 hover:text-gray-300"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "anexo" && (
        <div className="space-y-3">
          {requisitos.length === 0 ? (
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 text-center">
              <p className="text-gray-500 text-sm">No se extrajeron requisitos del Anexo Técnico para este análisis.</p>
            </div>
          ) : (
            <>
              <div className="flex gap-4 bg-gray-900 border border-gray-800 rounded-lg p-4 text-xs">
                <span className="text-green-400">✓ {cumpleCount} cumple</span>
                <span className="text-red-400">✗ {noCumpleCount} no cumple</span>
                <span className="text-gray-500">? {pendienteCount} pendiente</span>
              </div>
              <div className="space-y-3">
                {requisitos.map((req) => {
                  const resp = respuestas[req.numero] ?? { numero: req.numero, cumple: null, nota: "" }
                  return (
                    <div key={req.numero} className="bg-gray-900 border border-gray-800 rounded-lg p-4 space-y-3">
                      <div className="flex items-start gap-3">
                        <span className="text-gray-500 text-xs font-mono shrink-0 mt-0.5">{req.numero}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-gray-200 text-sm leading-relaxed">{req.texto}</p>
                          {req.evidencia_requerida && (
                            <p className="text-gray-500 text-xs mt-1">Evidencia: {req.evidencia_requerida}</p>
                          )}
                        </div>
                        <span className={`shrink-0 text-xs px-2 py-0.5 rounded border font-medium ${RIESGO_COLORS[req.riesgo] ?? ""}`}>
                          {req.riesgo}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setRespuesta(req.numero, { cumple: true })}
                          className={`flex-1 py-1.5 text-xs rounded-md border transition-colors ${
                            resp.cumple === true
                              ? "bg-green-900/60 border-green-700 text-green-300"
                              : "bg-gray-800 border-gray-700 text-gray-500 hover:text-green-400 hover:border-green-800"
                          }`}
                        >
                          ✓ Cumple
                        </button>
                        <button
                          onClick={() => setRespuesta(req.numero, { cumple: false })}
                          className={`flex-1 py-1.5 text-xs rounded-md border transition-colors ${
                            resp.cumple === false
                              ? "bg-red-900/60 border-red-700 text-red-300"
                              : "bg-gray-800 border-gray-700 text-gray-500 hover:text-red-400 hover:border-red-800"
                          }`}
                        >
                          ✗ No cumple
                        </button>
                        <button
                          onClick={() => setRespuesta(req.numero, { cumple: null })}
                          className={`flex-1 py-1.5 text-xs rounded-md border transition-colors ${
                            resp.cumple === null
                              ? "bg-gray-700 border-gray-600 text-gray-300"
                              : "bg-gray-800 border-gray-700 text-gray-500 hover:text-gray-300"
                          }`}
                        >
                          ? Pendiente
                        </button>
                      </div>
                      <input
                        value={resp.nota}
                        onChange={(e) => setRespuesta(req.numero, { nota: e.target.value })}
                        placeholder="Nota de evidencia (opcional)"
                        className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-xs text-gray-200 placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  )
                })}
              </div>
              <button
                onClick={handleSaveAnexo}
                disabled={savingAnexo}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 text-white text-sm font-semibold rounded-md transition-colors"
              >
                {savingAnexo ? "Guardando..." : "Guardar revisión"}
              </button>
            </>
          )}
        </div>
      )}

      {tab === "admin" && (
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-5">
          <p className="text-gray-400 text-sm mb-4">Documentos requeridos en carpeta administrativa:</p>
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

      {tab === "tecnica" && (
        <div className="space-y-3">
          <textarea
            value={exp.propuesta_tecnica_draft ?? ""}
            onChange={(e) => setExp({ ...exp, propuesta_tecnica_draft: e.target.value })}
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
            <span className="text-gray-600 text-xs self-center">v{exp.version}</span>
          </div>
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

      {tab === "economica" && (
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-5 space-y-4">
          <div>
            <p className="text-gray-500 text-xs mb-1">Monto propuesto (óptimo)</p>
            <p className="text-white text-3xl font-bold">{fmt(exp.propuesta_economica.monto_propuesto)}</p>
          </div>
          <p className="text-gray-600 text-xs">Basado en análisis de adjudicaciones históricas para esta dependencia</p>
        </div>
      )}
    </div>
  )
}
