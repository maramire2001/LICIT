"use client"
import { useState, useEffect } from "react"
import { DEMO_LICITACION, DEMO_LOADER_STEPS, DEMO_MATRICES, DEMO_RED_FLAGS } from "../_data"
import { ScoreRing } from "./ScoreRing"

type LoadPhase = "loading" | "done"

export function Fase3({ onNext }: { onNext: () => void }) {
  const [loadPhase, setLoadPhase] = useState<LoadPhase>("loading")
  const [activeStep, setActiveStep] = useState(0)
  const [revealCount, setRevealCount] = useState(0)
  const [scoreActive, setScoreActive] = useState(false)

  // Sequencing the loader steps
  useEffect(() => {
    let elapsed = 300
    DEMO_LOADER_STEPS.forEach((step, i) => {
      setTimeout(() => setActiveStep(i + 1), elapsed)
      elapsed += step.dur
    })
    setTimeout(() => {
      setLoadPhase("done")
      // Reveal blocks one by one
      let delay = 200
      for (let i = 1; i <= 5; i++) {
        setTimeout(() => {
          setRevealCount(i)
          if (i === 2) setTimeout(() => setScoreActive(true), 200)
        }, delay)
        delay += 500
      }
    }, elapsed)
  }, [])

  const progress = loadPhase === "done" ? 100 : Math.round((activeStep / DEMO_LOADER_STEPS.length) * 100)

  if (loadPhase === "loading") {
    return (
      <div className="max-w-md mx-auto">
        <div className="bg-gray-900 border border-gray-700 rounded-2xl p-8 shadow-2xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-lg">⚡</div>
            <div>
              <div className="text-white font-bold text-sm">LICIT-IA · Análisis en curso</div>
              <div className="text-gray-500 text-xs truncate max-w-xs">{DEMO_LICITACION.numero}</div>
            </div>
          </div>

          <div className="space-y-3 mb-6">
            {DEMO_LOADER_STEPS.map((step, i) => {
              const isDone = activeStep > i + 1
              const isActive = activeStep === i + 1
              return (
                <div
                  key={i}
                  className={`flex items-start gap-3 transition-all duration-300 ${activeStep < i + 1 ? "opacity-25" : "opacity-100"}`}
                >
                  <div className={`mt-0.5 w-4 h-4 rounded-full shrink-0 flex items-center justify-center text-xs transition-all ${
                    isDone ? "bg-emerald-500 text-white" : isActive ? "bg-blue-500 animate-pulse" : "bg-gray-700"
                  }`}>
                    {isDone ? "✓" : ""}
                  </div>
                  <span className={`text-sm leading-relaxed ${isDone ? "text-gray-500" : isActive ? "text-white" : "text-gray-600"}`}>
                    {step.label}
                  </span>
                </div>
              )
            })}
          </div>

          <div className="w-full bg-gray-800 rounded-full h-1.5">
            <div
              className="bg-blue-500 h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between mt-1.5">
            <span className="text-xs text-gray-600">Procesando bases…</span>
            <span className="text-xs text-gray-500">{progress}%</span>
          </div>
        </div>
      </div>
    )
  }

  // Results reveal
  return (
    <div className="space-y-5">
      {/* 1 — ROI Banner */}
      {revealCount >= 1 && (
        <div className="animate-in fade-in slide-in-from-bottom-2 bg-green-950/30 border border-green-700/50 rounded-xl p-4 flex items-center gap-4">
          <span className="text-3xl">⚡</span>
          <div>
            <div className="text-green-400 font-black text-sm">
              Análisis completado en {DEMO_LICITACION.roi_segundos} segundos
            </div>
            <div className="text-green-700 text-xs">
              Tu equipo habría tardado 72 horas ·{" "}
              <strong className="text-green-600">Ahorro operativo: ${DEMO_LICITACION.roi_ahorro.toLocaleString("es-MX")} MXN</strong>
            </div>
          </div>
        </div>
      )}

      {/* 2 — Score + Nivel */}
      {revealCount >= 2 && (
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 flex items-center gap-5">
            <ScoreRing score={DEMO_LICITACION.score} active={scoreActive} />
            <div>
              <div className="text-emerald-400 text-xs font-bold uppercase tracking-wider mb-1">Viabilidad</div>
              <div className="text-white text-xl font-black">Alta</div>
              <div className="text-gray-500 text-sm">3 puntos a atender</div>
            </div>
          </div>
          <div className="bg-yellow-950/20 border-2 border-yellow-600 rounded-xl p-5 text-center flex flex-col items-center justify-center">
            <div className="text-yellow-400 text-xs font-bold uppercase tracking-wider mb-2">Nivel de Complejidad</div>
            <div className="text-4xl mb-1">🏆</div>
            <div className="text-yellow-400 text-2xl font-black">ORO</div>
            <div className="text-yellow-800 text-xs">Federal · Alta complejidad</div>
          </div>
        </div>
      )}

      {/* 3 — Matrices */}
      {revealCount >= 3 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <div className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-4">Matrices de Requisitos</div>
          <div className="grid grid-cols-3 gap-3">
            {[
              { icon: "👥", label: "Humana", color: "text-blue-400", items: DEMO_MATRICES.humana },
              { icon: "📦", label: "Materiales", color: "text-purple-400", items: DEMO_MATRICES.materiales },
              { icon: "💰", label: "Financiera", color: "text-emerald-400", items: DEMO_MATRICES.financiera },
            ].map(m => (
              <div key={m.label} className="bg-gray-950 rounded-xl p-3 text-center">
                <div className="text-2xl mb-1">{m.icon}</div>
                <div className={`${m.color} text-xs font-bold mb-2`}>{m.label}</div>
                {m.items.map(item => (
                  <div key={item} className="text-gray-500 text-xs mb-1 leading-tight">{item}</div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4 — Red flags */}
      {revealCount >= 4 && (
        <div className="bg-red-950/20 border border-red-900/50 rounded-xl p-5">
          <div className="text-red-400 text-xs font-bold uppercase tracking-wider mb-3">
            ⚑ {DEMO_RED_FLAGS.length} Puntos Críticos Detectados
          </div>
          <div className="space-y-2">
            {DEMO_RED_FLAGS.map((f, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="shrink-0 text-sm">{f.nivel === "alto" ? "🔴" : "🟡"}</span>
                <span className={`text-xs leading-relaxed ${f.nivel === "alto" ? "text-red-300" : "text-yellow-300"}`}>
                  {f.texto}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5 — CTA */}
      {revealCount >= 5 && (
        <button
          onClick={onNext}
          className="w-full bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-500 hover:to-yellow-400 text-white font-black py-4 rounded-xl text-base transition-all shadow-lg shadow-yellow-600/30"
        >
          🏆 Esta licitación es Nivel ORO — Ver precio y concursar →
        </button>
      )}
    </div>
  )
}
