"use client"
import { useState } from "react"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [mode, setMode] = useState<"login" | "register">("login")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError("")
    try {
      if (mode === "register") {
        const { data, error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        if (data.user) {
          await fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/api/auth/register-user?supabase_uid=${data.user.id}&email=${encodeURIComponent(email)}`,
            { method: "POST" }
          )
          router.push("/onboarding")
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        const session = (await supabase.auth.getSession()).data.session
        const me = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/me`, {
          headers: { Authorization: `Bearer ${session?.access_token}` },
        }).then((r) => r.json())
        router.push(me.company_id ? "/dashboard" : "/onboarding")
      }
    } catch (err: any) {
      setError(err.message || "Error desconocido")
    } finally {
      setLoading(false)
    }
  }

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
              placeholder="Contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <Button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700"
              disabled={loading}
            >
              {loading ? "..." : mode === "login" ? "Entrar" : "Registrarse"}
            </Button>
            <button
              type="button"
              className="w-full text-gray-400 text-sm hover:text-white transition-colors"
              onClick={() => setMode(mode === "login" ? "register" : "login")}
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
