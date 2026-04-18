"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { api } from "@/lib/api"

export function MeInteresaButton({ licitacionId }: { licitacionId: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleClick() {
    setLoading(true)
    try {
      const analisis = await api.analisis.create(licitacionId)
      router.push(`/licitacion/${licitacionId}?analisis=${analisis.id}`)
    } catch (e) {
      console.error(e)
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
        loading
          ? "bg-gray-700 text-gray-500 cursor-not-allowed"
          : "bg-blue-600 hover:bg-blue-700 text-white"
      }`}
    >
      {loading ? "Iniciando..." : "Me interesa"}
    </button>
  )
}
