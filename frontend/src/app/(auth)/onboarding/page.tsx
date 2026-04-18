"use client"
export const dynamic = "force-dynamic"
import { useState } from "react"
import { api } from "@/lib/api"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const STEPS = [
  { id: 0, label: "Tu empresa" },
  { id: 1, label: "Especialidad" },
  { id: 2, label: "Cobertura" },
  { id: 3, label: "Rango" },
  { id: 4, label: "Acreditaciones" },
  { id: 5, label: "Prioridades" },
]

const ESPECIALIDADES = ["Seguridad", "Limpieza", "Construcción", "TI", "Salud", "Manufactura", "Consultoría", "Otros"]
const COBERTURAS = ["Nacional", "Centro", "Norte", "Occidente", "Sureste", "Noreste", "Bajío", "Otros"]
const RANGOS = ["<$5M", "$5M-$20M", "$20M-$100M", "$100M+"]
const ACREDITACIONES = ["REPSE", "ISO 9001", "ISO 27001", "ESR", "Pyme", "Otros"]
const INSTITUCIONES = ["IMSS", "PEMEX", "CFE", "SEDENA", "CAPUFE", "ISSSTE", "Estados", "Otros"]

type Form = {
  rfc: string
  nombre: string
  sector: string
  regiones: string[]
  rango_financiero: string
  acreditaciones: string[]
  prioridades_instituciones: string[]
  intereses_libres: string
}

function toggleItem(arr: string[], item: string): string[] {
  return arr.includes(item) ? arr.filter((x) => x !== item) : [...arr, item]
}

function SelectionGrid({
  options,
  selected,
  onToggle,
}: {
  options: string[]
  selected: string[]
  onToggle: (item: string) => void
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {options.map((opt) => {
        const active = selected.includes(opt)
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onToggle(opt)}
            className={`p-3 rounded-md text-sm border transition-colors text-left ${
              active
                ? "bg-blue-600 border-blue-500 text-white"
                : "bg-gray-800 border-gray-700 text-gray-300 hover:border-gray-500"
            }`}
          >
            {opt}
          </button>
        )
      })}
    </div>
  )
}

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [form, setForm] = useState<Form>({
    rfc: "",
    nombre: "",
    sector: "",
    regiones: [],
    rango_financiero: "",
    acreditaciones: [],
    prioridades_instituciones: [],
    intereses_libres: "",
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const canProceed = () => {
    if (step === 0) return form.rfc.length >= 12 && form.nombre.trim().length > 0
    if (step === 1) return form.sector !== ""
    if (step === 2) return form.regiones.length > 0
    if (step === 3) return form.rango_financiero !== ""
    if (step === 4) return true
    if (step === 5) return form.prioridades_instituciones.length > 0
    return false
  }

  async function handleFinish() {
    setLoading(true)
    setError("")
    try {
      await api.auth.onboarding({
        rfc: form.rfc,
        nombre: form.nombre,
        sector: form.sector,
        regiones: form.regiones,
        rango_financiero: form.rango_financiero,
        acreditaciones: form.acreditaciones,
        prioridades_instituciones: form.prioridades_instituciones,
        intereses_libres: form.intereses_libres || null,
      })
      router.push("/dashboard")
    } catch (err: any) {
      setError(err.message || "Error al guardar")
    } finally {
      setLoading(false)
    }
  }

  const stepTitle = [
    "Tu empresa",
    "¿En qué especialidad opera?",
    "¿En qué zonas tiene cobertura real?",
    "¿Cuál es su techo financiero por contrato?",
    "¿Qué acreditaciones tiene vigentes?",
    "¿Qué instituciones son prioritarias?",
  ][step]

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg bg-gray-900 border-gray-800">
        <CardHeader>
          <div className="text-center mb-2">
            <span className="text-xl font-bold text-white">LICIT</span>
            <span className="text-xl font-bold text-blue-400">-IA</span>
          </div>

          <div className="flex gap-1 mb-2">
            {STEPS.map((s) => (
              <div
                key={s.id}
                className={`h-1 flex-1 rounded-full transition-colors ${
                  s.id <= step ? "bg-blue-500" : "bg-gray-700"
                }`}
              />
            ))}
          </div>

          <CardTitle className="text-white text-center text-base font-medium">
            {stepTitle}
          </CardTitle>
          <p className="text-center text-gray-500 text-xs">
            Paso {step + 1} de {STEPS.length}
          </p>
        </CardHeader>

        <CardContent className="space-y-4">
          {step === 0 && (
            <>
              <input
                placeholder="RFC (ej. XAXX010101000)"
                value={form.rfc}
                onChange={(e) => setForm({ ...form, rfc: e.target.value.toUpperCase() })}
                className="w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                maxLength={13}
              />
              <input
                placeholder="Nombre o razón social"
                value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div>
                <p className="text-gray-500 text-xs mb-1">
                  ¿Hay algún rubro o tipo de licitación que le interese en particular? (opcional)
                </p>
                <textarea
                  placeholder="Ej: vigilancia en hospitales, mantenimiento de edificios federales, suministro de medicamentos..."
                  value={form.intereses_libres}
                  onChange={(e) => setForm({ ...form, intereses_libres: e.target.value })}
                  rows={3}
                  className="w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
            </>
          )}

          {step === 1 && (
            <SelectionGrid
              options={ESPECIALIDADES}
              selected={form.sector ? [form.sector] : []}
              onToggle={(item) => setForm({ ...form, sector: item })}
            />
          )}

          {step === 2 && (
            <>
              <p className="text-gray-500 text-xs">Puede seleccionar varias zonas</p>
              <SelectionGrid
                options={COBERTURAS}
                selected={form.regiones}
                onToggle={(item) =>
                  setForm({ ...form, regiones: toggleItem(form.regiones, item) })
                }
              />
            </>
          )}

          {step === 3 && (
            <SelectionGrid
              options={RANGOS}
              selected={form.rango_financiero ? [form.rango_financiero] : []}
              onToggle={(item) => setForm({ ...form, rango_financiero: item })}
            />
          )}

          {step === 4 && (
            <>
              <p className="text-gray-500 text-xs">Opcional — puede continuar sin seleccionar</p>
              <SelectionGrid
                options={ACREDITACIONES}
                selected={form.acreditaciones}
                onToggle={(item) =>
                  setForm({ ...form, acreditaciones: toggleItem(form.acreditaciones, item) })
                }
              />
            </>
          )}

          {step === 5 && (
            <>
              <p className="text-gray-500 text-xs">¿Con qué instituciones quiere trabajar?</p>
              <SelectionGrid
                options={INSTITUCIONES}
                selected={form.prioridades_instituciones}
                onToggle={(item) =>
                  setForm({
                    ...form,
                    prioridades_instituciones: toggleItem(form.prioridades_instituciones, item),
                  })
                }
              />
            </>
          )}

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <div className="flex gap-2 pt-2">
            {step > 0 && (
              <Button
                variant="outline"
                className="flex-1 border-gray-700 text-gray-300 hover:bg-gray-800"
                onClick={() => setStep(step - 1)}
              >
                Atrás
              </Button>
            )}
            {step < STEPS.length - 1 ? (
              <Button
                className="flex-1 bg-blue-600 hover:bg-blue-700"
                onClick={() => setStep(step + 1)}
                disabled={!canProceed()}
              >
                Siguiente
              </Button>
            ) : (
              <Button
                className="flex-1 bg-blue-600 hover:bg-blue-700"
                onClick={handleFinish}
                disabled={!canProceed() || loading}
              >
                {loading ? "Guardando..." : "Comenzar"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
