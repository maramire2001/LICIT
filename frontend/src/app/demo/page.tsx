"use client"
import { useState, useEffect, useRef } from "react"

// ─── Data ────────────────────────────────────────────────────────────────────

const LICITACION = {
  numero: "IMSS-00-GYR-LAOS-001/2024",
  titulo:
    "Servicio de Seguridad Intramuros para 18 Unidades Médicas de Alta Especialidad (UMAE) – Región Centro-Sur",
  dependencia: "Instituto Mexicano del Seguro Social (IMSS)",
  monto: 124_500_000,
  volumen: "450 elementos · 3 turnos · Radio comunicación y patrullaje",
  apertura: "03 de junio de 2024",
  fallo: "28 de junio de 2024",
  estado: "activa",
}

const PUNTOS_CRITICOS = [
  {
    id: 1,
    titulo: "Registro REPSE vigente",
    descripcion:
      "La empresa debe contar con el Registro de Prestadoras de Servicios Especializados (REPSE) activo ante la STPS. Las bases exigen presentar constancia con vigencia mínima de 12 meses.",
    riesgo: "alto",
    icon: "🔴",
  },
  {
    id: 2,
    titulo: "Certificación ISO 9001:2015",
    descripcion:
      "Se requiere certificación ISO 9001:2015 específicamente para procesos de reclutamiento, selección y capacitación de personal de seguridad. Emitida por organismo acreditado ante EMA.",
    riesgo: "alto",
    icon: "🔴",
  },
  {
    id: 3,
    titulo: "Opinión positiva INFONAVIT",
    descripcion:
      "Opinión de cumplimiento de obligaciones fiscales ante el INFONAVIT en sentido positivo, vigente al momento de la presentación de propuestas. Aplica también a subcontratistas.",
    riesgo: "medio",
    icon: "🟡",
  },
]

const COMPETIDORES = [
  {
    nombre: "GSI – Grupo Seguridad Integral",
    contratos: 14,
    monto_promedio: "$118.4M",
    margen_tipico: "14–18%",
    fortaleza: "Dominante en IMSS, relaciones institucionales sólidas",
    debilidad: "Precio alto, rotación de personal elevada",
    prob: 85,
    color: "text-red-400",
    bar: "bg-red-400",
  },
  {
    nombre: "Securitas México",
    contratos: 9,
    monto_promedio: "$115.2M",
    margen_tipico: "12–16%",
    fortaleza: "Tecnología (CCTV, biométricos), marca internacional",
    debilidad: "Respuesta operativa lenta en zonas rurales",
    prob: 70,
    color: "text-orange-400",
    bar: "bg-orange-400",
  },
  {
    nombre: "Pryse México",
    contratos: 6,
    monto_promedio: "$109.8M",
    margen_tipico: "8–11%",
    fortaleza: "Precio agresivo, alta capacidad de volumen",
    debilidad: "Historial de incumplimientos en CDMX 2022",
    prob: 60,
    color: "text-yellow-400",
    bar: "bg-yellow-400",
  },
]

const ESCENARIOS = [
  {
    label: "Agresivo",
    sublabel: "Escenario Ganador",
    monto: 112_800_000,
    margen: 8,
    color: "border-blue-500 bg-blue-500/10",
    badge: "bg-blue-500/20 text-blue-300",
    prob: "Mayor probabilidad de ganar",
    recomendado: false,
  },
  {
    label: "Óptimo",
    sublabel: "Recomendado",
    monto: 118_200_000,
    margen: 12,
    color: "border-emerald-500 bg-emerald-500/10",
    badge: "bg-emerald-500/20 text-emerald-300",
    prob: "Balance ideal riesgo-margen",
    recomendado: true,
  },
  {
    label: "Conservador",
    sublabel: "Margen seguro",
    monto: 123_000_000,
    margen: 15,
    color: "border-gray-600 bg-gray-800/50",
    badge: "bg-gray-700 text-gray-300",
    prob: "Menor riesgo, menor probabilidad",
    recomendado: false,
  },
]

const ANEXOS = [
  { grupo: "Documentación Legal y Corporativa", count: 18 },
  { grupo: "Propuesta Técnica – Metodología de Servicio", count: 12 },
  { grupo: "Currículum de la Empresa y Casos de Éxito", count: 8 },
  { grupo: "Plantilla Organizacional y Perfiles de Personal", count: 11 },
  { grupo: "Programa de Capacitación y Certificaciones", count: 9 },
  { grupo: "Plan de Contingencias y Protocolo de Emergencias", count: 7 },
  { grupo: "Propuesta Económica y Desglose de Costos", count: 6 },
  { grupo: "Convenios y Cartas Compromiso", count: 5 },
  { grupo: "Documentación Complementaria IMSS", count: 9 },
]

const PASOS_ANALISIS = [
  { id: 1, label: "Leyendo bases de licitación (PDF, 248 páginas)…", dur: 1800 },
  { id: 2, label: "Extrayendo requisitos técnicos y legales…", dur: 1400 },
  { id: 3, label: "Detectando puntos críticos de descalificación…", dur: 1600 },
  { id: 4, label: "Consultando historial de adjudicaciones IMSS…", dur: 1200 },
  { id: 5, label: "Calculando escenarios Price to Win…", dur: 1400 },
  { id: 6, label: "Generando reporte de inteligencia competitiva…", dur: 1000 },
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(n)
}

function useCountUp(target: number, active: boolean, duration = 1200) {
  const [value, setValue] = useState(0)
  useEffect(() => {
    if (!active) return
    const start = Date.now()
    const tick = () => {
      const elapsed = Date.now() - start
      const progress = Math.min(elapsed / duration, 1)
      const ease = 1 - Math.pow(1 - progress, 3)
      setValue(Math.round(target * ease))
      if (progress < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }, [active, target, duration])
  return value
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ScoreRing({ score, active }: { score: number; active: boolean }) {
  const displayed = useCountUp(score, active, 1400)
  const r = 52
  const circ = 2 * Math.PI * r
  const progress = active ? (displayed / 100) * circ : 0

  return (
    <div className="relative inline-flex items-center justify-center w-36 h-36">
      <svg className="absolute inset-0 -rotate-90" width="144" height="144">
        <circle cx="72" cy="72" r={r} strokeWidth="8" fill="none" className="stroke-gray-800" />
        <circle
          cx="72" cy="72" r={r} strokeWidth="8" fill="none"
          className="stroke-emerald-400 transition-all duration-100"
          strokeDasharray={circ}
          strokeDashoffset={circ - progress}
          strokeLinecap="round"
        />
      </svg>
      <div className="text-center z-10">
        <div className="text-4xl font-black text-white">{displayed}</div>
        <div className="text-xs text-gray-400 -mt-0.5">/ 100</div>
      </div>
    </div>
  )
}

function AnalisisModal({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(0)
  const [done, setDone] = useState(false)
  const ref = useRef(0)

  useEffect(() => {
    let t = 0
    PASOS_ANALISIS.forEach((p, i) => {
      t += i === 0 ? 300 : PASOS_ANALISIS[i - 1].dur
      const id = setTimeout(() => {
        setStep(i + 1)
        ref.current = i + 1
      }, t)
      return id
    })
    const total = PASOS_ANALISIS.reduce((a, p) => a + p.dur, 300)
    const finish = setTimeout(() => {
      setDone(true)
      setTimeout(onComplete, 700)
    }, total)
    return () => clearTimeout(finish)
  }, [onComplete])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl p-8 w-full max-w-md mx-4 shadow-2xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
            <span className="text-sm">⚡</span>
          </div>
          <div>
            <div className="text-white font-semibold text-sm">LICIT-IA · Análisis en curso</div>
            <div className="text-gray-500 text-xs">Motor de inteligencia competitiva</div>
          </div>
        </div>

        <div className="space-y-3 mb-6">
          {PASOS_ANALISIS.map((p, i) => {
            const isActive = step === i + 1
            const isDone = step > i + 1 || done
            return (
              <div key={p.id} className={`flex items-start gap-3 transition-all duration-300 ${step < i + 1 ? "opacity-30" : "opacity-100"}`}>
                <div className={`mt-0.5 w-4 h-4 rounded-full flex-shrink-0 flex items-center justify-center text-xs transition-all duration-300 ${isDone ? "bg-emerald-500" : isActive ? "bg-blue-500 animate-pulse" : "bg-gray-700"}`}>
                  {isDone ? "✓" : ""}
                </div>
                <span className={`text-sm leading-relaxed ${isDone ? "text-gray-400" : isActive ? "text-white" : "text-gray-600"}`}>
                  {p.label}
                </span>
              </div>
            )
          })}
        </div>

        <div className="w-full bg-gray-800 rounded-full h-1.5">
          <div
            className="bg-blue-500 h-1.5 rounded-full transition-all duration-500"
            style={{ width: `${done ? 100 : (step / PASOS_ANALISIS.length) * 100}%` }}
          />
        </div>
        <div className="flex justify-between mt-1.5">
          <span className="text-xs text-gray-600">Procesando bases…</span>
          <span className="text-xs text-gray-500">{done ? 100 : Math.round((step / PASOS_ANALISIS.length) * 100)}%</span>
        </div>
      </div>
    </div>
  )
}

function ExpedienteModal({ onClose }: { onClose: () => void }) {
  const total = ANEXOS.reduce((a, g) => a + g.count, 0)
  const [shown, setShown] = useState(false)
  useEffect(() => { setTimeout(() => setShown(true), 50) }, [])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className={`bg-gray-900 border border-emerald-500/50 rounded-2xl w-full max-w-lg shadow-2xl transition-all duration-500 ${shown ? "opacity-100 scale-100" : "opacity-0 scale-95"}`}>
        <div className="p-6 border-b border-gray-800">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-xl">✅</div>
            <div>
              <div className="text-white font-bold">Expediente generado exitosamente</div>
              <div className="text-emerald-400 text-sm">{total} documentos listos para entrega</div>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-2 max-h-80 overflow-y-auto">
          {ANEXOS.map((a, i) => (
            <div key={i} className="flex items-center justify-between py-2 border-b border-gray-800 last:border-0">
              <span className="text-gray-300 text-sm">{a.grupo}</span>
              <span className="text-xs bg-gray-800 text-gray-400 rounded px-2 py-0.5 ml-3 flex-shrink-0">
                {a.count} archivos
              </span>
            </div>
          ))}
        </div>

        <div className="p-6 border-t border-gray-800 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 rounded-lg text-sm transition-colors"
          >
            Descargar expediente completo (.zip)
          </button>
          <button
            onClick={onClose}
            className="px-4 bg-gray-800 hover:bg-gray-700 text-gray-400 rounded-lg text-sm transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type Phase = "idle" | "analyzing" | "results"

export default function DemoPage() {
  const [phase, setPhase] = useState<Phase>("idle")
  const [showExpediente, setShowExpediente] = useState(false)
  const [scoreActive, setScoreActive] = useState(false)
  const resultsRef = useRef<HTMLDivElement>(null)

  function startDemo() {
    setPhase("analyzing")
  }

  function onAnalysisDone() {
    setPhase("results")
    setTimeout(() => {
      resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
      setTimeout(() => setScoreActive(true), 400)
    }, 200)
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {phase === "analyzing" && <AnalisisModal onComplete={onAnalysisDone} />}
      {showExpediente && <ExpedienteModal onClose={() => setShowExpediente(false)} />}

      {/* ── Top bar ── */}
      <div className="border-b border-gray-800 bg-gray-950/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-black text-lg tracking-tight">LICIT<span className="text-blue-400">-IA</span></span>
            <span className="text-xs bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded px-2 py-0.5 ml-1">DEMO</span>
          </div>
          <span className="text-gray-500 text-xs hidden sm:block">Herramienta de inteligencia para licitaciones públicas</span>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-10">

        {/* ── Licitación Header ── */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full px-3 py-0.5 font-medium">● Activa</span>
            <span className="text-xs text-gray-500">Licitación Pública Nacional</span>
            <span className="text-xs text-gray-600">·</span>
            <span className="text-xs text-gray-500 font-mono">{LICITACION.numero}</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold text-white leading-snug mb-3 max-w-3xl">
            {LICITACION.titulo}
          </h1>

          <div className="flex flex-wrap gap-4 text-sm text-gray-400 mb-5">
            <span className="flex items-center gap-1.5">
              <span className="text-blue-400">🏛</span> {LICITACION.dependencia}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="text-emerald-400">👥</span> {LICITACION.volumen}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="text-yellow-400">📅</span> Apertura: {LICITACION.apertura}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="text-purple-400">⚖️</span> Fallo: {LICITACION.fallo}
            </span>
          </div>

          {/* Monto + CTA */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="bg-gray-900 border border-gray-800 rounded-xl px-5 py-3 inline-flex flex-col">
              <span className="text-xs text-gray-500 mb-0.5">Monto estimado</span>
              <span className="text-2xl font-black text-white">{fmt(LICITACION.monto)}</span>
            </div>
            {phase === "idle" && (
              <button
                onClick={startDemo}
                className="group inline-flex items-center gap-3 bg-blue-600 hover:bg-blue-500 text-white font-bold px-6 py-3.5 rounded-xl transition-all duration-200 shadow-lg shadow-blue-600/30 hover:shadow-blue-500/40 text-sm sm:text-base"
              >
                <span className="text-xl">⚡</span>
                <span>Me interesa — Analizar con IA</span>
                <span className="text-blue-300 group-hover:translate-x-1 transition-transform">→</span>
              </button>
            )}
            {phase === "results" && (
              <div className="flex items-center gap-2 text-emerald-400 text-sm font-medium">
                <span>✅</span> Análisis completado
              </div>
            )}
          </div>
        </div>

        {/* ── Results ── */}
        {phase === "results" && (
          <div ref={resultsRef} className="space-y-8">

            {/* ── Score de viabilidad ── */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
              <div className="flex flex-col sm:flex-row sm:items-center gap-6">
                <ScoreRing score={92} active={scoreActive} />
                <div className="flex-1">
                  <div className="text-xs text-emerald-400 font-semibold uppercase tracking-wider mb-1">Score de Viabilidad</div>
                  <div className="text-2xl font-black text-white mb-2">Oportunidad Altamente Viable</div>
                  <p className="text-gray-400 text-sm leading-relaxed max-w-lg">
                    La IA detecta que su empresa cumple con los requisitos críticos y tiene perfil competitivo para ganar. Se identificaron 3 puntos que deben atenderse antes de la presentación.
                  </p>
                  <div className="flex flex-wrap gap-2 mt-3">
                    {["REPSE requerido", "ISO 9001:2015", "INFONAVIT positivo"].map((t) => (
                      <span key={t} className="text-xs bg-yellow-500/10 text-yellow-300 border border-yellow-500/20 rounded-full px-3 py-0.5">{t}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* ── Puntos críticos ── */}
            <div>
              <h2 className="text-lg font-bold text-white mb-1">Puntos Críticos Detectados</h2>
              <p className="text-gray-500 text-sm mb-4">La IA identificó 3 requisitos que suelen descalificar al 68% de los licitantes.</p>
              <div className="grid sm:grid-cols-3 gap-4">
                {PUNTOS_CRITICOS.map((p) => (
                  <div key={p.id} className={`bg-gray-900 border rounded-xl p-4 ${p.riesgo === "alto" ? "border-red-500/30" : "border-yellow-500/30"}`}>
                    <div className="flex items-center gap-2 mb-2">
                      <span>{p.icon}</span>
                      <span className={`text-xs font-semibold ${p.riesgo === "alto" ? "text-red-400" : "text-yellow-400"}`}>
                        {p.riesgo === "alto" ? "Riesgo Alto" : "Riesgo Medio"}
                      </span>
                    </div>
                    <div className="text-white font-semibold text-sm mb-2">{p.titulo}</div>
                    <p className="text-gray-400 text-xs leading-relaxed">{p.descripcion}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* ── War Room ── */}
            <div>
              <h2 className="text-lg font-bold text-white mb-1">War Room · Inteligencia Competitiva</h2>
              <p className="text-gray-500 text-sm mb-4">Análisis basado en 29 adjudicaciones históricas del IMSS en servicios de seguridad (2019–2024).</p>
              <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-800 text-gray-500 text-xs uppercase tracking-wide">
                      <th className="text-left px-5 py-3">Competidor</th>
                      <th className="text-center px-4 py-3 hidden sm:table-cell">Contratos</th>
                      <th className="text-center px-4 py-3 hidden md:table-cell">Monto prom.</th>
                      <th className="text-left px-4 py-3 hidden lg:table-cell">Fortaleza</th>
                      <th className="text-center px-4 py-3">Prob. éxito</th>
                    </tr>
                  </thead>
                  <tbody>
                    {COMPETIDORES.map((c, i) => (
                      <tr key={i} className="border-b border-gray-800/50 last:border-0 hover:bg-gray-800/30 transition-colors">
                        <td className="px-5 py-4">
                          <div className="font-semibold text-white text-sm">{c.nombre}</div>
                          <div className="text-xs text-gray-500 mt-0.5">{c.debilidad}</div>
                        </td>
                        <td className="text-center px-4 py-4 text-gray-300 hidden sm:table-cell">{c.contratos}</td>
                        <td className="text-center px-4 py-4 text-gray-300 hidden md:table-cell">{c.monto_promedio}</td>
                        <td className="px-4 py-4 hidden lg:table-cell">
                          <span className="text-gray-400 text-xs">{c.fortaleza}</span>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex flex-col items-center gap-1.5">
                            <span className={`font-bold ${c.color}`}>{c.prob}%</span>
                            <div className="w-16 bg-gray-800 rounded-full h-1.5">
                              <div className={`${c.bar} h-1.5 rounded-full`} style={{ width: `${c.prob}%` }} />
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* ── PTW ── */}
            <div>
              <h2 className="text-lg font-bold text-white mb-1">Price to Win · Escenarios de Propuesta</h2>
              <p className="text-gray-500 text-sm mb-4">Calculado sobre el comportamiento histórico de precios y márgenes del sector.</p>
              <div className="grid sm:grid-cols-3 gap-4">
                {ESCENARIOS.map((e) => (
                  <div key={e.label} className={`relative border rounded-2xl p-5 transition-all ${e.color} ${e.recomendado ? "ring-2 ring-emerald-500/50" : ""}`}>
                    {e.recomendado && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                        <span className="bg-emerald-500 text-white text-xs font-bold px-3 py-0.5 rounded-full shadow">★ Recomendado</span>
                      </div>
                    )}
                    <div className="mb-3">
                      <div className="text-xs text-gray-400 mb-0.5">{e.sublabel}</div>
                      <div className="text-lg font-black text-white">{e.label}</div>
                    </div>
                    <div className="text-2xl font-black text-white mb-1">{fmt(e.monto)}</div>
                    <div className="flex items-center gap-2 mb-3">
                      <span className={`text-xs font-semibold rounded-full px-2.5 py-0.5 ${e.badge}`}>
                        Margen {e.margen}%
                      </span>
                    </div>
                    <p className="text-xs text-gray-400">{e.prob}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* ── CTA Final ── */}
            <div className="bg-gradient-to-br from-gray-900 to-gray-950 border border-gray-700 rounded-2xl p-8 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 text-3xl mb-4">📋</div>
              <h2 className="text-2xl font-black text-white mb-2">Expediente de Propuesta listo para generar</h2>
              <p className="text-gray-400 text-sm mb-6 max-w-md mx-auto">
                LICIT-IA prepara automáticamente los 85 anexos técnicos, legales y económicos requeridos por las bases de esta licitación.
              </p>
              <button
                onClick={() => setShowExpediente(true)}
                className="group inline-flex items-center gap-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-8 py-4 rounded-xl transition-all duration-200 shadow-lg shadow-emerald-600/30 hover:shadow-emerald-500/40 text-base"
              >
                <span>📦</span>
                <span>Generar Expediente de Propuesta</span>
                <span className="text-emerald-200 group-hover:translate-x-1 transition-transform">→</span>
              </button>
              <p className="text-gray-600 text-xs mt-4">85 documentos · Formato IMSS · Listo en segundos</p>
            </div>

          </div>
        )}
      </div>

      {/* ── Footer ── */}
      <div className="border-t border-gray-800 mt-16 py-6">
        <div className="max-w-5xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span className="text-gray-600 text-xs">© 2024 LICIT-IA · Inteligencia artificial para licitaciones públicas en México</span>
          <span className="text-gray-700 text-xs">Datos de demostración · No constituye asesoría jurídica</span>
        </div>
      </div>
    </div>
  )
}
