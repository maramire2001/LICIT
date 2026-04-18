function fmt(n: number | null): string {
  if (n == null) return "—"
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(n)
}

export function PriceToWin({
  conservador,
  optimo,
  agresivo,
}: {
  conservador: number | null
  optimo: number | null
  agresivo: number | null
}) {
  const scenarios = [
    { label: "Conservador", value: conservador, cls: "border-gray-700" },
    {
      label: "Óptimo",
      value: optimo,
      cls: "border-blue-700 bg-blue-950",
    },
    { label: "Agresivo", value: agresivo, cls: "border-orange-800" },
  ]

  return (
    <div className="grid grid-cols-3 gap-3">
      {scenarios.map(({ label, value, cls }) => (
        <div
          key={label}
          className={`border rounded-lg p-3 text-center ${cls}`}
        >
          <p className="text-gray-500 text-xs mb-1">{label}</p>
          <p className="text-white font-bold text-sm">{fmt(value)}</p>
        </div>
      ))}
    </div>
  )
}
