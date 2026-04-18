import { MeInteresaButton } from "./MeInteresaButton"
import type { Licitacion } from "@/types"

function formatMonto(monto: number | null): string {
  if (!monto) return "Monto no especificado"
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(monto)
}

function formatFecha(fecha: string | null): string {
  if (!fecha) return "—"
  return new Date(fecha).toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

export function LicitacionCard({
  licitacion,
  relevancia,
}: {
  licitacion: Licitacion
  relevancia?: number
}) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 hover:border-gray-700 transition-colors">
      <div className="flex justify-between items-start gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-xs text-gray-500 mb-1 font-mono">
            {licitacion.numero_procedimiento}
          </p>
          <h3 className="text-white text-sm font-medium leading-snug line-clamp-2 mb-2">
            {licitacion.titulo}
          </h3>
          <p className="text-gray-400 text-xs mb-3 truncate">
            {licitacion.dependencia}
          </p>
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span>
              Apertura:{" "}
              <span className="text-gray-400">
                {formatFecha(licitacion.fecha_apertura)}
              </span>
            </span>
            <span className="text-blue-400 font-medium">
              {formatMonto(licitacion.monto_estimado)}
            </span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2 shrink-0">
          <div className="flex items-center gap-1.5">
            {relevancia !== undefined && relevancia > 0 && (
              <span
                title="Coincide con tu perfil ADN"
                className="w-2 h-2 rounded-full bg-green-400 shrink-0"
              />
            )}
            <span
              className={`text-xs px-2 py-0.5 rounded-full border ${
                licitacion.estado === "activa"
                  ? "border-green-800 text-green-400 bg-green-950"
                  : "border-gray-700 text-gray-500"
              }`}
            >
              {licitacion.estado}
            </span>
          </div>
          <MeInteresaButton licitacionId={licitacion.id} />
        </div>
      </div>
    </div>
  )
}
