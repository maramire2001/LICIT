"use client"
import { useState, useEffect } from "react"

function useCountUp(target: number, active: boolean, duration = 1400) {
  const [value, setValue] = useState(0)
  useEffect(() => {
    if (!active) return
    const start = Date.now()
    const tick = () => {
      const elapsed = Date.now() - start
      const progress = Math.min(elapsed / duration, 1)
      const ease = 1 - Math.pow(1 - progress, 3)
      setValue(Math.round(target * ease))
      if (progress < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }, [active, target, duration])
  return value
}

export function ScoreRing({ score, active }: { score: number; active: boolean }) {
  const displayed = useCountUp(score, active)
  const r = 52
  const circ = 2 * Math.PI * r
  const progress = active ? (displayed / 100) * circ : 0
  return (
    <div className="relative inline-flex items-center justify-center w-36 h-36">
      <svg className="absolute inset-0 -rotate-90" width="144" height="144">
        <circle cx="72" cy="72" r={r} strokeWidth="8" fill="none" className="stroke-gray-800" />
        <circle
          cx="72" cy="72" r={r} strokeWidth="8" fill="none"
          className="stroke-emerald-400 transition-all duration-100"
          strokeDasharray={circ}
          strokeDashoffset={circ - progress}
          strokeLinecap="round"
        />
      </svg>
      <div className="text-center z-10">
        <div className="text-4xl font-black text-white">{displayed}</div>
        <div className="text-xs text-gray-400 -mt-0.5">/ 100</div>
      </div>
    </div>
  )
}
