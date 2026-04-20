# Pago por Transferencia (Pre-Stripe) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Gate el acceso al expediente detrás de un cobro por transferencia SPEI, con datos bancarios, flujo de confirmación del cliente, y panel de admin para activar el acceso manualmente.

**Architecture:** (1) Migración agrega `pago_status` y `pago_monto` a `analisis`. (2) Nuevo router `/api/pagos` expone info de pago, endpoint para que el cliente notifique transferencia, y endpoint de admin para confirmar. (3) Frontend: página de pago `/pago/[id]`, redirección desde PanelDecision, gate en expediente, y panel admin `/admin/pagos`. (4) Admin se identifica por email contra env var `ADMIN_EMAIL`.

**Tech Stack:** FastAPI, SQLAlchemy async, Alembic, Next.js 16 + TailwindCSS 4.

---

## Precios por nivel

```
Bronce: $20,000 MXN (radar/miembro) / $40,000 MXN (directo)
Plata:  $30,000 MXN (radar/miembro) / $50,000 MXN (directo)
Oro:    $40,000 MXN (radar/miembro) / $60,000 MXN (directo)
```

## Variables de entorno requeridas (backend)

Agregar a `backend/.env`:
```
ADMIN_EMAIL=marioantonioramirezbarajas@gmail.com
BANK_CLABE=<tu CLABE de 18 dígitos>
BANK_NOMBRE=<nombre del banco, ej. BBVA>
BANK_TITULAR=<nombre del titular de la cuenta>
```

## Flujo completo

```
PanelDecision CTA → /pago/[analisis_id]
  → muestra monto + CLABE + referencia
  → "Ya transferí" → POST /api/pagos/notificar/{id} → pago_status='en_revision'
  → muestra "En revisión, confirmaremos en breve"
  → admin ve lista en /admin/pagos
  → admin confirma → POST /api/pagos/confirmar/{id} → pago_status='confirmado'
  → usuario puede acceder a /expediente/[id]
```

## Mapa de archivos

| Archivo | Acción | Responsabilidad |
|---|---|---|
| `backend/alembic/versions/004_pago_status.py` | Crear | Migración — agrega pago_status, pago_monto |
| `backend/app/models/analisis.py` | Modificar | Añadir campos pago_status, pago_monto |
| `backend/app/schemas/analisis.py` | Modificar | Exponer pago_status en AnalisisResponse |
| `backend/app/api/pagos.py` | Crear | Router con info, notificar, confirmar, pendientes |
| `backend/app/main.py` | Modificar | Registrar pagos router |
| `frontend/src/types/index.ts` | Modificar | Añadir pago_status a tipo Analisis |
| `frontend/src/lib/api.ts` | Modificar | Añadir métodos pagos.* |
| `frontend/src/app/(app)/pago/[id]/page.tsx` | Crear | Página de pago SPEI |
| `frontend/src/components/analisis/PanelDecision.tsx` | Modificar | CTA → /pago/[id] |
| `frontend/src/app/(app)/expediente/[id]/page.tsx` | Modificar | Gate: redirect si no confirmado |
| `frontend/src/app/(app)/admin/pagos/page.tsx` | Crear | Panel admin — lista + confirmar |

---

## Task 1: Migración + Modelo + Schema

**Files:**
- Create: `backend/alembic/versions/004_pago_status.py`
- Modify: `backend/app/models/analisis.py`
- Modify: `backend/app/schemas/analisis.py`

- [ ] **Step 1: Crear el archivo de migración**

```python
# backend/alembic/versions/004_pago_status.py
"""add pago_status and pago_monto to analisis

Revision ID: 004
Revises: 003
Create Date: 2026-04-18
"""
from alembic import op
import sqlalchemy as sa

revision = "004"
down_revision = "003"
branch_labels = None
depends_on = None

def upgrade():
    op.add_column(
        "analisis",
        sa.Column(
            "pago_status",
            sa.String(20),
            nullable=False,
            server_default=sa.text("'pendiente'"),
        ),
    )
    op.add_column(
        "analisis",
        sa.Column("pago_monto", sa.Numeric, nullable=True),
    )

def downgrade():
    op.drop_column("analisis", "pago_monto")
    op.drop_column("analisis", "pago_status")
```

- [ ] **Step 2: Correr la migración**

```bash
docker exec licit-ai-backend-1 alembic upgrade head
```

Salida esperada: `Running upgrade 003 -> 004, add pago_status and pago_monto to analisis`

- [ ] **Step 3: Añadir campos al modelo Analisis**

En `backend/app/models/analisis.py`, agregar después de `roi_datos`:

```python
    pago_status: Mapped[str] = mapped_column(String(20), default="pendiente")
    pago_monto: Mapped[float | None] = mapped_column(Numeric, nullable=True)
```

El import de `Numeric` ya existe en el archivo — verificar antes de agregar.

- [ ] **Step 4: Exponer pago_status en AnalisisResponse**

En `backend/app/schemas/analisis.py`, añadir después de `roi_datos`:

```python
    pago_status: str = "pendiente"
```

El campo completo queda:

```python
class AnalisisResponse(BaseModel):
    id: uuid.UUID
    licitacion_id: uuid.UUID
    status: str
    viabilidad: str | None
    score_viabilidad: float | None
    modelo_evaluacion_detectado: str | None
    requisitos_criticos: dict | None = None
    riesgos: dict | None = None
    price_to_win_conservador: float | None = None
    ptw_optimo: float | None = None
    ptw_agresivo: float | None = None
    competidores: dict | None = None
    nivel_complejidad: str | None = None
    matriz_humana: dict | None = None
    matriz_materiales: dict | None = None
    matriz_financiera: dict | None = None
    roi_datos: dict | None = None
    pago_status: str = "pendiente"
    created_at: datetime

    model_config = {"from_attributes": True}
```

- [ ] **Step 5: Verificar**

```bash
docker exec licit-ai-backend-1 python -c "
from app.models.analisis import Analisis
from app.schemas.analisis import AnalisisResponse
print('modelo OK:', hasattr(Analisis, 'pago_status'))
print('schema OK:', 'pago_status' in AnalisisResponse.model_fields)
"
```

Salida esperada:
```
modelo OK: True
schema OK: True
```

- [ ] **Step 6: Commit**

```bash
git add backend/alembic/versions/004_pago_status.py backend/app/models/analisis.py backend/app/schemas/analisis.py
git commit -m "feat: add pago_status and pago_monto fields to analisis - payment gate foundation"
```

---

## Task 2: Backend — Router `/api/pagos`

**Files:**
- Create: `backend/app/api/pagos.py`
- Modify: `backend/app/main.py`

- [ ] **Step 1: Crear `backend/app/api/pagos.py`**

```python
import os
import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.core.auth import get_current_user
from app.models.company import User, Company
from app.models.analisis import Analisis

router = APIRouter()

PRECIOS = {
    "bronce": {"radar": 20_000, "directo": 40_000},
    "plata":  {"radar": 30_000, "directo": 50_000},
    "oro":    {"radar": 40_000, "directo": 60_000},
}

def _calcular_monto(nivel: str, tipo_plan: str) -> int:
    nivel_key = (nivel or "bronce").lower()
    plan_key = tipo_plan if tipo_plan in ("radar", "directo") else "directo"
    return PRECIOS.get(nivel_key, PRECIOS["bronce"])[plan_key]

def _is_admin(user: User) -> bool:
    admin_email = os.getenv("ADMIN_EMAIL", "")
    return user.email == admin_email


@router.get("/info/{analisis_id}")
async def info_pago(
    analisis_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Devuelve monto, datos bancarios y estado de pago para un análisis."""
    result = await db.execute(
        select(Analisis).where(
            Analisis.id == analisis_id,
            Analisis.company_id == current_user.company_id,
        )
    )
    analisis = result.scalar_one_or_none()
    if not analisis:
        raise HTTPException(404, "Análisis no encontrado")

    company_result = await db.execute(
        select(Company).where(Company.id == current_user.company_id)
    )
    company = company_result.scalar_one_or_none()
    tipo_plan = company.tipo_plan if company else "directo"

    monto = _calcular_monto(analisis.nivel_complejidad, tipo_plan)

    return {
        "analisis_id": str(analisis_id),
        "nivel_complejidad": analisis.nivel_complejidad or "bronce",
        "tipo_plan": tipo_plan,
        "monto": monto,
        "pago_status": analisis.pago_status,
        "referencia": str(analisis_id)[:8].upper(),
        "banco": os.getenv("BANK_NOMBRE", "BBVA"),
        "clabe": os.getenv("BANK_CLABE", ""),
        "titular": os.getenv("BANK_TITULAR", ""),
    }


@router.post("/notificar/{analisis_id}")
async def notificar_transferencia(
    analisis_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """El cliente confirma que ya realizó la transferencia."""
    result = await db.execute(
        select(Analisis).where(
            Analisis.id == analisis_id,
            Analisis.company_id == current_user.company_id,
        )
    )
    analisis = result.scalar_one_or_none()
    if not analisis:
        raise HTTPException(404, "Análisis no encontrado")
    if analisis.pago_status == "confirmado":
        return {"status": "confirmado"}

    company_result = await db.execute(
        select(Company).where(Company.id == current_user.company_id)
    )
    company = company_result.scalar_one_or_none()
    tipo_plan = company.tipo_plan if company else "directo"
    monto = _calcular_monto(analisis.nivel_complejidad, tipo_plan)

    analisis.pago_status = "en_revision"
    analisis.pago_monto = monto
    await db.commit()
    return {"status": "en_revision", "monto": monto}


@router.post("/confirmar/{analisis_id}")
async def confirmar_pago(
    analisis_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Admin confirma el pago y desbloquea el expediente."""
    if not _is_admin(current_user):
        raise HTTPException(403, "Solo el administrador puede confirmar pagos")

    result = await db.execute(
        select(Analisis).where(Analisis.id == analisis_id)
    )
    analisis = result.scalar_one_or_none()
    if not analisis:
        raise HTTPException(404, "Análisis no encontrado")

    analisis.pago_status = "confirmado"
    await db.commit()
    return {"status": "confirmado"}


@router.get("/pendientes")
async def listar_pendientes(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Admin: lista de análisis con pago en revisión."""
    if not _is_admin(current_user):
        raise HTTPException(403, "Solo el administrador puede ver pagos pendientes")

    result = await db.execute(
        select(Analisis).where(Analisis.pago_status == "en_revision")
    )
    analisis_list = result.scalars().all()

    return [
        {
            "analisis_id": str(a.id),
            "company_id": str(a.company_id),
            "nivel_complejidad": a.nivel_complejidad,
            "pago_monto": float(a.pago_monto) if a.pago_monto else None,
            "pago_status": a.pago_status,
            "created_at": a.created_at.isoformat(),
        }
        for a in analisis_list
    ]
```

- [ ] **Step 2: Registrar el router en `backend/app/main.py`**

Añadir después del import de `expediente`:
```python
from app.api import pagos
```

Añadir después de `app.include_router(expediente.router, ...)`:
```python
app.include_router(pagos.router, prefix="/api/pagos", tags=["pagos"])
```

- [ ] **Step 3: Verificar**

```bash
docker exec licit-ai-backend-1 python -c "from app.api.pagos import router; print('OK')"
```

- [ ] **Step 4: Probar endpoint info**

```bash
# Obtener un token válido de Supabase primero, luego:
curl -s http://localhost:8000/api/pagos/info/<un-analisis-uuid-real> \
  -H "Authorization: Bearer <token>" | python3 -m json.tool
```

Debe retornar JSON con `monto`, `clabe`, `banco`, `pago_status`.

- [ ] **Step 5: Commit**

```bash
git add backend/app/api/pagos.py backend/app/main.py
git commit -m "feat: add pagos router with info, notificar, confirmar, and pendientes endpoints"
```

---

## Task 3: Frontend — Tipos + API client

**Files:**
- Modify: `frontend/src/types/index.ts`
- Modify: `frontend/src/lib/api.ts`

- [ ] **Step 1: Añadir `pago_status` al tipo `Analisis` en `frontend/src/types/index.ts`**

Buscar la interfaz `Analisis` (o `AnalisisResponse`) y agregar el campo:

```typescript
pago_status?: string
```

El tipo completo debe incluir ese campo. Leer el archivo primero para ubicar la línea exacta. El campo va después de `roi_datos`.

- [ ] **Step 2: Añadir métodos `pagos.*` en `frontend/src/lib/api.ts`**

Agregar después del objeto `vault`:

```typescript
pagos: {
  info: (analisis_id: string) =>
    apiFetch<{
      analisis_id: string
      nivel_complejidad: string
      tipo_plan: string
      monto: number
      pago_status: string
      referencia: string
      banco: string
      clabe: string
      titular: string
    }>(`/api/pagos/info/${analisis_id}`),
  notificar: (analisis_id: string) =>
    apiFetch<{ status: string; monto?: number }>(`/api/pagos/notificar/${analisis_id}`, {
      method: "POST",
    }),
  confirmar: (analisis_id: string) =>
    apiFetch<{ status: string }>(`/api/pagos/confirmar/${analisis_id}`, {
      method: "POST",
    }),
  pendientes: () =>
    apiFetch<
      {
        analisis_id: string
        company_id: string
        nivel_complejidad: string
        pago_monto: number | null
        pago_status: string
        created_at: string
      }[]
    >("/api/pagos/pendientes"),
},
```

- [ ] **Step 3: TypeScript check**

```bash
cd /Users/maramire2001/Desktop/LICIT-AI/frontend && npx tsc --noEmit 2>&1 | head -20
```

Sin errores nuevos.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/types/index.ts frontend/src/lib/api.ts
git commit -m "feat: add pago_status type and pagos API client methods"
```

---

## Task 4: Frontend — Página de pago `/pago/[id]`

**Files:**
- Create: `frontend/src/app/(app)/pago/[id]/page.tsx`

- [ ] **Step 1: Crear el directorio**

```bash
mkdir -p /Users/maramire2001/Desktop/LICIT-AI/frontend/src/app/\(app\)/pago/\[id\]
```

- [ ] **Step 2: Crear `frontend/src/app/(app)/pago/[id]/page.tsx`**

```tsx
"use client"
export const dynamic = "force-dynamic"
import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { api } from "@/lib/api"
import Link from "next/link"

type PagoInfo = {
  analisis_id: string
  nivel_complejidad: string
  tipo_plan: string
  monto: number
  pago_status: string
  referencia: string
  banco: string
  clabe: string
  titular: string
}

const NIVEL_COLOR: Record<string, string> = {
  bronce: "text-amber-400 border-amber-700 bg-amber-950",
  plata:  "text-gray-300 border-gray-600 bg-gray-900",
  oro:    "text-yellow-400 border-yellow-700 bg-yellow-950",
}

function formatMXN(n: number) {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(n)
}

export default function PagoPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [info, setInfo] = useState<PagoInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [notificando, setNotificando] = useState(false)
  const [notificado, setNotificado] = useState(false)
  const [error, setError] = useState("")

  const fetchInfo = useCallback(async () => {
    try {
      const data = await api.pagos.info(params.id)
      setInfo(data)
      if (data.pago_status === "confirmado") {
        router.replace(`/expediente/${params.id}`)
      }
      if (data.pago_status === "en_revision") {
        setNotificado(true)
      }
    } catch {
      setError("No se pudo cargar la información de pago")
    } finally {
      setLoading(false)
    }
  }, [params.id, router])

  useEffect(() => {
    fetchInfo()
    // Polling cada 30s para detectar confirmación del admin
    const interval = setInterval(fetchInfo, 30_000)
    return () => clearInterval(interval)
  }, [fetchInfo])

  async function handleNotificar() {
    setNotificando(true)
    try {
      await api.pagos.notificar(params.id)
      setNotificado(true)
      setInfo((prev) => prev ? { ...prev, pago_status: "en_revision" } : prev)
    } catch {
      setError("Error al registrar tu notificación. Intenta de nuevo.")
    } finally {
      setNotificando(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-gray-500 text-sm">Cargando información de pago...</div>
      </div>
    )
  }

  if (error || !info) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 text-sm mb-4">{error}</p>
          <Link href="/dashboard" className="text-blue-400 text-sm hover:underline">← Volver al dashboard</Link>
        </div>
      </div>
    )
  }

  const nivelKey = (info.nivel_complejidad || "bronce").toLowerCase()
  const colorClass = NIVEL_COLOR[nivelKey] || NIVEL_COLOR.bronce

  return (
    <div className="min-h-screen bg-gray-950 p-6 flex items-center justify-center">
      <div className="w-full max-w-md space-y-5">

        {/* Header */}
        <div>
          <Link href="/dashboard" className="text-gray-500 text-xs hover:text-gray-300 transition-colors">
            ← Dashboard
          </Link>
          <h1 className="text-xl font-bold text-white mt-2">Acceso al Expediente</h1>
          <p className="text-gray-500 text-sm mt-1">
            Realiza tu transferencia para desbloquear el expediente completo
          </p>
        </div>

        {/* Nivel + Monto */}
        <div className={`border rounded-lg p-5 ${colorClass}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest opacity-70">
                Nivel {info.nivel_complejidad || "Bronce"}
              </p>
              <p className="text-3xl font-bold mt-1">{formatMXN(info.monto)}</p>
              <p className="text-xs opacity-60 mt-1">
                {info.tipo_plan === "radar" ? "Tarifa miembro Radar" : "Tarifa acceso directo"}
              </p>
            </div>
            <div className="text-4xl opacity-20">
              {nivelKey === "oro" ? "🏆" : nivelKey === "plata" ? "⚡" : "🔷"}
            </div>
          </div>
        </div>

        {/* Datos bancarios */}
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-5 space-y-4">
          <p className="text-white text-sm font-semibold">Datos para transferencia SPEI</p>

          <div className="space-y-3">
            <div>
              <p className="text-gray-500 text-xs">Banco</p>
              <p className="text-white text-sm font-mono">{info.banco}</p>
            </div>
            <div>
              <p className="text-gray-500 text-xs">CLABE</p>
              <p className="text-white text-sm font-mono tracking-wider">{info.clabe}</p>
            </div>
            <div>
              <p className="text-gray-500 text-xs">Titular</p>
              <p className="text-white text-sm font-mono">{info.titular}</p>
            </div>
            <div>
              <p className="text-gray-500 text-xs">Referencia (pon este código en el concepto)</p>
              <p className="text-blue-400 text-sm font-mono font-bold tracking-widest">{info.referencia}</p>
            </div>
            <div>
              <p className="text-gray-500 text-xs">Monto exacto</p>
              <p className="text-white text-sm font-mono font-bold">{formatMXN(info.monto)}</p>
            </div>
          </div>
        </div>

        {/* CTA */}
        {notificado ? (
          <div className="bg-blue-950 border border-blue-800 rounded-lg p-5 text-center">
            <p className="text-blue-300 text-sm font-semibold">Transferencia registrada</p>
            <p className="text-blue-400 text-xs mt-1">
              Confirmaremos tu pago en las próximas horas y recibirás acceso automáticamente.
            </p>
          </div>
        ) : (
          <button
            onClick={handleNotificar}
            disabled={notificando}
            className={`w-full py-3 rounded-lg text-sm font-semibold transition-colors ${
              notificando
                ? "bg-gray-700 text-gray-400 cursor-not-allowed"
                : "bg-white text-gray-950 hover:bg-gray-100"
            }`}
          >
            {notificando ? "Registrando..." : "Ya realicé mi transferencia"}
          </button>
        )}

        {error && <p className="text-red-400 text-xs text-center">{error}</p>}

        <p className="text-gray-600 text-xs text-center">
          ¿Dudas? Escríbenos a marioantonioramirezbarajas@gmail.com
        </p>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: TypeScript check**

```bash
cd /Users/maramire2001/Desktop/LICIT-AI/frontend && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 4: Commit**

```bash
git add "frontend/src/app/(app)/pago/[id]/page.tsx"
git commit -m "feat: add SPEI payment page with bank details, notification CTA, and polling"
```

---

## Task 5: Frontend — Gate expediente + CTA PanelDecision

**Files:**
- Modify: `frontend/src/app/(app)/expediente/[id]/page.tsx`
- Modify: `frontend/src/components/analisis/PanelDecision.tsx`

### Parte A: Gate en expediente page

- [ ] **Step 1: Leer expediente page actual**

Leer `/Users/maramire2001/Desktop/LICIT-AI/frontend/src/app/(app)/expediente/[id]/page.tsx`

- [ ] **Step 2: Añadir gate de pago**

Dentro del `useEffect` que carga el expediente, DESPUÉS de hacer `setExpediente(data)`, añadir verificación vía una segunda llamada. Pero es más simple: añadir un segundo `useEffect` que verifique el pago_status antes de mostrar el expediente.

Reemplazar el bloque del `useEffect` de carga por este patrón:

```tsx
useEffect(() => {
  api.pagos
    .info(params.id)
    .then((pagoInfo) => {
      if (pagoInfo.pago_status !== "confirmado") {
        router.replace(`/pago/${params.id}`)
        return
      }
      return api.expediente.get(params.id)
    })
    .then((data) => {
      if (data) {
        setExpediente(data)
        setLoading(false)
      }
    })
    .catch(() => {
      setError("Expediente no encontrado o análisis aún en proceso")
      setLoading(false)
    })
}, [params.id, router])
```

También añadir `useRouter` al import:
```tsx
import { useEffect, useState, useCallback } from "react"  // ya existe
import { useRouter } from "next/navigation"  // añadir
```

Y declarar `router` al tope del componente:
```tsx
const router = useRouter()
```

### Parte B: CTA en PanelDecision

- [ ] **Step 3: Leer PanelDecision.tsx**

Leer `/Users/maramire2001/Desktop/LICIT-AI/frontend/src/components/analisis/PanelDecision.tsx`

- [ ] **Step 4: Cambiar el link del CTA de expediente a pago**

Buscar la línea:
```tsx
href={`/expediente/${analisis.id}`}
```

Reemplazar con:
```tsx
href={`/pago/${analisis.id}`}
```

El texto del botón puede quedar igual: "Ver expediente generado →"

- [ ] **Step 5: TypeScript check**

```bash
cd /Users/maramire2001/Desktop/LICIT-AI/frontend && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/analisis/PanelDecision.tsx "frontend/src/app/(app)/expediente/[id]/page.tsx"
git commit -m "feat: gate expediente behind pago_status=confirmado, redirect PanelDecision CTA to /pago"
```

---

## Task 6: Frontend — Panel admin `/admin/pagos`

**Files:**
- Create: `frontend/src/app/(app)/admin/pagos/page.tsx`

- [ ] **Step 1: Crear directorio**

```bash
mkdir -p "/Users/maramire2001/Desktop/LICIT-AI/frontend/src/app/(app)/admin/pagos"
```

- [ ] **Step 2: Crear `frontend/src/app/(app)/admin/pagos/page.tsx`**

```tsx
"use client"
export const dynamic = "force-dynamic"
import { useEffect, useState } from "react"
import { api } from "@/lib/api"
import Link from "next/link"

type PendientePago = {
  analisis_id: string
  company_id: string
  nivel_complejidad: string
  pago_monto: number | null
  pago_status: string
  created_at: string
}

function formatMXN(n: number | null) {
  if (!n) return "—"
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(n)
}

export default function AdminPagosPage() {
  const [pagos, setPagos] = useState<PendientePago[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [confirmando, setConfirmando] = useState<string | null>(null)

  async function cargar() {
    try {
      const data = await api.pagos.pendientes()
      setPagos(data)
    } catch {
      setError("Sin acceso o error al cargar. ¿Estás logueado como admin?")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { cargar() }, [])

  async function confirmar(analisis_id: string) {
    setConfirmando(analisis_id)
    try {
      await api.pagos.confirmar(analisis_id)
      setPagos((prev) => prev.filter((p) => p.analisis_id !== analisis_id))
    } catch {
      setError("Error al confirmar. Intenta de nuevo.")
    } finally {
      setConfirmando(null)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-gray-500 text-sm">Cargando panel de pagos...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 p-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-white">Panel Admin — Pagos en Revisión</h1>
            <p className="text-gray-500 text-sm mt-0.5">Confirma transferencias para desbloquear expedientes</p>
          </div>
          <Link href="/dashboard" className="text-gray-500 text-sm hover:text-gray-300 transition-colors">
            ← Dashboard
          </Link>
        </div>

        {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

        {pagos.length === 0 ? (
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-8 text-center">
            <p className="text-gray-500 text-sm">No hay pagos en revisión</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pagos.map((p) => (
              <div key={p.analisis_id} className="bg-gray-900 border border-gray-800 rounded-lg p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1 min-w-0">
                    <p className="text-white text-sm font-semibold capitalize">
                      Nivel {p.nivel_complejidad || "—"}
                      <span className="ml-2 text-green-400 font-bold">{formatMXN(p.pago_monto)}</span>
                    </p>
                    <p className="text-gray-500 text-xs font-mono truncate">
                      Análisis: {p.analisis_id}
                    </p>
                    <p className="text-gray-500 text-xs font-mono truncate">
                      Empresa: {p.company_id}
                    </p>
                    <p className="text-gray-600 text-xs">
                      {new Date(p.created_at).toLocaleString("es-MX")}
                    </p>
                  </div>
                  <button
                    onClick={() => confirmar(p.analisis_id)}
                    disabled={confirmando === p.analisis_id}
                    className={`shrink-0 px-4 py-2 rounded-md text-xs font-semibold transition-colors ${
                      confirmando === p.analisis_id
                        ? "bg-gray-700 text-gray-400 cursor-not-allowed"
                        : "bg-green-600 hover:bg-green-700 text-white"
                    }`}
                  >
                    {confirmando === p.analisis_id ? "Confirmando..." : "Confirmar pago"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <button
          onClick={cargar}
          className="mt-4 text-gray-500 text-xs hover:text-gray-300 transition-colors"
        >
          Actualizar lista
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: TypeScript check**

```bash
cd /Users/maramire2001/Desktop/LICIT-AI/frontend && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 4: Commit**

```bash
git add "frontend/src/app/(app)/admin/pagos/page.tsx"
git commit -m "feat: add admin pagos panel with list of pending payments and confirm action"
```

---

## Task 7: Configurar variables de entorno

**Files:**
- Modify: `backend/.env`

- [ ] **Step 1: Leer el .env actual**

```bash
cat /Users/maramire2001/Desktop/LICIT-AI/backend/.env
```

- [ ] **Step 2: Añadir las variables faltantes**

Agregar al final del archivo (sin sobrescribir las existentes):

```
ADMIN_EMAIL=marioantonioramirezbarajas@gmail.com
BANK_CLABE=<tu CLABE de 18 dígitos>
BANK_NOMBRE=BBVA
BANK_TITULAR=<nombre exacto del titular>
```

IMPORTANTE: No agregar `BANK_CLABE` ni `BANK_TITULAR` con valores reales al plan — el implementador debe pedirle al dueño del proyecto esos valores o usar placeholders que el dueño luego actualiza. Usar placeholders `TU_CLABE_AQUI` y `TU_TITULAR_AQUI` si no se tienen los datos.

- [ ] **Step 3: Reiniciar el backend para cargar las nuevas env vars**

```bash
docker compose -f /Users/maramire2001/Desktop/LICIT-AI/docker-compose.yml restart backend
```

Esperar ~10 segundos y verificar:

```bash
docker exec licit-ai-backend-1 python -c "import os; print(os.getenv('ADMIN_EMAIL', 'NO_CONFIGURADO'))"
```

Debe imprimir el email del admin.

- [ ] **Step 4: Commit (solo si el .env tiene cambios seguros — NO commitear CLABE real)**

```bash
git add backend/.env
git commit -m "config: add ADMIN_EMAIL and bank env var placeholders"
```

---

## Self-Review

**Spec coverage:**
- [x] Pricing Bronce/Plata/Oro × radar/directo → Task 2 (`PRECIOS` dict)
- [x] Datos bancarios configurables → Task 7 (env vars) + Task 2 (endpoint info)
- [x] Cliente notifica transferencia → Task 2 (`/notificar`) + Task 4 (botón "Ya transferí")
- [x] Polling automático cada 30s → Task 4 (`setInterval`)
- [x] Admin confirma → Task 2 (`/confirmar`) + Task 6 (panel admin)
- [x] Gate en expediente → Task 5 Parte A
- [x] CTA en PanelDecision → Task 5 Parte B
- [x] Referencia única en concepto → Task 2 (`analisis_id[:8].upper()`)
- [x] `pago_status` en DB → Task 1

**Placeholder scan:** Ninguno — todo el código está completo.

**Type consistency:** `PagoInfo.analisis_id` (string) usado consistentemente. `api.pagos.info()` retorna el mismo shape que define `PagoInfo` en la página de pago.
