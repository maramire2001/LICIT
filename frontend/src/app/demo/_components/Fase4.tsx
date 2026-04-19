"use client"
import { DEMO_LICITACION, fmt } from "../_data"

const NIVELES = [
  {
    id: "bronce", emoji: "🥉", label: "Bronce", sub: "Local · Simplificada",
    precio: 20_000, activo: false,
  },
  {
    id: "plata", emoji: "🥈", label: "Plata", sub: "Estatal · Descentralizada",
    precio: 30_000, activo: false,
  },
  {
    id: "oro", emoji: "🏆", label: "Oro", sub: "Federal · Alta complejidad",
    precio: 40_000, activo: true,
  },
]

const ENTREGABLES = [
  "Expediente completo para IMSS",
  "Vault inteligente — docs exactos",
  "PTW + 3 escenarios financieros",
  "ZIP listo para portal CompraNet",
]

export function Fase4({ onNext }: { onNext: () => void }) {
  const roi = Math.round(DEMO_LICITACION.monto / 40_000)

  return (
    <div>
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/30 rounded-full px-4 py-1.5 mb-4">
          <span className="text-yellow-400 text-sm font-bold">🏆 Licitación Nivel ORO — Federal · Alta complejidad</span>
        </div>
        <h1 className="text-2xl font-black text-white mb-2">¿Quieres concursar por este contrato?</h1>
        <p className="text-gray-500 text-sm">LICIT-IA construye tu expediente completo y listo para entrega al portal</p>
      </div>

      <div className="grid sm:grid-cols-3 gap-4 mb-6">
        {NIVELES.map(n => (
          <div
            key={n.id}
            className={`relative rounded-xl p-5 border-2 transition-all ${
              n.activo
                ? "bg-yellow-950/20 border-yellow-600"
                : "bg-gray-900/30 border-gray-800 opacity-50"
            }`}
          >
            {n.activo && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-yellow-600 text-white text-xs font-black px-3 py-0.5 rounded-full">
                TU NIVEL
              </div>
            )}
            <div className="text-center mb-4">
              <div className="text-3xl mb-1">{n.emoji}</div>
              <div className={`font-black text-lg ${n.activo ? "text-yellow-400" : "text-gray-500"}`}>{n.label}</div>
              <div className={`text-xs ${n.activo ? "text-yellow-700" : "text-gray-700"}`}>{n.sub}</div>
            </div>
            <div className="text-center mb-4">
              <div className={`text-3xl font-black ${n.activo ? "text-yellow-300" : "text-gray-600"}`}>
                ${n.precio.toLocaleString("es-MX")}
              </div>
              <div className={`text-xs ${n.activo ? "text-yellow-800" : "text-gray-700"}`}>MXN + IVA</div>
            </div>
            {n.activo ? (
              <>
                <div className="flex flex-col gap-2 mb-4">
                  {ENTREGABLES.map(e => (
                    <div key={e} className="flex items-center gap-2">
                      <span className="text-yellow-500 text-xs">✓</span>
                      <span className="text-yellow-700 text-xs">{e}</span>
                    </div>
                  ))}
                </div>
                <button
                  onClick={onNext}
                  className="w-full bg-yellow-600 hover:bg-yellow-500 text-white font-black py-2.5 rounded-lg text-sm transition-all"
                >
                  Concursar — Pagar $40,000 →
                </button>
              </>
            ) : (
              <div className="text-center text-gray-700 text-xs">No aplica para esta licitación</div>
            )}
          </div>
        ))}
      </div>

      {/* ROI */}
      <div className="bg-green-950/20 border border-green-800/30 rounded-xl p-4 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <span className="text-2xl">💡</span>
          <div>
            <div className="text-green-400 text-sm font-bold">¿Por qué vale la pena?</div>
            <div className="text-green-800 text-xs">
              El contrato vale <strong className="text-green-600">{fmt(DEMO_LICITACION.monto)}</strong> — nuestro fee es el{" "}
              <strong className="text-green-600">0.032%</strong> del total
            </div>
          </div>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl px-4 py-2 text-center shrink-0">
          <div className="text-green-400 text-xl font-black">{roi.toLocaleString("es-MX")}x</div>
          <div className="text-gray-600 text-xs">ROI si ganas</div>
        </div>
      </div>
    </div>
  )
}
