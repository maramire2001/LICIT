# Demo de Ventas Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reescribir `/demo` como wizard híbrido de 6 fases espectacular alineado 100% con la app real, y agregar disclaimers legales en paralelo al backend y frontend.

**Architecture:** Demo es un componente Next.js client-only sin llamadas API. Máquina de estados con `phase: 1-6`. Cada fase es un componente independiente en `_components/`. Datos en `_data.ts`. App alignment: disclaimer en `_generar_portada()` del backend y en dos páginas del frontend.

**Tech Stack:** Next.js 16 App Router, React, TypeScript, Tailwind, `requestAnimationFrame` para animaciones de contadores.

---

## File Map

| Archivo | Acción | Responsabilidad |
|---|---|---|
| `frontend/src/app/demo/_data.ts` | Crear | Todas las constantes de la demo |
| `frontend/src/app/demo/_components/ScoreRing.tsx` | Crear | Anillo animado extraído del demo actual |
| `frontend/src/app/demo/_components/Fase1.tsx` | Crear | Interrogatorio ADN |
| `frontend/src/app/demo/_components/Fase2.tsx` | Crear | Radar personalizado |
| `frontend/src/app/demo/_components/Fase3.tsx` | Crear | Anatomía cinematográfica (loader + reveal) |
| `frontend/src/app/demo/_components/Fase4.tsx` | Crear | Pago por complejidad |
| `frontend/src/app/demo/_components/Fase5.tsx` | Crear | Vault inteligente |
| `frontend/src/app/demo/_components/Fase6.tsx` | Crear | Expediente final + War Room + PTW |
| `frontend/src/app/demo/page.tsx` | Reescribir | Shell + top bar + máquina de estados |
| `backend/app/api/expediente.py` | Modificar | Agregar disclaimer a `_generar_portada` |
| `backend/tests/test_expediente_zip.py` | Modificar | Actualizar test de portada |
| `frontend/src/app/(app)/expediente/[id]/page.tsx` | Modificar | Disclaimer antes del botón ZIP |
| `frontend/src/app/(app)/vault/page.tsx` | Modificar | Disclaimer de responsabilidad |

---

## Task 1: App Alignment — Disclaimers

**Files:**
- Modify: `backend/app/api/expediente.py` (función `_generar_portada`)
- Modify: `backend/tests/test_expediente_zip.py`
- Modify: `frontend/src/app/(app)/expediente/[id]/page.tsx`
- Modify: `frontend/src/app/(app)/vault/page.tsx`

- [ ] **Step 1: Actualizar test de portada para incluir disclaimer**

En `backend/tests/test_expediente_zip.py`, actualizar `test_portada_contiene_empresa`:

```python
def test_portada_contiene_empresa():
    result = _generar_portada("Empresa SA", "ABC123456789", 2, "A1B2C3D4")
    assert "Empresa SA" in result
    assert "ABC123456789" in result
    assert "v2" in result
    assert "A1B2C3D4" in result
    assert "AVISO LEGAL" in result
    assert "responsabilidad de la presentación" in result
```

- [ ] **Step 2: Ejecutar test — verificar que falla**

```bash
docker exec licit-ai-backend-1 python -m pytest tests/test_expediente_zip.py::test_portada_contiene_empresa -v
```

Expected: FAIL — `assert "AVISO LEGAL" in result`

- [ ] **Step 3: Agregar disclaimer a `_generar_portada`**

En `backend/app/api/expediente.py`, reemplazar la función `_generar_portada`:

```python
DISCLAIMER = (
    "\n---\n"
    "AVISO LEGAL\n"
    "Este expediente es una guía preparada con inteligencia artificial como herramienta de apoyo.\n"
    "LICIT-IA no garantiza adjudicación ni se responsabiliza por el resultado del proceso licitatorio.\n"
    "El contenido debe ser revisado y validado por el área jurídica y directiva de su empresa\n"
    "antes de presentarse ante la dependencia. La responsabilidad de la presentación recae\n"
    "exclusivamente en el participante.\n"
)


def _generar_portada(company_nombre: str, company_rfc: str, version: int, analisis_id_short: str) -> str:
    fecha = datetime.utcnow().strftime("%d/%m/%Y %H:%M UTC")
    return (
        f"EXPEDIENTE LICIT-IA\n"
        f"{'='*40}\n"
        f"Empresa:  {company_nombre}\n"
        f"RFC:      {company_rfc}\n"
        f"Análisis: {analisis_id_short}\n"
        f"Versión:  v{version}\n"
        f"Generado: {fecha}\n"
        f"{DISCLAIMER}"
    )
```

- [ ] **Step 4: Ejecutar todos los tests del ZIP**

```bash
docker exec licit-ai-backend-1 python -m pytest tests/test_expediente_zip.py -v
```

Expected: 10 passed.

- [ ] **Step 5: Agregar disclaimer en expediente page**

En `frontend/src/app/(app)/expediente/[id]/page.tsx`, localizar el bloque que contiene el botón "Descargar ZIP" y agregar el párrafo de disclaimer justo antes del botón:

```tsx
<p className="text-xs text-gray-600 text-center max-w-lg mx-auto mb-3 leading-relaxed">
  Este expediente es una guía de apoyo generada con IA. Debe ser revisado por el área
  jurídica antes de presentarse ante la dependencia. La responsabilidad de la presentación
  recae exclusivamente en el participante.
</p>
```

- [ ] **Step 6: Agregar disclaimer en vault page**

En `frontend/src/app/(app)/vault/page.tsx`, al final del contenido principal (antes del cierre del container), agregar:

```tsx
<p className="text-xs text-gray-700 text-center mt-8 max-w-lg mx-auto leading-relaxed">
  Los documentos se usan únicamente para preparar tu expediente de propuesta. LICIT-IA
  no es responsable por descalificaciones derivadas de documentos incompletos o vencidos.
  Verifica la vigencia de cada documento antes de presentar tu propuesta.
</p>
```

- [ ] **Step 7: Verificar TypeScript**

```bash
cd /Users/maramire2001/Desktop/LICIT-AI/frontend && npx tsc --noEmit 2>&1 | head -10
```

Expected: sin errores.

- [ ] **Step 8: Commit**

```bash
git add backend/app/api/expediente.py backend/tests/test_expediente_zip.py \
  "frontend/src/app/(app)/expediente/[id]/page.tsx" \
  "frontend/src/app/(app)/vault/page.tsx"
git commit -m "feat: add legal disclaimers to ZIP portada, expediente page, vault page"
```

---

## Task 2: Demo — Data + Shell + ScoreRing

**Files:**
- Create: `frontend/src/app/demo/_data.ts`
- Create: `frontend/src/app/demo/_components/ScoreRing.tsx`
- Rewrite: `frontend/src/app/demo/page.tsx`

- [ ] **Step 1: Crear `_data.ts` con todas las constantes**

Crear `frontend/src/app/demo/_data.ts`:

```typescript
export const DEMO_LICITACION = {
  numero: "IMSS-00-GYR-LAOS-001/2025",
  titulo: "Servicio de Seguridad Intramuros — 18 UMAE Región Centro-Sur",
  dependencia: "Instituto Mexicano del Seguro Social (IMSS)",
  monto: 124_500_000,
  apertura: "03 de junio de 2025",
  nivel: "oro" as const,
  score: 92,
  ptw_agresivo: 99_600_000,
  ptw_optimo: 109_560_000,
  ptw_conservador: 118_275_000,
  roi_segundos: 180,
  roi_ahorro: 25_200,
}

export const DEMO_RADAR = [
  {
    numero: "IMSS-00-GYR-LAOS-001/2025",
    titulo: "Servicio de Seguridad Intramuros — 18 UMAE Región Centro-Sur",
    dependencia: "IMSS",
    monto: 124_500_000,
    apertura: "03 jun 2025",
    match: true,
  },
  {
    numero: "SEDENA-OADPRS-LAO-011/2025",
    titulo: "Vigilancia y Rondines — Instalaciones Militares Zona Centro",
    dependencia: "SEDENA",
    monto: 89_200_000,
    apertura: "18 jun 2025",
    match: true,
  },
  {
    numero: "CAPUFE-OA-LAOS-007/2025",
    titulo: "Seguridad Perimetral — 12 Plazas de Cobro Autopistas del Centro",
    dependencia: "CAPUFE",
    monto: 67_800_000,
    apertura: "25 jun 2025",
    match: true,
  },
  {
    numero: "ISSSTE-DGA-LAOS-022/2025",
    titulo: "Servicio de Limpieza — 45 Clínicas Zona Norte",
    dependencia: "ISSSTE",
    monto: 34_000_000,
    apertura: "10 jul 2025",
    match: false,
    razon: "Sin match ADN — fuera de tu sector",
  },
  {
    numero: "CAPUFE-OA-LAOS-009/2025",
    titulo: "Mantenimiento Vial — Autopistas del Pacífico",
    dependencia: "CAPUFE",
    monto: 18_500_000,
    apertura: "15 jul 2025",
    match: false,
    razon: "Sin match ADN — rango fuera de techo",
  },
]

export const DEMO_LOADER_STEPS = [
  { label: "Leyendo bases de licitación (PDF, 248 páginas)…", dur: 1400 },
  { label: "Extrayendo requisitos técnicos, legales y financieros…", dur: 1200 },
  { label: "Construyendo matrices Humana · Materiales · Financiera…", dur: 1600 },
  { label: "Consultando 29 adjudicaciones históricas del IMSS…", dur: 1200 },
  { label: "Calculando escenarios Price to Win…", dur: 1000 },
  { label: "Evaluando nivel de complejidad: Bronce · Plata · Oro…", dur: 800 },
]

export const DEMO_MATRICES = {
  humana: ["450 elementos · 3 turnos", "REPSE vigente mínimo 12 meses", "ISO 9001 en reclutamiento"],
  materiales: ["Radios digitales encriptados", "Uniformes distintivos IMSS", "Vehículos de patrullaje"],
  financiera: ["Capital contable $18.7M mínimo", "Estados financieros 3 años", "Fianza 30% del monto"],
}

export const DEMO_RED_FLAGS = [
  { nivel: "alto" as const, texto: "REPSE vigente con antigüedad mínima 12 meses — verificar fecha de emisión" },
  { nivel: "alto" as const, texto: "ISO 9001:2015 debe cubrir específicamente reclutamiento de personal de seguridad" },
  { nivel: "medio" as const, texto: "Opinión positiva INFONAVIT aplica también a subcontratistas" },
]

export const DEMO_COMPETIDORES = [
  { nombre: "GSI – Grupo Seguridad Integral", contratos: 14, monto: "$118.4M", debilidad: "Precio alto · rotación elevada", bar: 85 },
  { nombre: "Securitas México", contratos: 9, monto: "$115.2M", debilidad: "Respuesta lenta en zonas rurales", bar: 70 },
  { nombre: "Pryse México", contratos: 6, monto: "$109.8M", debilidad: "Incumplimientos CDMX 2022", bar: 55 },
]

export const DEMO_DOCS = [
  { id: "acta", label: "Acta Constitutiva con poder notarial", estado: "ok" as const, nota: "Cumple requisito 3.1" },
  { id: "repse", label: "Constancia REPSE vigente (STPS)", estado: "ok" as const, nota: "Vigencia confirmada 18 meses" },
  { id: "iso", label: "Certificación ISO 9001:2015", estado: "ok" as const, nota: "Cubre reclutamiento de seguridad" },
  { id: "infonavit", label: "Opinión positiva INFONAVIT", estado: "flag" as const, nota: "No cubre subcontratistas — punto 4.2 lo exige" },
  { id: "banco", label: "Estado de cuenta bancario — últimos 3 meses", estado: "falta" as const, nota: "Capital mínimo $18.7M — punto 6.8" },
  { id: "fianza", label: "Fianza de sostenimiento — 5% del monto base", estado: "falta" as const, nota: "Emitida por institución autorizada SHCP · Punto 5.3" },
]

export const DISCLAIMER_CORTO =
  "Herramienta de apoyo estratégico. La presentación final es responsabilidad del participante."

export const DISCLAIMER_COMPLETO =
  "Este expediente es una guía preparada con inteligencia artificial como herramienta de apoyo. " +
  "LICIT-IA no garantiza adjudicación ni se responsabiliza por el resultado del proceso licitatorio. " +
  "El contenido debe ser revisado y validado por el área jurídica y directiva de su empresa antes de " +
  "presentarse ante la dependencia. La responsabilidad de la presentación recae exclusivamente en el participante."

export function fmt(n: number) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(n)
}
```

- [ ] **Step 2: Crear `ScoreRing.tsx`**

Crear `frontend/src/app/demo/_components/ScoreRing.tsx`:

```tsx
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
```

- [ ] **Step 3: Reescribir `page.tsx` — shell + top bar + máquina de estados**

Reescribir `frontend/src/app/demo/page.tsx` completo:

```tsx
"use client"
import { useState } from "react"
import { Fase1 } from "./_components/Fase1"
import { Fase2 } from "./_components/Fase2"
import { Fase3 } from "./_components/Fase3"
import { Fase4 } from "./_components/Fase4"
import { Fase5 } from "./_components/Fase5"
import { Fase6 } from "./_components/Fase6"

export type Phase = 1 | 2 | 3 | 4 | 5 | 6

const PHASE_LABELS = ["ADN", "Radar", "Anatomía", "Acceso", "Vault", "Expediente"]

export default function DemoPage() {
  const [phase, setPhase] = useState<Phase>(1)

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Top bar */}
      <div className="border-b border-gray-800 bg-gray-950/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-black text-lg tracking-tight">
              LICIT<span className="text-blue-400">-IA</span>
            </span>
            <span className="text-xs bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded px-2 py-0.5 ml-1">
              DEMO
            </span>
          </div>
          {/* Progress pills */}
          <div className="hidden sm:flex items-center gap-1">
            {PHASE_LABELS.map((label, i) => {
              const n = (i + 1) as Phase
              return (
                <div
                  key={n}
                  className={`text-xs px-2.5 py-1 rounded-full transition-all ${
                    phase === n
                      ? "bg-blue-600 text-white font-semibold"
                      : phase > n
                      ? "bg-gray-800 text-gray-400"
                      : "text-gray-700"
                  }`}
                >
                  {label}
                </div>
              )
            })}
          </div>
          <span className="text-gray-600 text-xs hidden sm:block">Datos de demostración</span>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-10">
        {phase === 1 && <Fase1 onNext={() => setPhase(2)} />}
        {phase === 2 && <Fase2 onNext={() => setPhase(3)} />}
        {phase === 3 && <Fase3 onNext={() => setPhase(4)} />}
        {phase === 4 && <Fase4 onNext={() => setPhase(5)} />}
        {phase === 5 && <Fase5 onNext={() => setPhase(6)} />}
        {phase === 6 && <Fase6 />}
      </div>

      <div className="border-t border-gray-800 mt-16 py-6">
        <div className="max-w-5xl mx-auto px-6 text-center text-gray-700 text-xs">
          © 2025 LICIT-IA · Datos de demostración · No constituye asesoría jurídica
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Verificar TypeScript** (los imports van a fallar hasta crear los componentes — está bien si el error es solo "module not found")

```bash
cd /Users/maramire2001/Desktop/LICIT-AI/frontend && npx tsc --noEmit 2>&1 | grep -v "Cannot find module" | head -10
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/demo/_data.ts \
  frontend/src/app/demo/_components/ScoreRing.tsx \
  frontend/src/app/demo/page.tsx
git commit -m "feat: demo shell, data constants, ScoreRing component"
```

---

## Task 3: Fase 1 — Interrogatorio ADN

**Files:**
- Create: `frontend/src/app/demo/_components/Fase1.tsx`

- [ ] **Step 1: Crear `Fase1.tsx`**

Crear `frontend/src/app/demo/_components/Fase1.tsx`:

```tsx
"use client"
import { useState } from "react"
import { DISCLAIMER_CORTO } from "../_data"

const ESPECIALIDADES = [
  { id: "seguridad", label: "🔒 Seguridad Privada" },
  { id: "limpieza", label: "🧹 Limpieza y Mantenimiento" },
  { id: "construccion", label: "🏗️ Construcción e Infraestructura" },
  { id: "ti", label: "💻 Tecnologías de la Información" },
  { id: "salud", label: "🏥 Salud y Farmacéutica" },
  { id: "otros", label: "⋯ Otros" },
]

const COBERTURAS = [
  { id: "nacional", label: "🌎 Nacional" },
  { id: "centro", label: "🏙️ Zona Centro (CDMX y Edomex)" },
  { id: "norte", label: "🏜️ Zona Norte" },
  { id: "occidente", label: "🌊 Occidente (Jalisco, Colima, Nayarit)" },
  { id: "sureste", label: "🌿 Sureste (Oaxaca, Chiapas, Yucatán)" },
  { id: "otros", label: "⋯ Otros" },
]

const RANGOS = [
  { id: "5m", label: "💰 Menos de $5M MXN" },
  { id: "20m", label: "💰💰 $5M – $20M MXN" },
  { id: "100m", label: "💰💰💰 $20M – $100M MXN" },
  { id: "100m+", label: "💰💰💰💰 $100M+ MXN" },
  { id: "otros", label: "⋯ Otro rango" },
]

const ACREDITACIONES = [
  { id: "repse", label: "✅ REPSE (STPS)" },
  { id: "iso9001", label: "✅ ISO 9001:2015" },
  { id: "iso27001", label: "ISO 27001" },
  { id: "esr", label: "ESR (Empresa Socialmente Responsable)" },
  { id: "pyme", label: "Programa PyME (SE)" },
  { id: "otros", label: "⋯ Otros" },
]

const INSTITUCIONES = [
  { id: "imss", label: "🏥 IMSS", tag: "CompraNet", disabled: false },
  { id: "issste", label: "🏥 ISSSTE", tag: "CompraNet", disabled: false },
  { id: "sedena", label: "🪖 SEDENA", tag: "CompraNet", disabled: false },
  { id: "capufe", label: "🛣️ CAPUFE", tag: "CompraNet", disabled: false },
  { id: "aifa", label: "✈️ AIFA / ASA", tag: "CompraNet", disabled: false },
  { id: "federal", label: "🏛️ Gobierno Federal", tag: "CompraNet", disabled: false },
  { id: "pemex", label: "⛽ PEMEX", tag: "Próximamente", disabled: true },
  { id: "cfe", label: "⚡ CFE", tag: "Próximamente", disabled: true },
  { id: "estados", label: "🏙️ Estados y Municipios", tag: "CompraNet (parcial)", disabled: false },
]

export function Fase1({ onNext }: { onNext: () => void }) {
  const [especialidad, setEspecialidad] = useState("seguridad")
  const [cobertura, setCobertura] = useState<string[]>(["nacional"])
  const [rango, setRango] = useState("100m+")
  const [acreditaciones, setAcreditaciones] = useState<string[]>(["repse", "iso9001"])
  const [instituciones, setInstituciones] = useState<string[]>(["imss"])

  function toggleSet(set: string[], val: string, setter: (v: string[]) => void) {
    setter(set.includes(val) ? set.filter(x => x !== val) : [...set, val])
  }

  const selected = (val: string, set: string[]) =>
    set.includes(val)
      ? "bg-blue-900/40 border-blue-500 text-blue-300"
      : "bg-gray-900 border-gray-700 text-gray-400 hover:border-gray-600"

  const selectedRadio = (val: string, current: string) =>
    val === current
      ? "bg-blue-900/40 border-blue-500 text-blue-300"
      : "bg-gray-900 border-gray-700 text-gray-400 hover:border-gray-600"

  return (
    <div>
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/30 rounded-full px-4 py-1.5 mb-4">
          <span className="text-blue-400 text-sm font-bold">⚡ LICIT-IA · Configuración Express</span>
        </div>
        <h1 className="text-3xl font-black text-white mb-2">¿Quién es tu empresa?</h1>
        <p className="text-gray-500 text-sm">5 preguntas · menos de 60 segundos · tu Radar queda listo al instante</p>
      </div>

      <div className="grid sm:grid-cols-2 gap-5 mb-5">
        {/* 01 Especialidad */}
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4">
          <div className="text-blue-400 text-xs font-bold tracking-widest uppercase mb-1">01 · Especialidad</div>
          <p className="text-gray-300 text-sm mb-3">¿Cuál es la línea de negocio principal?</p>
          <div className="flex flex-col gap-2">
            {ESPECIALIDADES.map(e => (
              <button
                key={e.id}
                onClick={() => setEspecialidad(e.id)}
                className={`text-left px-3 py-2 rounded-lg border text-sm transition-all ${selectedRadio(e.id, especialidad)}`}
              >
                {e.label}
              </button>
            ))}
          </div>
        </div>

        {/* 02 Cobertura */}
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4">
          <div className="text-blue-400 text-xs font-bold tracking-widest uppercase mb-1">02 · Cobertura</div>
          <p className="text-gray-300 text-sm mb-3">¿En qué zonas tienen capacidad real?</p>
          <div className="flex flex-col gap-2">
            {COBERTURAS.map(c => (
              <button
                key={c.id}
                onClick={() => toggleSet(cobertura, c.id, setCobertura)}
                className={`text-left px-3 py-2 rounded-lg border text-sm transition-all ${selected(c.id, cobertura)}`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        {/* 03 Rango */}
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4">
          <div className="text-blue-400 text-xs font-bold tracking-widest uppercase mb-1">03 · Rango Financiero</div>
          <p className="text-gray-300 text-sm mb-3">¿Cuál es su techo por contrato?</p>
          <div className="flex flex-col gap-2">
            {RANGOS.map(r => (
              <button
                key={r.id}
                onClick={() => setRango(r.id)}
                className={`text-left px-3 py-2 rounded-lg border text-sm transition-all ${selectedRadio(r.id, rango)}`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {/* 04 Acreditaciones */}
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4">
          <div className="text-blue-400 text-xs font-bold tracking-widest uppercase mb-1">04 · Acreditaciones</div>
          <p className="text-gray-300 text-sm mb-3">¿Qué registros tienen vigentes?</p>
          <div className="flex flex-col gap-2">
            {ACREDITACIONES.map(a => (
              <button
                key={a.id}
                onClick={() => toggleSet(acreditaciones, a.id, setAcreditaciones)}
                className={`text-left px-3 py-2 rounded-lg border text-sm transition-all ${selected(a.id, acreditaciones)}`}
              >
                {a.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 05 Instituciones */}
      <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4 mb-5">
        <div className="text-blue-400 text-xs font-bold tracking-widest uppercase mb-1">05 · Instituciones Prioritarias</div>
        <p className="text-gray-300 text-sm mb-3">
          ¿Qué dependencias son críticas? <span className="text-gray-600">(puedes seleccionar varias)</span>
        </p>
        <div className="grid grid-cols-3 gap-2">
          {INSTITUCIONES.map(inst => (
            <button
              key={inst.id}
              disabled={inst.disabled}
              onClick={() => !inst.disabled && toggleSet(instituciones, inst.id, setInstituciones)}
              className={`text-left px-3 py-2 rounded-lg border text-sm transition-all ${
                inst.disabled
                  ? "border-gray-800 text-gray-700 cursor-not-allowed opacity-40"
                  : selected(inst.id, instituciones)
              }`}
            >
              <div>{inst.label}</div>
              <div className={`text-xs mt-0.5 ${inst.disabled ? "text-gray-700" : "text-blue-600"}`}>
                {inst.tag}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Escape hatch */}
      <div className="bg-yellow-950/30 border border-yellow-800/40 rounded-xl p-4 mb-6 flex items-center gap-4">
        <span className="text-2xl">📂</span>
        <div className="flex-1">
          <div className="text-yellow-400 text-sm font-bold">¿Tienes una convocatoria que no aparece aquí?</div>
          <div className="text-yellow-800 text-xs mt-0.5">Súbela directamente — la analizamos al instante y armamos tu expediente completo</div>
        </div>
      </div>

      <button
        onClick={onNext}
        className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-4 rounded-xl text-base transition-all shadow-lg shadow-blue-600/30 hover:shadow-blue-500/40"
      >
        ⚡ Activar mi Radar — Ver mis oportunidades →
      </button>

      <p className="text-center text-gray-700 text-xs mt-3">{DISCLAIMER_CORTO}</p>
    </div>
  )
}
```

- [ ] **Step 2: Verificar TypeScript**

```bash
cd /Users/maramire2001/Desktop/LICIT-AI/frontend && npx tsc --noEmit 2>&1 | grep "Fase1\|_data" | head -10
```

Expected: sin errores relacionados con Fase1 o _data.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/app/demo/_components/Fase1.tsx
git commit -m "feat: demo Fase1 interrogatorio ADN"
```

---

## Task 4: Fase 2 (Radar) + Fase 4 (Pago)

**Files:**
- Create: `frontend/src/app/demo/_components/Fase2.tsx`
- Create: `frontend/src/app/demo/_components/Fase4.tsx`

- [ ] **Step 1: Crear `Fase2.tsx` — Radar personalizado**

Crear `frontend/src/app/demo/_components/Fase2.tsx`:

```tsx
"use client"
import { DEMO_RADAR, fmt } from "../_data"

export function Fase2({ onNext }: { onNext: () => void }) {
  const matches = DEMO_RADAR.filter(l => l.match)
  const noMatch = DEMO_RADAR.filter(l => !l.match)

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-xs bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded-full px-3 py-0.5 font-semibold">
            ● Radar activo
          </span>
          <span className="text-xs text-gray-500">Seguridad · Nacional · $100M+ · IMSS</span>
        </div>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-black text-white">
            {DEMO_RADAR.length} oportunidades encontradas para tu perfil
          </h1>
          <div className="bg-gray-900 border border-gray-800 rounded-xl px-4 py-2 text-center">
            <div className="text-green-400 text-xl font-black">{matches.length}</div>
            <div className="text-gray-600 text-xs">con ADN match</div>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 mb-4">
        {matches.map((lic, i) => (
          <div
            key={lic.numero}
            className="bg-green-950/20 border border-green-800/50 rounded-xl p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-2 h-2 rounded-full bg-green-400 shrink-0" />
                  <span className="text-green-400 text-xs font-bold">ADN match</span>
                  <span className="text-gray-600 text-xs font-mono">{lic.numero}</span>
                </div>
                <div className="text-white font-bold text-sm mb-2">{lic.titulo}</div>
                <div className="flex gap-4 text-xs text-gray-400">
                  <span>🏛️ {lic.dependencia}</span>
                  <span>💰 {fmt(lic.monto)}</span>
                  <span>📅 {lic.apertura}</span>
                </div>
              </div>
              {i === 0 && (
                <button
                  onClick={onNext}
                  className="shrink-0 bg-green-700 hover:bg-green-600 text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors"
                >
                  ⚡ Me interesa — Analizar
                </button>
              )}
            </div>
          </div>
        ))}

        {noMatch.map(lic => (
          <div
            key={lic.numero}
            className="bg-gray-950 border border-gray-800/50 rounded-xl p-4 opacity-50"
          >
            <div className="flex items-start gap-3">
              <div className="flex-1">
                <div className="text-gray-600 text-xs font-mono mb-1">{lic.numero}</div>
                <div className="text-gray-500 text-sm mb-1">{lic.titulo}</div>
                <span className="text-xs text-gray-700">{lic.razon}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Escape hatch */}
      <div className="bg-yellow-950/20 border border-dashed border-yellow-800/40 rounded-xl p-4 flex items-center gap-4">
        <span className="text-xl">📂</span>
        <div className="flex-1">
          <div className="text-yellow-400 text-sm font-bold">¿Tienes una convocatoria que no aparece aquí?</div>
          <div className="text-yellow-900 text-xs">Súbela directamente — la analizamos al instante</div>
        </div>
        <button className="shrink-0 bg-yellow-950 text-yellow-500 border border-yellow-800 text-xs font-bold px-3 py-1.5 rounded-lg">
          Subir PDF
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Crear `Fase4.tsx` — Pago por complejidad**

Crear `frontend/src/app/demo/_components/Fase4.tsx`:

```tsx
"use client"
import { DEMO_LICITACION, fmt } from "../_data"

const NIVELES = [
  {
    id: "bronce", emoji: "🥉", label: "Bronce", sub: "Local · Simplificada",
    precio: 20_000, activo: false,
  },
  {
    id: "plata", emoji: "🥈", label: "Plata", sub: "Estatal · Descentralizada",
    precio: 30_000, activo: false,
  },
  {
    id: "oro", emoji: "🏆", label: "Oro", sub: "Federal · Alta complejidad",
    precio: 40_000, activo: true,
  },
]

const ENTREGABLES = [
  "Expediente completo para IMSS",
  "Vault inteligente — docs exactos",
  "PTW + 3 escenarios financieros",
  "ZIP listo para portal CompraNet",
]

export function Fase4({ onNext }: { onNext: () => void }) {
  const roi = Math.round(DEMO_LICITACION.monto / 40_000)

  return (
    <div>
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/30 rounded-full px-4 py-1.5 mb-4">
          <span className="text-yellow-400 text-sm font-bold">🏆 Licitación Nivel ORO — Federal · Alta complejidad</span>
        </div>
        <h1 className="text-2xl font-black text-white mb-2">¿Quieres concursar por este contrato?</h1>
        <p className="text-gray-500 text-sm">LICIT-IA construye tu expediente completo y listo para entrega al portal</p>
      </div>

      <div className="grid sm:grid-cols-3 gap-4 mb-6">
        {NIVELES.map(n => (
          <div
            key={n.id}
            className={`relative rounded-xl p-5 border-2 transition-all ${
              n.activo
                ? "bg-yellow-950/20 border-yellow-600"
                : "bg-gray-900/30 border-gray-800 opacity-50"
            }`}
          >
            {n.activo && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-yellow-600 text-white text-xs font-black px-3 py-0.5 rounded-full">
                TU NIVEL
              </div>
            )}
            <div className="text-center mb-4">
              <div className="text-3xl mb-1">{n.emoji}</div>
              <div className={`font-black text-lg ${n.activo ? "text-yellow-400" : "text-gray-500"}`}>{n.label}</div>
              <div className={`text-xs ${n.activo ? "text-yellow-700" : "text-gray-700"}`}>{n.sub}</div>
            </div>
            <div className="text-center mb-4">
              <div className={`text-3xl font-black ${n.activo ? "text-yellow-300" : "text-gray-600"}`}>
                ${n.precio.toLocaleString("es-MX")}
              </div>
              <div className={`text-xs ${n.activo ? "text-yellow-800" : "text-gray-700"}`}>MXN + IVA</div>
            </div>
            {n.activo ? (
              <>
                <div className="flex flex-col gap-2 mb-4">
                  {ENTREGABLES.map(e => (
                    <div key={e} className="flex items-center gap-2">
                      <span className="text-yellow-500 text-xs">✓</span>
                      <span className="text-yellow-700 text-xs">{e}</span>
                    </div>
                  ))}
                </div>
                <button
                  onClick={onNext}
                  className="w-full bg-yellow-600 hover:bg-yellow-500 text-white font-black py-2.5 rounded-lg text-sm transition-all"
                >
                  Concursar — Pagar $40,000 →
                </button>
              </>
            ) : (
              <div className="text-center text-gray-700 text-xs">No aplica para esta licitación</div>
            )}
          </div>
        ))}
      </div>

      {/* ROI */}
      <div className="bg-green-950/20 border border-green-800/30 rounded-xl p-4 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <span className="text-2xl">💡</span>
          <div>
            <div className="text-green-400 text-sm font-bold">¿Por qué vale la pena?</div>
            <div className="text-green-800 text-xs">
              El contrato vale <strong className="text-green-600">{fmt(DEMO_LICITACION.monto)}</strong> — nuestro fee es el{" "}
              <strong className="text-green-600">0.032%</strong> del total
            </div>
          </div>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl px-4 py-2 text-center shrink-0">
          <div className="text-green-400 text-xl font-black">{roi.toLocaleString("es-MX")}x</div>
          <div className="text-gray-600 text-xs">ROI si ganas</div>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Verificar TypeScript**

```bash
cd /Users/maramire2001/Desktop/LICIT-AI/frontend && npx tsc --noEmit 2>&1 | grep "Fase2\|Fase4" | head -10
```

Expected: sin errores.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/app/demo/_components/Fase2.tsx \
  frontend/src/app/demo/_components/Fase4.tsx
git commit -m "feat: demo Fase2 radar + Fase4 pago por complejidad"
```

---

## Task 5: Fase 3 — Anatomía Cinematográfica

**Files:**
- Create: `frontend/src/app/demo/_components/Fase3.tsx`

- [ ] **Step 1: Crear `Fase3.tsx`**

Crear `frontend/src/app/demo/_components/Fase3.tsx`:

```tsx
"use client"
import { useState, useEffect, useRef } from "react"
import { DEMO_LICITACION, DEMO_LOADER_STEPS, DEMO_MATRICES, DEMO_RED_FLAGS, fmt } from "../_data"
import { ScoreRing } from "./ScoreRing"

type LoadPhase = "loading" | "done"

export function Fase3({ onNext }: { onNext: () => void }) {
  const [loadPhase, setLoadPhase] = useState<LoadPhase>("loading")
  const [activeStep, setActiveStep] = useState(0)
  const [revealCount, setRevealCount] = useState(0)
  const [scoreActive, setScoreActive] = useState(false)

  // Sequencing the loader steps
  useEffect(() => {
    let elapsed = 300
    DEMO_LOADER_STEPS.forEach((step, i) => {
      setTimeout(() => setActiveStep(i + 1), elapsed)
      elapsed += step.dur
    })
    setTimeout(() => {
      setLoadPhase("done")
      // Reveal blocks one by one
      let delay = 200
      for (let i = 1; i <= 5; i++) {
        setTimeout(() => {
          setRevealCount(i)
          if (i === 2) setTimeout(() => setScoreActive(true), 200)
        }, delay)
        delay += 500
      }
    }, elapsed)
  }, [])

  const progress = loadPhase === "done" ? 100 : Math.round((activeStep / DEMO_LOADER_STEPS.length) * 100)

  if (loadPhase === "loading") {
    return (
      <div className="max-w-md mx-auto">
        <div className="bg-gray-900 border border-gray-700 rounded-2xl p-8 shadow-2xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-lg">⚡</div>
            <div>
              <div className="text-white font-bold text-sm">LICIT-IA · Análisis en curso</div>
              <div className="text-gray-500 text-xs truncate max-w-xs">{DEMO_LICITACION.numero}</div>
            </div>
          </div>

          <div className="space-y-3 mb-6">
            {DEMO_LOADER_STEPS.map((step, i) => {
              const isDone = activeStep > i + 1 || loadPhase === "done"
              const isActive = activeStep === i + 1
              return (
                <div
                  key={i}
                  className={`flex items-start gap-3 transition-all duration-300 ${activeStep < i + 1 ? "opacity-25" : "opacity-100"}`}
                >
                  <div className={`mt-0.5 w-4 h-4 rounded-full shrink-0 flex items-center justify-center text-xs transition-all ${
                    isDone ? "bg-emerald-500 text-white" : isActive ? "bg-blue-500 animate-pulse" : "bg-gray-700"
                  }`}>
                    {isDone ? "✓" : ""}
                  </div>
                  <span className={`text-sm leading-relaxed ${isDone ? "text-gray-500" : isActive ? "text-white" : "text-gray-600"}`}>
                    {step.label}
                  </span>
                </div>
              )
            })}
          </div>

          <div className="w-full bg-gray-800 rounded-full h-1.5">
            <div
              className="bg-blue-500 h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between mt-1.5">
            <span className="text-xs text-gray-600">Procesando bases…</span>
            <span className="text-xs text-gray-500">{progress}%</span>
          </div>
        </div>
      </div>
    )
  }

  // Results reveal
  return (
    <div className="space-y-5">
      {/* 1 — ROI Banner */}
      {revealCount >= 1 && (
        <div className="animate-in fade-in slide-in-from-bottom-2 bg-green-950/30 border border-green-700/50 rounded-xl p-4 flex items-center gap-4">
          <span className="text-3xl">⚡</span>
          <div>
            <div className="text-green-400 font-black text-sm">
              Análisis completado en {DEMO_LICITACION.roi_segundos} segundos
            </div>
            <div className="text-green-700 text-xs">
              Tu equipo habría tardado 72 horas ·{" "}
              <strong className="text-green-600">Ahorro operativo: ${DEMO_LICITACION.roi_ahorro.toLocaleString("es-MX")} MXN</strong>
            </div>
          </div>
        </div>
      )}

      {/* 2 — Score + Nivel */}
      {revealCount >= 2 && (
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 flex items-center gap-5">
            <ScoreRing score={DEMO_LICITACION.score} active={scoreActive} />
            <div>
              <div className="text-emerald-400 text-xs font-bold uppercase tracking-wider mb-1">Viabilidad</div>
              <div className="text-white text-xl font-black">Alta</div>
              <div className="text-gray-500 text-sm">3 puntos a atender</div>
            </div>
          </div>
          <div className="bg-yellow-950/20 border-2 border-yellow-600 rounded-xl p-5 text-center flex flex-col items-center justify-center">
            <div className="text-yellow-400 text-xs font-bold uppercase tracking-wider mb-2">Nivel de Complejidad</div>
            <div className="text-4xl mb-1">🏆</div>
            <div className="text-yellow-400 text-2xl font-black">ORO</div>
            <div className="text-yellow-800 text-xs">Federal · Alta complejidad</div>
          </div>
        </div>
      )}

      {/* 3 — Matrices */}
      {revealCount >= 3 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <div className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-4">Matrices de Requisitos</div>
          <div className="grid grid-cols-3 gap-3">
            {[
              { icon: "👥", label: "Humana", color: "text-blue-400", items: DEMO_MATRICES.humana },
              { icon: "📦", label: "Materiales", color: "text-purple-400", items: DEMO_MATRICES.materiales },
              { icon: "💰", label: "Financiera", color: "text-emerald-400", items: DEMO_MATRICES.financiera },
            ].map(m => (
              <div key={m.label} className="bg-gray-950 rounded-xl p-3 text-center">
                <div className="text-2xl mb-1">{m.icon}</div>
                <div className={`${m.color} text-xs font-bold mb-2`}>{m.label}</div>
                {m.items.map(item => (
                  <div key={item} className="text-gray-500 text-xs mb-1 leading-tight">{item}</div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4 — Red flags */}
      {revealCount >= 4 && (
        <div className="bg-red-950/20 border border-red-900/50 rounded-xl p-5">
          <div className="text-red-400 text-xs font-bold uppercase tracking-wider mb-3">
            ⚑ {DEMO_RED_FLAGS.length} Puntos Críticos Detectados
          </div>
          <div className="space-y-2">
            {DEMO_RED_FLAGS.map((f, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="shrink-0 text-sm">{f.nivel === "alto" ? "🔴" : "🟡"}</span>
                <span className={`text-xs leading-relaxed ${f.nivel === "alto" ? "text-red-300" : "text-yellow-300"}`}>
                  {f.texto}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5 — CTA */}
      {revealCount >= 5 && (
        <button
          onClick={onNext}
          className="w-full bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-500 hover:to-yellow-400 text-white font-black py-4 rounded-xl text-base transition-all shadow-lg shadow-yellow-600/30"
        >
          🏆 Esta licitación es Nivel ORO — Ver precio y concursar →
        </button>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verificar TypeScript**

```bash
cd /Users/maramire2001/Desktop/LICIT-AI/frontend && npx tsc --noEmit 2>&1 | grep "Fase3\|ScoreRing" | head -10
```

Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/app/demo/_components/Fase3.tsx
git commit -m "feat: demo Fase3 anatomia cinematografica con loader y reveal"
```

---

## Task 6: Fase 5 (Vault) + Fase 6 (Expediente Final)

**Files:**
- Create: `frontend/src/app/demo/_components/Fase5.tsx`
- Create: `frontend/src/app/demo/_components/Fase6.tsx`

- [ ] **Step 1: Crear `Fase5.tsx` — Vault inteligente**

Crear `frontend/src/app/demo/_components/Fase5.tsx`:

```tsx
"use client"
import { useState } from "react"
import { DEMO_DOCS } from "../_data"

type DocEstado = "ok" | "flag" | "falta"

export function Fase5({ onNext }: { onNext: () => void }) {
  const [estados, setEstados] = useState<Record<string, DocEstado>>(
    Object.fromEntries(DEMO_DOCS.map(d => [d.id, d.estado]))
  )

  function simularSubida(id: string) {
    setEstados(prev => ({ ...prev, [id]: "ok" }))
  }

  const total = DEMO_DOCS.length
  const cubiertos = Object.values(estados).filter(e => e === "ok").length
  const pct = Math.round((cubiertos / total) * 100)
  const listo = pct === 100

  return (
    <div>
      <div className="bg-green-950/20 border border-green-700/40 rounded-xl p-4 mb-5 flex items-start gap-3">
        <span className="text-2xl shrink-0">🤖</span>
        <div>
          <div className="text-green-400 text-sm font-bold mb-1">LICIT-IA analizó el Anexo Técnico de la convocatoria</div>
          <div className="text-green-700 text-xs leading-relaxed">
            Para cumplir con los puntos <strong className="text-green-600">3.1, 4.2 y 6.8</strong> de las bases del IMSS,
            necesitas subir los siguientes documentos. Cada uno es obligatorio para no ser descalificado.
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2 mb-5">
        {DEMO_DOCS.map(doc => {
          const est = estados[doc.id]
          return (
            <div
              key={doc.id}
              className={`rounded-xl p-3.5 border flex items-center gap-3 transition-all ${
                est === "ok"
                  ? "bg-green-950/20 border-green-800/50"
                  : est === "flag"
                  ? "bg-yellow-950/20 border-yellow-700/50"
                  : "bg-red-950/20 border-red-900/40 border-dashed"
              }`}
            >
              <div className={`w-7 h-7 rounded-lg shrink-0 flex items-center justify-center text-xs font-bold ${
                est === "ok" ? "bg-green-700 text-white" :
                est === "flag" ? "bg-yellow-700 text-white" :
                "bg-red-900 text-red-300"
              }`}>
                {est === "ok" ? "✓" : est === "flag" ? "⚑" : "✗"}
              </div>
              <div className="flex-1 min-w-0">
                <div className={`text-sm font-semibold truncate ${
                  est === "ok" ? "text-green-300" :
                  est === "flag" ? "text-yellow-300" : "text-red-300"
                }`}>
                  {doc.label}
                </div>
                <div className={`text-xs mt-0.5 ${
                  est === "ok" ? "text-gray-600" :
                  est === "flag" ? "text-yellow-800" : "text-red-900"
                }`}>
                  {doc.nota}
                </div>
              </div>
              {(est === "flag" || est === "falta") && (
                <button
                  onClick={() => simularSubida(doc.id)}
                  className={`shrink-0 text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${
                    est === "flag"
                      ? "bg-yellow-900 text-yellow-400 hover:bg-yellow-800"
                      : "bg-red-900 text-red-300 hover:bg-red-800"
                  }`}
                >
                  {est === "flag" ? "Actualizar" : "Subir PDF"}
                </button>
              )}
            </div>
          )
        })}
      </div>

      {/* Barra de progreso */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 mb-5">
        <div className="flex justify-between mb-2">
          <span className="text-gray-400 text-sm">Cobertura documental</span>
          <span className={`text-sm font-bold ${listo ? "text-green-400" : "text-yellow-400"}`}>
            {pct}% · {cubiertos} de {total} documentos listos
          </span>
        </div>
        <div className="bg-gray-800 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-500 ${listo ? "bg-green-500" : "bg-yellow-500"}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        {!listo && (
          <p className="text-gray-600 text-xs mt-2">
            Sube los {total - cubiertos} documentos faltantes para habilitar la generación del expediente
          </p>
        )}
      </div>

      <button
        onClick={onNext}
        disabled={!listo}
        className={`w-full font-black py-4 rounded-xl text-base transition-all ${
          listo
            ? "bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white shadow-lg shadow-emerald-600/30"
            : "bg-gray-800 text-gray-600 cursor-not-allowed"
        }`}
      >
        📦 Generar mi Expediente de Propuesta →
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Crear `Fase6.tsx` — Expediente final**

Crear `frontend/src/app/demo/_components/Fase6.tsx`:

```tsx
"use client"
import { DEMO_LICITACION, DEMO_COMPETIDORES, DISCLAIMER_COMPLETO, fmt } from "../_data"

const ZIP_ARCHIVOS = [
  { nombre: "portada.txt", nota: "Empresa · RFC · Versión · Aviso legal" },
  { nombre: "01_checklist_cumplimiento.txt", nota: "5/5 documentos cubiertos" },
  { nombre: "02_propuesta_tecnica.txt", nota: "Borrador IA revisado" },
  { nombre: "03_propuesta_economica.txt", nota: `PTW Óptimo ${fmt(DEMO_LICITACION.ptw_optimo)}` },
  { nombre: "04_pendientes.txt", nota: "Todo en orden · 100%" },
]

const PTW = [
  { label: "Agresivo", sub: "Mayor probabilidad", monto: DEMO_LICITACION.ptw_agresivo, margen: 8, recomendado: false, color: "border-blue-800 bg-blue-950/20", badge: "bg-blue-900/40 text-blue-300" },
  { label: "Óptimo", sub: "Balance riesgo-margen", monto: DEMO_LICITACION.ptw_optimo, margen: 12, recomendado: true, color: "border-emerald-600 bg-emerald-950/20", badge: "bg-emerald-900/40 text-emerald-300" },
  { label: "Conservador", sub: "Margen seguro", monto: DEMO_LICITACION.ptw_conservador, margen: 15, recomendado: false, color: "border-gray-700 bg-gray-900/30", badge: "bg-gray-800 text-gray-400" },
]

export function Fase6() {
  return (
    <div className="space-y-6">
      {/* War Room */}
      <div>
        <h2 className="text-lg font-bold text-white mb-1">War Room · Inteligencia Competitiva</h2>
        <p className="text-gray-500 text-sm mb-4">
          Basado en <strong className="text-gray-400">29 adjudicaciones reales</strong> del IMSS en servicios de seguridad (CompraNet 2020–2025)
        </p>
        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-gray-500 text-xs uppercase tracking-wide">
                <th className="text-left px-5 py-3">Competidor</th>
                <th className="text-center px-4 py-3 hidden sm:table-cell">Contratos</th>
                <th className="text-center px-4 py-3 hidden md:table-cell">Monto prom.</th>
                <th className="text-center px-4 py-3">Historial</th>
              </tr>
            </thead>
            <tbody>
              {DEMO_COMPETIDORES.map((c, i) => (
                <tr key={i} className="border-b border-gray-800/50 last:border-0">
                  <td className="px-5 py-4">
                    <div className="text-white font-semibold text-sm">{c.nombre}</div>
                    <div className="text-gray-600 text-xs mt-0.5">{c.debilidad}</div>
                  </td>
                  <td className="text-center px-4 py-4 hidden sm:table-cell">
                    <span className={`font-bold ${i === 0 ? "text-red-400" : i === 1 ? "text-orange-400" : "text-yellow-400"}`}>
                      {c.contratos}
                    </span>
                  </td>
                  <td className="text-center px-4 py-4 text-gray-400 hidden md:table-cell">{c.monto}</td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2 justify-center">
                      <div className="w-16 bg-gray-800 rounded-full h-1.5">
                        <div
                          className={`h-1.5 rounded-full ${i === 0 ? "bg-red-400" : i === 1 ? "bg-orange-400" : "bg-yellow-400"}`}
                          style={{ width: `${c.bar}%` }}
                        />
                      </div>
                      <span className={`text-xs font-bold ${i === 0 ? "text-red-400" : i === 1 ? "text-orange-400" : "text-yellow-400"}`}>
                        {c.bar}%
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* PTW */}
      <div>
        <h2 className="text-lg font-bold text-white mb-1">Price to Win · 3 Escenarios</h2>
        <p className="text-gray-500 text-sm mb-4">Calculado sobre comportamiento histórico de precios en el IMSS</p>
        <div className="grid sm:grid-cols-3 gap-4">
          {PTW.map(e => (
            <div key={e.label} className={`relative border-2 rounded-2xl p-5 ${e.color}`}>
              {e.recomendado && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-600 text-white text-xs font-black px-3 py-0.5 rounded-full whitespace-nowrap">
                  ★ Recomendado
                </div>
              )}
              <div className="text-gray-400 text-xs mb-0.5">{e.sub}</div>
              <div className={`text-lg font-black mb-2 ${e.recomendado ? "text-white" : "text-gray-300"}`}>{e.label}</div>
              <div className={`text-2xl font-black mb-1 ${e.recomendado ? "text-emerald-400" : "text-gray-300"}`}>
                {fmt(e.monto)}
              </div>
              <span className={`text-xs font-semibold rounded-full px-2.5 py-0.5 ${e.badge}`}>
                Margen {e.margen}%
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ZIP final */}
      <div className="bg-green-950/20 border border-green-700/40 rounded-2xl overflow-hidden">
        <div className="p-5 border-b border-green-900/30">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-green-700/30 border border-green-600/40 rounded-xl flex items-center justify-center text-2xl">
              📦
            </div>
            <div>
              <div className="text-white font-black text-base">Expediente listo para entrega</div>
              <div className="text-green-400 text-sm">{DEMO_LICITACION.numero} · Nivel ORO · v1</div>
            </div>
          </div>
        </div>

        <div className="p-5 space-y-2">
          {ZIP_ARCHIVOS.map(a => (
            <div key={a.nombre} className="flex items-center justify-between bg-green-950/30 rounded-lg px-3 py-2">
              <span className="text-green-300 text-xs font-mono">📄 {a.nombre}</span>
              <span className="text-green-600 text-xs ml-3">✓ {a.nota}</span>
            </div>
          ))}
        </div>

        <div className="px-5 pb-5">
          <p className="text-xs text-gray-600 leading-relaxed mb-3">{DISCLAIMER_COMPLETO}</p>
          <button className="w-full bg-gradient-to-r from-green-700 to-green-600 hover:from-green-600 hover:to-green-500 text-white font-black py-4 rounded-xl text-base transition-all shadow-lg shadow-green-700/30">
            ⬇ Descargar expediente_IMSS0GYR.zip
          </button>
        </div>
      </div>

      {/* Mensaje final */}
      <div className="text-center py-6 border border-gray-800 rounded-2xl bg-gray-900/30">
        <div className="text-4xl mb-3">🏆</div>
        <div className="text-white text-xl font-black mb-2">Tu propuesta está lista para CompraNet</div>
        <div className="text-gray-500 text-sm">
          De 0 a expediente completo en menos de 10 minutos.<br />
          Tu equipo habría tardado 3 semanas.
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Verificar TypeScript completo**

```bash
cd /Users/maramire2001/Desktop/LICIT-AI/frontend && npx tsc --noEmit 2>&1 | head -15
```

Expected: sin errores.

- [ ] **Step 4: Verificar que el dev server levanta**

```bash
cd /Users/maramire2001/Desktop/LICIT-AI/frontend && npm run dev 2>&1 | head -10
```

Expected: `Ready in ...ms` sin errores de compilación.

- [ ] **Step 5: Commit final**

```bash
git add frontend/src/app/demo/_components/Fase5.tsx \
  frontend/src/app/demo/_components/Fase6.tsx
git commit -m "feat: demo Fase5 vault inteligente + Fase6 expediente final"
```

---

## Self-Review

**Spec coverage:**
- ✅ Fase 1 — Interrogatorio ADN: 5 preguntas, radio/checkbox, todas opciones visibles, instituciones honestas con "Próximamente", escape hatch, disclaimer corto, CTA
- ✅ Fase 2 — Radar: 3 cards match verde, 2 grises, escape hatch amarillo, CTA en card 1
- ✅ Fase 3 — Anatomía: loader secuencial 6 pasos, reveal 5 bloques (ROI, Score+ORO, Matrices, Red flags, CTA dorado)
- ✅ Fase 4 — Pago: Bronce/Plata griseados, ORO activo + "TU NIVEL", ROI calculator, CTA
- ✅ Fase 5 — Vault: lista ✓/⚑/✗, simulación de subida (click → ok), barra progreso, botón se habilita al 100%
- ✅ Fase 6 — Expediente: War Room, PTW 3 escenarios, ZIP 5 archivos, disclaimer completo, mensaje final
- ✅ App alignment: disclaimer en portada.txt (backend), expediente page, vault page
- ✅ ROI exacto: $25,200 MXN / 180 segundos (tomado de `ROI_FIJO` del servicio)
- ✅ Top bar con pills de progreso mostrando fase actual
- ✅ PEMEX/CFE desactivados con "Próximamente"

**Type consistency:**
- `Phase = 1 | 2 | 3 | 4 | 5 | 6` definido en `page.tsx` y usado en todas las fases vía prop `onNext: () => void`
- `DocEstado = "ok" | "flag" | "falta"` definido en `_data.ts` y consistente en `Fase5.tsx`
- `fmt()` exportado de `_data.ts` y usado en Fase4, Fase6
- `DISCLAIMER_COMPLETO` y `DISCLAIMER_CORTO` exportados de `_data.ts`, usados en Fase1 y Fase6
