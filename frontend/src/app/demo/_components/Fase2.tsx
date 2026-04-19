"use client"
import { DEMO_RADAR, fmt } from "../_data"

export function Fase2({ onNext }: { onNext: () => void }) {
  const matches = DEMO_RADAR.filter(l => l.match)
  const noMatch = DEMO_RADAR.filter(l => !l.match)

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-xs bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded-full px-3 py-0.5 font-semibold">
            ● Radar activo
          </span>
          <span className="text-xs text-gray-500">Seguridad · Nacional · $100M+ · IMSS</span>
        </div>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-black text-white">
            {DEMO_RADAR.length} oportunidades encontradas para tu perfil
          </h1>
          <div className="bg-gray-900 border border-gray-800 rounded-xl px-4 py-2 text-center">
            <div className="text-green-400 text-xl font-black">{matches.length}</div>
            <div className="text-gray-600 text-xs">con ADN match</div>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 mb-4">
        {matches.map((lic, i) => (
          <div
            key={lic.numero}
            className="bg-green-950/20 border border-green-800/50 rounded-xl p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-2 h-2 rounded-full bg-green-400 shrink-0" />
                  <span className="text-green-400 text-xs font-bold">ADN match</span>
                  <span className="text-gray-600 text-xs font-mono">{lic.numero}</span>
                </div>
                <div className="text-white font-bold text-sm mb-2">{lic.titulo}</div>
                <div className="flex gap-4 text-xs text-gray-400">
                  <span>🏛️ {lic.dependencia}</span>
                  <span>💰 {fmt(lic.monto)}</span>
                  <span>📅 {lic.apertura}</span>
                </div>
              </div>
              {i === 0 && (
                <button
                  onClick={onNext}
                  className="shrink-0 bg-green-700 hover:bg-green-600 text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors"
                >
                  ⚡ Me interesa — Analizar
                </button>
              )}
            </div>
          </div>
        ))}

        {noMatch.map(lic => (
          <div
            key={lic.numero}
            className="bg-gray-950 border border-gray-800/50 rounded-xl p-4 opacity-50"
          >
            <div className="flex items-start gap-3">
              <div className="flex-1">
                <div className="text-gray-600 text-xs font-mono mb-1">{lic.numero}</div>
                <div className="text-gray-500 text-sm mb-1">{lic.titulo}</div>
                <span className="text-xs text-gray-700">{lic.razon}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Escape hatch */}
      <div className="bg-yellow-950/20 border border-dashed border-yellow-800/40 rounded-xl p-4 flex items-center gap-4">
        <span className="text-xl">📂</span>
        <div className="flex-1">
          <div className="text-yellow-400 text-sm font-bold">¿Tienes una convocatoria que no aparece aquí?</div>
          <div className="text-yellow-900 text-xs">Súbela directamente — la analizamos al instante</div>
        </div>
        <button className="shrink-0 bg-yellow-950 text-yellow-500 border border-yellow-800 text-xs font-bold px-3 py-1.5 rounded-lg">
          Subir PDF
        </button>
      </div>
    </div>
  )
}
