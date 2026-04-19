"use client"
import { useState } from "react"
import { Fase1 } from "./_components/Fase1"
import { Fase2 } from "./_components/Fase2"
import { Fase3 } from "./_components/Fase3"
import { Fase4 } from "./_components/Fase4"
import { Fase5 } from "./_components/Fase5"
import { Fase6 } from "./_components/Fase6"

export type Phase = 1 | 2 | 3 | 4 | 5 | 6

const PHASE_LABELS = ["ADN", "Radar", "Anatomía", "Acceso", "Vault", "Expediente"]

export default function DemoPage() {
  const [phase, setPhase] = useState<Phase>(1)

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Top bar */}
      <div className="border-b border-gray-800 bg-gray-950/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-black text-lg tracking-tight">
              LICIT<span className="text-blue-400">-IA</span>
            </span>
            <span className="text-xs bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded px-2 py-0.5 ml-1">
              DEMO
            </span>
          </div>
          {/* Progress pills */}
          <div className="hidden sm:flex items-center gap-1">
            {PHASE_LABELS.map((label, i) => {
              const n = (i + 1) as Phase
              return (
                <div
                  key={n}
                  className={`text-xs px-2.5 py-1 rounded-full transition-all ${
                    phase === n
                      ? "bg-blue-600 text-white font-semibold"
                      : phase > n
                      ? "bg-gray-800 text-gray-400"
                      : "text-gray-700"
                  }`}
                >
                  {label}
                </div>
              )
            })}
          </div>
          <span className="text-gray-600 text-xs hidden sm:block">Datos de demostración</span>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-10">
        {phase === 1 && <Fase1 onNext={() => setPhase(2)} />}
        {phase === 2 && <Fase2 onNext={() => setPhase(3)} />}
        {phase === 3 && <Fase3 onNext={() => setPhase(4)} />}
        {phase === 4 && <Fase4 onNext={() => setPhase(5)} />}
        {phase === 5 && <Fase5 onNext={() => setPhase(6)} />}
        {phase === 6 && <Fase6 />}
      </div>

      <div className="border-t border-gray-800 mt-16 py-6">
        <div className="max-w-5xl mx-auto px-6 text-center text-gray-700 text-xs">
          © 2025 LICIT-IA · Datos de demostración · No constituye asesoría jurídica
        </div>
      </div>
    </div>
  )
}
