"use client"
import { useState } from "react"
import { api } from "@/lib/api"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const SECTORES = [
  "Tecnología",
  "Construcción",
  "Salud",
  "Servicios",
  "Manufactura",
  "Consultoría",
  "Otro",
]

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [form, setForm] = useState({ rfc: "", nombre: "", sector: "" })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function handleFinish() {
    setLoading(true)
    setError("")
    try {
      await api.auth.onboarding(form)
      router.push("/dashboard")
    } catch (err: any) {
      setError(err.message || "Error al guardar")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg bg-gray-900 border-gray-800">
        <CardHeader>
          <div className="text-center mb-1">
            <span className="text-xl font-bold text-white">LICIT</span>
            <span className="text-xl font-bold text-blue-400">-IA</span>
          </div>
          <CardTitle className="text-white text-center">
            Configura tu empresa — Paso {step} de 2
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {step === 1 && (
            <>
              <input
                placeholder="RFC (ej. XAXX010101000)"
                value={form.rfc}
                onChange={(e) =>
                  setForm({ ...form, rfc: e.target.value.toUpperCase() })
                }
                className="w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                maxLength={13}
              />
              <input
                placeholder="Nombre o razón social"
                value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <Button
                className="w-full bg-blue-600 hover:bg-blue-700"
                onClick={() => setStep(2)}
                disabled={!form.rfc || !form.nombre}
              >
                Siguiente
              </Button>
            </>
          )}
          {step === 2 && (
            <>
              <p className="text-gray-400 text-sm">
                ¿En qué sector opera tu empresa?
              </p>
              <div className="grid grid-cols-2 gap-2">
                {SECTORES.map((s) => (
                  <button
                    key={s}
                    onClick={() => setForm({ ...form, sector: s })}
                    className={`p-3 rounded-md text-sm border transition-colors ${
                      form.sector === s
                        ? "bg-blue-600 border-blue-500 text-white"
                        : "bg-gray-800 border-gray-700 text-gray-300 hover:border-gray-500"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
              {error && <p className="text-red-400 text-sm">{error}</p>}
              <Button
                className="w-full bg-blue-600 hover:bg-blue-700 mt-4"
                onClick={handleFinish}
                disabled={!form.sector || loading}
              >
                {loading ? "Guardando..." : "Comenzar"}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
