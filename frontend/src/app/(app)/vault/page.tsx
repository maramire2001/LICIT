"use client"
export const dynamic = "force-dynamic"
import { useEffect, useRef, useState } from "react"
import { api } from "@/lib/api"
import { supabase } from "@/lib/supabase"

const TIPOS = [
  { value: "acta", label: "Acta Constitutiva" },
  { value: "rfc", label: "Constancia RFC" },
  { value: "sat32d", label: "Opinión SAT 32-D" },
  { value: "poder", label: "Poder Notarial" },
  { value: "repse", label: "Registro REPSE" },
  { value: "iso9001", label: "Certificación ISO 9001" },
  { value: "iso27001", label: "Certificación ISO 27001" },
  { value: "infonavit", label: "Opinión INFONAVIT" },
  { value: "estado_cuenta", label: "Estado de Cuenta Bancario" },
  { value: "fianza", label: "Póliza de Fianza" },
  { value: "seguro", label: "Póliza de Seguro" },
  { value: "certificacion", label: "Otra Certificación" },
]

export default function VaultPage() {
  const [docs, setDocs] = useState<any[]>([])
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState("")
  const [selectedTipo, setSelectedTipo] = useState("rfc")
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    api.vault.list().then(setDocs).catch(() => null)
  }, [])

  async function handleUpload() {
    const file = fileRef.current?.files?.[0]
    if (!file) return
    setUploading(true)
    setUploadError("")
    try {
      const session = (await supabase.auth.getSession()).data.session
      const formData = new FormData()
      formData.append("file", file)
      formData.append("tipo", selectedTipo)
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/vault/upload`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${session?.access_token}` },
          body: formData,
        }
      )
      if (!res.ok) throw new Error(`Error ${res.status}`)
      const updated = await api.vault.list()
      setDocs(updated)
      if (fileRef.current) fileRef.current.value = ""
    } catch (err: any) {
      setUploadError(err?.message || "Error al subir el documento")
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 p-6">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-xl font-bold text-white mb-2">Master Vault</h1>
        <p className="text-gray-500 text-sm mb-6">
          Repositorio de documentos de tu empresa
        </p>

        {/* Upload */}
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-5 mb-6 space-y-3">
          <p className="text-gray-300 text-sm font-medium">Subir documento</p>
          <select
            value={selectedTipo}
            onChange={(e) => setSelectedTipo(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {TIPOS.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.jpg,.png,.jpeg"
            className="text-gray-400 text-sm file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:bg-gray-700 file:text-gray-300 hover:file:bg-gray-600"
          />
          <button
            onClick={handleUpload}
            disabled={uploading}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              uploading
                ? "bg-gray-700 text-gray-500 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700 text-white"
            }`}
          >
            {uploading ? "Subiendo y extrayendo datos..." : "Subir documento"}
          </button>
          {uploadError && (
            <p className="text-red-400 text-xs">{uploadError}</p>
          )}
        </div>

        {/* Document list */}
        {docs.length === 0 ? (
          <p className="text-gray-600 text-sm text-center py-12">
            No hay documentos en el vault todavía
          </p>
        ) : (
          <div className="space-y-2">
            {docs.map((doc) => (
              <div
                key={doc.id}
                className="bg-gray-900 border border-gray-800 rounded-lg px-4 py-3 flex justify-between items-center"
              >
                <div>
                  <p className="text-white text-sm font-medium">
                    {TIPOS.find((t) => t.value === doc.tipo)?.label ?? doc.tipo.toUpperCase()}
                  </p>
                </div>
                <span
                  className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    doc.vigente
                      ? "bg-green-950 text-green-400 border border-green-800"
                      : "bg-red-950 text-red-400 border border-red-900"
                  }`}
                >
                  {doc.vigente ? "Vigente" : "Vencido"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
