type Viabilidad = "participar" | "con_condiciones" | "no_participar"

const CONFIG: Record<Viabilidad, { label: string; bg: string; dot: string }> = {
  participar: {
    label: "PARTICIPAR",
    bg: "bg-green-900 border-green-700",
    dot: "bg-green-400",
  },
  con_condiciones: {
    label: "CON CONDICIONES",
    bg: "bg-yellow-900 border-yellow-700",
    dot: "bg-yellow-400",
  },
  no_participar: {
    label: "NO PARTICIPAR",
    bg: "bg-red-900 border-red-800",
    dot: "bg-red-400",
  },
}

export function Semaforo({
  viabilidad,
  score,
}: {
  viabilidad: string
  score: number | null
}) {
  const cfg = CONFIG[viabilidad as Viabilidad] ?? CONFIG.con_condiciones

  return (
    <div className="flex items-center gap-4 flex-wrap">
      <div
        className={`flex items-center gap-2 px-4 py-2 rounded-full border ${cfg.bg}`}
      >
        <div className={`w-2.5 h-2.5 rounded-full ${cfg.dot} animate-pulse`} />
        <span className="text-white font-bold text-sm tracking-wide">
          {cfg.label}
        </span>
      </div>
      {score !== null && (
        <span className="text-gray-500 text-sm">
          Score:{" "}
          <span className="text-white font-semibold">{Math.round(score)}/100</span>
        </span>
      )}
    </div>
  )
}
