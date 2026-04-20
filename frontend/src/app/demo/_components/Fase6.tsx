"use client"
import { useState } from "react"
import { DEMO_LICITACION, DEMO_COMPETIDORES, DEMO_ANEXO_REQUISITOS, DISCLAIMER_COMPLETO, fmt } from "../_data"

const ZIP_ARCHIVOS = [
  { nombre: "portada.txt", nota: "Empresa · RFC · Versión · Aviso legal" },
  { nombre: "01_checklist_cumplimiento.txt", nota: "4/5 documentos cubiertos" },
  { nombre: "02_propuesta_tecnica.txt", nota: "Borrador IA revisado" },
  { nombre: "03_anexo_tecnico_revision.txt", nota: "3/5 requisitos confirmados · 1 acción urgente" },
  { nombre: "04_propuesta_economica.txt", nota: `PTW Óptimo ${fmt(DEMO_LICITACION.ptw_optimo)}` },
  { nombre: "05_pendientes.txt", nota: "1 acción urgente · 2 pendientes de confirmar" },
]

const PTW = [
  { label: "Agresivo", sub: "Mayor probabilidad", monto: DEMO_LICITACION.ptw_agresivo, margen: 8, recomendado: false, color: "border-blue-800 bg-blue-950/20", badge: "bg-blue-900/40 text-blue-300" },
  { label: "Óptimo", sub: "Balance riesgo-margen", monto: DEMO_LICITACION.ptw_optimo, margen: 12, recomendado: true, color: "border-emerald-600 bg-emerald-950/20", badge: "bg-emerald-900/40 text-emerald-300" },
  { label: "Conservador", sub: "Margen seguro", monto: DEMO_LICITACION.ptw_conservador, margen: 15, recomendado: false, color: "border-gray-700 bg-gray-900/30", badge: "bg-gray-800 text-gray-400" },
]

const RIESGO_COLORS: Record<string, string> = {
  alto: "bg-red-900/40 text-red-400 border-red-800",
  medio: "bg-yellow-900/40 text-yellow-400 border-yellow-800",
  bajo: "bg-green-900/40 text-green-400 border-green-800",
}

type Cumple = true | false | null

export function Fase6() {
  const [respuestas, setRespuestas] = useState<Record<string, { cumple: Cumple; nota: string }>>(() => {
    const m: Record<string, { cumple: Cumple; nota: string }> = {}
    DEMO_ANEXO_REQUISITOS.forEach((r) => {
      m[r.numero] = { cumple: r.cumple, nota: r.nota }
    })
    return m
  })
  const [guardado, setGuardado] = useState(false)
  const [guardando, setGuardando] = useState(false)

  function toggle(numero: string, val: Cumple) {
    setGuardado(false)
    setRespuestas((prev) => ({ ...prev, [numero]: { ...prev[numero], cumple: val } }))
  }

  function setNota(numero: string, nota: string) {
    setGuardado(false)
    setRespuestas((prev) => ({ ...prev, [numero]: { ...prev[numero], nota } }))
  }

  function handleGuardar() {
    setGuardando(true)
    setTimeout(() => { setGuardando(false); setGuardado(true) }, 900)
  }

  const cumpleCount = Object.values(respuestas).filter((r) => r.cumple === true).length
  const noCumpleCount = Object.values(respuestas).filter((r) => r.cumple === false).length
  const pendienteCount = Object.values(respuestas).filter((r) => r.cumple === null).length

  return (
    <div className="space-y-8">

      {/* ── SECCIÓN 1: Copiloto Anexo Técnico ─────────────────────── */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <h2 className="text-lg font-bold text-white">Copiloto de Expediente · Anexo Técnico</h2>
          <span className="text-xs bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded px-2 py-0.5">
            {DEMO_ANEXO_REQUISITOS.length} requisitos extraídos del PDF
          </span>
        </div>
        <p className="text-gray-500 text-sm mb-4">
          Cada punto numerado de las bases, tal como aparece en el documento. Confirma tu cumplimiento uno por uno.
        </p>

        {/* Resumen */}
        <div className="flex gap-4 bg-gray-900 border border-gray-800 rounded-xl p-4 text-sm mb-4">
          <span className="text-green-400 font-semibold">✓ {cumpleCount} cumple</span>
          <span className="text-red-400 font-semibold">✗ {noCumpleCount} no cumple</span>
          <span className="text-gray-500">? {pendienteCount} pendiente</span>
        </div>

        <div className="space-y-3">
          {DEMO_ANEXO_REQUISITOS.map((req) => {
            const resp = respuestas[req.numero]
            return (
              <div key={req.numero} className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <span className="text-gray-500 text-xs font-mono shrink-0 mt-0.5 w-8">{req.numero}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-200 text-sm leading-relaxed">{req.texto}</p>
                    <p className="text-gray-600 text-xs mt-1">Evidencia: {req.evidencia}</p>
                  </div>
                  <span className={`shrink-0 text-xs px-2 py-0.5 rounded border font-medium ${RIESGO_COLORS[req.riesgo]}`}>
                    {req.riesgo}
                  </span>
                </div>

                <div className="flex gap-2">
                  {([true, false, null] as Cumple[]).map((val) => {
                    const label = val === true ? "✓ Cumple" : val === false ? "✗ No cumple" : "? Pendiente"
                    const activeClass =
                      val === true ? "bg-green-900/60 border-green-700 text-green-300" :
                      val === false ? "bg-red-900/60 border-red-700 text-red-300" :
                      "bg-gray-700 border-gray-600 text-gray-300"
                    const inactiveClass = "bg-gray-800 border-gray-700 text-gray-500 hover:text-gray-300"
                    return (
                      <button
                        key={String(val)}
                        onClick={() => toggle(req.numero, val)}
                        className={`flex-1 py-1.5 text-xs rounded-md border transition-colors ${resp.cumple === val ? activeClass : inactiveClass}`}
                      >
                        {label}
                      </button>
                    )
                  })}
                </div>

                <input
                  value={resp.nota}
                  onChange={(e) => setNota(req.numero, e.target.value)}
                  placeholder="Nota de evidencia (opcional)"
                  className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-xs text-gray-200 placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            )
          })}
        </div>

        <button
          onClick={handleGuardar}
          disabled={guardando}
          className={`mt-4 w-full py-3 text-sm font-bold rounded-xl transition-all ${
            guardado
              ? "bg-green-800/40 border border-green-700/50 text-green-400"
              : "bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 text-white"
          }`}
        >
          {guardando ? "Guardando..." : guardado ? "✓ Revisión guardada en el expediente" : "Guardar revisión"}
        </button>
      </div>

      {/* ── SECCIÓN 2: War Room ────────────────────────────────────── */}
      <div>
        <h2 className="text-lg font-bold text-white mb-1">War Room · Inteligencia Competitiva</h2>
        <p className="text-gray-500 text-sm mb-4">
          Basado en <strong className="text-gray-400">29 adjudicaciones reales</strong> del IMSS en servicios de seguridad (CompraNet 2020–2025)
        </p>
        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-gray-500 text-xs uppercase tracking-wide">
                <th className="text-left px-5 py-3">Competidor</th>
                <th className="text-center px-4 py-3 hidden sm:table-cell">Contratos</th>
                <th className="text-center px-4 py-3 hidden md:table-cell">Monto prom.</th>
                <th className="text-center px-4 py-3">Historial</th>
              </tr>
            </thead>
            <tbody>
              {DEMO_COMPETIDORES.map((c, i) => (
                <tr key={i} className="border-b border-gray-800/50 last:border-0">
                  <td className="px-5 py-4">
                    <div className="text-white font-semibold text-sm">{c.nombre}</div>
                    <div className="text-gray-600 text-xs mt-0.5">{c.debilidad}</div>
                  </td>
                  <td className="text-center px-4 py-4 hidden sm:table-cell">
                    <span className={`font-bold ${i === 0 ? "text-red-400" : i === 1 ? "text-orange-400" : "text-yellow-400"}`}>
                      {c.contratos}
                    </span>
                  </td>
                  <td className="text-center px-4 py-4 text-gray-400 hidden md:table-cell">{c.monto}</td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2 justify-center">
                      <div className="w-16 bg-gray-800 rounded-full h-1.5">
                        <div
                          className={`h-1.5 rounded-full ${i === 0 ? "bg-red-400" : i === 1 ? "bg-orange-400" : "bg-yellow-400"}`}
                          style={{ width: `${c.bar}%` }}
                        />
                      </div>
                      <span className={`text-xs font-bold ${i === 0 ? "text-red-400" : i === 1 ? "bg-orange-400" : "text-yellow-400"}`}>
                        {c.bar}%
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── SECCIÓN 3: Price to Win ────────────────────────────────── */}
      <div>
        <h2 className="text-lg font-bold text-white mb-1">Price to Win · 3 Escenarios</h2>
        <p className="text-gray-500 text-sm mb-4">Calculado sobre comportamiento histórico de precios en el IMSS</p>
        <div className="grid sm:grid-cols-3 gap-4">
          {PTW.map((e) => (
            <div key={e.label} className={`relative border-2 rounded-2xl p-5 ${e.color}`}>
              {e.recomendado && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-600 text-white text-xs font-black px-3 py-0.5 rounded-full whitespace-nowrap">
                  ★ Recomendado
                </div>
              )}
              <div className="text-gray-400 text-xs mb-0.5">{e.sub}</div>
              <div className={`text-lg font-black mb-2 ${e.recomendado ? "text-white" : "text-gray-300"}`}>{e.label}</div>
              <div className={`text-2xl font-black mb-1 ${e.recomendado ? "text-emerald-400" : "text-gray-300"}`}>
                {fmt(e.monto)}
              </div>
              <span className={`text-xs font-semibold rounded-full px-2.5 py-0.5 ${e.badge}`}>
                Margen {e.margen}%
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── SECCIÓN 4: ZIP final ───────────────────────────────────── */}
      <div className="bg-green-950/20 border border-green-700/40 rounded-2xl overflow-hidden">
        <div className="p-5 border-b border-green-900/30">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-green-700/30 border border-green-600/40 rounded-xl flex items-center justify-center text-2xl">
              📦
            </div>
            <div>
              <div className="text-white font-black text-base">Expediente listo para entrega</div>
              <div className="text-green-400 text-sm">{DEMO_LICITACION.numero} · Nivel ORO · v1</div>
            </div>
          </div>
        </div>

        <div className="p-5 space-y-2">
          {ZIP_ARCHIVOS.map((a) => (
            <div key={a.nombre} className="flex items-center justify-between bg-green-950/30 rounded-lg px-3 py-2">
              <span className="text-green-300 text-xs font-mono">📄 {a.nombre}</span>
              <span className="text-green-600 text-xs ml-3">✓ {a.nota}</span>
            </div>
          ))}
        </div>

        <div className="px-5 pb-5">
          <p className="text-xs text-gray-600 leading-relaxed mb-3">{DISCLAIMER_COMPLETO}</p>
          <button className="w-full bg-gradient-to-r from-green-700 to-green-600 hover:from-green-600 hover:to-green-500 text-white font-black py-4 rounded-xl text-base transition-all shadow-lg shadow-green-700/30">
            ⬇ Descargar expediente_IMSS0GYR.zip
          </button>
        </div>
      </div>

      {/* Mensaje final */}
      <div className="text-center py-6 border border-gray-800 rounded-2xl bg-gray-900/30">
        <div className="text-4xl mb-3">🏆</div>
        <div className="text-white text-xl font-black mb-2">Tu propuesta está lista para CompraNet</div>
        <div className="text-gray-500 text-sm">
          De 0 a expediente revisado punto por punto en menos de 10 minutos.<br />
          Tu equipo habría tardado 3 semanas.
        </div>
      </div>

    </div>
  )
}
