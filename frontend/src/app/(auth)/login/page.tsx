"use client"
export const dynamic = "force-dynamic"
import { useState } from "react"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [mode, setMode] = useState<"login" | "register" | "confirm">("login")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError("")
    try {
      if (mode === "register") {
        const { data, error: signUpError } = await supabase.auth.signUp({ email, password })
        if (signUpError) throw signUpError

        if (data.session) {
          // Email confirmation is OFF — session is active immediately
          await fetch(
            `${API_URL}/api/auth/register-user?supabase_uid=${data.user!.id}&email=${encodeURIComponent(email)}`,
            { method: "POST" }
          )
          router.push("/onboarding")
        } else if (data.user) {
          // Email confirmation is ON — user exists but needs to confirm
          // Pre-register in our DB so they can continue after confirming
          await fetch(
            `${API_URL}/api/auth/register-user?supabase_uid=${data.user.id}&email=${encodeURIComponent(email)}`,
            { method: "POST" }
          )
          setMode("confirm")
        }
      } else if (mode === "login") {
        const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password })
        if (signInError) {
          if (signInError.message.toLowerCase().includes("email not confirmed")) {
            setMode("confirm")
            return
          }
          throw signInError
        }
        const token = data.session?.access_token
        const me = await fetch(`${API_URL}/api/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        }).then((r) => r.json())

        // If user record doesn't exist yet (edge case: confirm flow), create it
        if (me.detail === "User not registered") {
          await fetch(
            `${API_URL}/api/auth/register-user?supabase_uid=${data.user!.id}&email=${encodeURIComponent(email)}`,
            { method: "POST" }
          )
          router.push("/onboarding")
        } else {
          router.push(me.company_id ? "/dashboard" : "/onboarding")
        }
      }
    } catch (err: any) {
      setError(err.message || "Error desconocido")
    } finally {
      setLoading(false)
    }
  }

  // ── Confirm-email screen ───────────────────────────────────────────────────
  if (mode === "confirm") {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-gray-900 border-gray-800">
          <CardHeader>
            <div className="text-center mb-2">
              <span className="text-2xl font-bold text-white">LICIT</span>
              <span className="text-2xl font-bold text-blue-400">-IA</span>
            </div>
            <CardTitle className="text-white text-center text-lg">Confirma tu correo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            <div className="text-4xl">📬</div>
            <p className="text-gray-300 text-sm leading-relaxed">
              Te enviamos un enlace de confirmación a{" "}
              <span className="text-white font-semibold">{email}</span>.
            </p>
            <p className="text-gray-500 text-xs leading-relaxed">
              Abre tu correo, haz clic en el enlace de confirmación y regresa aquí
              para iniciar sesión.
            </p>
            <Button
              className="w-full bg-blue-600 hover:bg-blue-700 mt-2"
              onClick={() => setMode("login")}
            >
              Ya confirmé — Iniciar sesión
            </Button>
            <button
              type="button"
              className="w-full text-gray-500 text-xs hover:text-gray-300 transition-colors"
              onClick={() => setMode("register")}
            >
              ¿No recibiste el correo? Intentar de nuevo
            </button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // ── Login / Register screen ────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-gray-900 border-gray-800">
        <CardHeader>
          <div className="text-center mb-2">
            <span className="text-2xl font-bold text-white">LICIT</span>
            <span className="text-2xl font-bold text-blue-400">-IA</span>
          </div>
          <CardTitle className="text-white text-center text-lg">
            {mode === "login" ? "Iniciar sesión" : "Crear cuenta"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="email"
              placeholder="correo@empresa.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <input
              type="password"
              placeholder="Contraseña (mínimo 6 caracteres)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              minLength={6}
              required
            />
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <Button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700"
              disabled={loading}
            >
              {loading ? "Procesando..." : mode === "login" ? "Entrar" : "Registrarse"}
            </Button>
            <button
              type="button"
              className="w-full text-gray-400 text-sm hover:text-white transition-colors"
              onClick={() => { setMode(mode === "login" ? "register" : "login"); setError("") }}
            >
              {mode === "login"
                ? "¿No tienes cuenta? Regístrate"
                : "¿Ya tienes cuenta? Inicia sesión"}
            </button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
