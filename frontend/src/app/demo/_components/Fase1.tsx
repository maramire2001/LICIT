"use client"
import { useState } from "react"
import { DISCLAIMER_CORTO } from "../_data"

const ESPECIALIDADES = [
  { id: "seguridad", label: "🔒 Seguridad Privada" },
  { id: "limpieza", label: "🧹 Limpieza y Mantenimiento" },
  { id: "construccion", label: "🏗️ Construcción e Infraestructura" },
  { id: "ti", label: "💻 Tecnologías de la Información" },
  { id: "salud", label: "🏥 Salud y Farmacéutica" },
  { id: "otros", label: "⋯ Otros" },
]

const COBERTURAS = [
  { id: "nacional", label: "🌎 Nacional" },
  { id: "centro", label: "🏙️ Zona Centro (CDMX y Edomex)" },
  { id: "norte", label: "🏜️ Zona Norte" },
  { id: "occidente", label: "🌊 Occidente (Jalisco, Colima, Nayarit)" },
  { id: "sureste", label: "🌿 Sureste (Oaxaca, Chiapas, Yucatán)" },
  { id: "otros", label: "⋯ Otros" },
]

const RANGOS = [
  { id: "5m", label: "💰 Menos de $5M MXN" },
  { id: "20m", label: "💰💰 $5M – $20M MXN" },
  { id: "100m", label: "💰💰💰 $20M – $100M MXN" },
  { id: "100m+", label: "💰💰💰💰 $100M+ MXN" },
  { id: "otros", label: "⋯ Otro rango" },
]

const ACREDITACIONES = [
  { id: "repse", label: "✅ REPSE (STPS)" },
  { id: "iso9001", label: "✅ ISO 9001:2015" },
  { id: "iso27001", label: "ISO 27001" },
  { id: "esr", label: "ESR (Empresa Socialmente Responsable)" },
  { id: "pyme", label: "Programa PyME (SE)" },
  { id: "otros", label: "⋯ Otros" },
]

const INSTITUCIONES = [
  { id: "imss", label: "🏥 IMSS", tag: "CompraNet", disabled: false },
  { id: "issste", label: "🏥 ISSSTE", tag: "CompraNet", disabled: false },
  { id: "sedena", label: "🪖 SEDENA", tag: "CompraNet", disabled: false },
  { id: "capufe", label: "🛣️ CAPUFE", tag: "CompraNet", disabled: false },
  { id: "aifa", label: "✈️ AIFA / ASA", tag: "CompraNet", disabled: false },
  { id: "federal", label: "🏛️ Gobierno Federal", tag: "CompraNet", disabled: false },
  { id: "pemex", label: "⛽ PEMEX", tag: "Próximamente", disabled: true },
  { id: "cfe", label: "⚡ CFE", tag: "Próximamente", disabled: true },
  { id: "estados", label: "🏙️ Estados y Municipios", tag: "CompraNet (parcial)", disabled: false },
]

export function Fase1({ onNext }: { onNext: () => void }) {
  const [especialidad, setEspecialidad] = useState("seguridad")
  const [cobertura, setCobertura] = useState<string[]>(["nacional"])
  const [rango, setRango] = useState("100m+")
  const [acreditaciones, setAcreditaciones] = useState<string[]>(["repse", "iso9001"])
  const [instituciones, setInstituciones] = useState<string[]>(["imss"])

  function toggleSet(set: string[], val: string, setter: (v: string[]) => void) {
    setter(set.includes(val) ? set.filter(x => x !== val) : [...set, val])
  }

  const selected = (val: string, set: string[]) =>
    set.includes(val)
      ? "bg-blue-900/40 border-blue-500 text-blue-300"
      : "bg-gray-900 border-gray-700 text-gray-400 hover:border-gray-600"

  const selectedRadio = (val: string, current: string) =>
    val === current
      ? "bg-blue-900/40 border-blue-500 text-blue-300"
      : "bg-gray-900 border-gray-700 text-gray-400 hover:border-gray-600"

  return (
    <div>
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/30 rounded-full px-4 py-1.5 mb-4">
          <span className="text-blue-400 text-sm font-bold">⚡ LICIT-IA · Configuración Express</span>
        </div>
        <h1 className="text-3xl font-black text-white mb-2">¿Quién es tu empresa?</h1>
        <p className="text-gray-500 text-sm">5 preguntas · menos de 60 segundos · tu Radar queda listo al instante</p>
      </div>

      <div className="grid sm:grid-cols-2 gap-5 mb-5">
        {/* 01 Especialidad */}
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4">
          <div className="text-blue-400 text-xs font-bold tracking-widest uppercase mb-1">01 · Especialidad</div>
          <p className="text-gray-300 text-sm mb-3">¿Cuál es la línea de negocio principal?</p>
          <div className="flex flex-col gap-2">
            {ESPECIALIDADES.map(e => (
              <button
                key={e.id}
                onClick={() => setEspecialidad(e.id)}
                className={`text-left px-3 py-2 rounded-lg border text-sm transition-all ${selectedRadio(e.id, especialidad)}`}
              >
                {e.label}
              </button>
            ))}
          </div>
        </div>

        {/* 02 Cobertura */}
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4">
          <div className="text-blue-400 text-xs font-bold tracking-widest uppercase mb-1">02 · Cobertura</div>
          <p className="text-gray-300 text-sm mb-3">¿En qué zonas tienen capacidad real?</p>
          <div className="flex flex-col gap-2">
            {COBERTURAS.map(c => (
              <button
                key={c.id}
                onClick={() => toggleSet(cobertura, c.id, setCobertura)}
                className={`text-left px-3 py-2 rounded-lg border text-sm transition-all ${selected(c.id, cobertura)}`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        {/* 03 Rango */}
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4">
          <div className="text-blue-400 text-xs font-bold tracking-widest uppercase mb-1">03 · Rango Financiero</div>
          <p className="text-gray-300 text-sm mb-3">¿Cuál es su techo por contrato?</p>
          <div className="flex flex-col gap-2">
            {RANGOS.map(r => (
              <button
                key={r.id}
                onClick={() => setRango(r.id)}
                className={`text-left px-3 py-2 rounded-lg border text-sm transition-all ${selectedRadio(r.id, rango)}`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {/* 04 Acreditaciones */}
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4">
          <div className="text-blue-400 text-xs font-bold tracking-widest uppercase mb-1">04 · Acreditaciones</div>
          <p className="text-gray-300 text-sm mb-3">¿Qué registros tienen vigentes?</p>
          <div className="flex flex-col gap-2">
            {ACREDITACIONES.map(a => (
              <button
                key={a.id}
                onClick={() => toggleSet(acreditaciones, a.id, setAcreditaciones)}
                className={`text-left px-3 py-2 rounded-lg border text-sm transition-all ${selected(a.id, acreditaciones)}`}
              >
                {a.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 05 Instituciones */}
      <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4 mb-5">
        <div className="text-blue-400 text-xs font-bold tracking-widest uppercase mb-1">05 · Instituciones Prioritarias</div>
        <p className="text-gray-300 text-sm mb-3">
          ¿Qué dependencias son críticas? <span className="text-gray-600">(puedes seleccionar varias)</span>
        </p>
        <div className="grid grid-cols-3 gap-2">
          {INSTITUCIONES.map(inst => (
            <button
              key={inst.id}
              disabled={inst.disabled}
              onClick={() => !inst.disabled && toggleSet(instituciones, inst.id, setInstituciones)}
              className={`text-left px-3 py-2 rounded-lg border text-sm transition-all ${
                inst.disabled
                  ? "border-gray-800 text-gray-700 cursor-not-allowed opacity-40"
                  : selected(inst.id, instituciones)
              }`}
            >
              <div>{inst.label}</div>
              <div className={`text-xs mt-0.5 ${inst.disabled ? "text-gray-700" : "text-blue-600"}`}>
                {inst.tag}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Escape hatch */}
      <div className="bg-yellow-950/30 border border-yellow-800/40 rounded-xl p-4 mb-6 flex items-center gap-4">
        <span className="text-2xl">📂</span>
        <div className="flex-1">
          <div className="text-yellow-400 text-sm font-bold">¿Tienes una convocatoria que no aparece aquí?</div>
          <div className="text-yellow-800 text-xs mt-0.5">Súbela directamente — la analizamos al instante y armamos tu expediente completo</div>
        </div>
      </div>

      <button
        onClick={onNext}
        className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-4 rounded-xl text-base transition-all shadow-lg shadow-blue-600/30 hover:shadow-blue-500/40"
      >
        ⚡ Activar mi Radar — Ver mis oportunidades →
      </button>

      <p className="text-center text-gray-700 text-xs mt-3">{DISCLAIMER_CORTO}</p>
    </div>
  )
}
