# Dashboard Radar ADN — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Personalizar el dashboard para que cada empresa vea las licitaciones más relevantes según su perfil ADN, con badge de relevancia por tarjeta y búsqueda libre siempre disponible.

**Architecture:** Nuevo endpoint `/api/licitaciones/radar` que lee el ADN de la empresa y calcula un score 0–3 por licitación (institución, rango financiero, sector). El frontend cambia entre modo Radar y modo Búsqueda según el campo de texto. El badge verde en la tarjeta aparece cuando score > 0.

**Tech Stack:** FastAPI + SQLAlchemy async, PostgreSQL ILIKE, Next.js 16 App Router, TypeScript, React hooks con debounce manual.

---

## File Map

| Archivo | Acción | Responsabilidad |
|---|---|---|
| `backend/app/api/licitaciones.py` | Modificar | Agregar `GET /radar` + param `q` en `GET /` |
| `backend/app/api/auth.py` | Modificar | Agregar `company_nombre` al response de `GET /me` |
| `backend/tests/test_radar.py` | Crear | Tests unitarios para la lógica de scoring |
| `frontend/src/types/index.ts` | Modificar | Agregar tipo `RadarResponse` |
| `frontend/src/lib/api.ts` | Modificar | Agregar `radar()`, actualizar `list()` con param `q` |
| `frontend/src/app/(app)/dashboard/page.tsx` | Modificar | Dual-mode logic, campo de búsqueda, nombre empresa |
| `frontend/src/components/dashboard/LicitacionCard.tsx` | Modificar | Prop `relevancia?: number`, badge verde |

---

## Task 1: Backend — scoring helper + endpoint `/radar`

**Files:**
- Modify: `backend/app/api/licitaciones.py`
- Create: `backend/tests/test_radar.py`

### Contexto

El proyecto usa FastAPI + SQLAlchemy async. Los modelos están en `backend/app/models/`. El modelo `Company` (en `backend/app/models/company.py`) tiene:
- `sector: str`
- `rango_financiero: str` — uno de: `"<$5M"`, `"$5M-$20M"`, `"$20M-$100M"`, `"$100M+"`
- `prioridades_instituciones: list[str]` — e.g. `["IMSS", "PEMEX"]`

El modelo `Licitacion` (en `backend/app/models/licitacion.py`) tiene:
- `titulo: str`
- `dependencia: str`
- `monto_estimado: float | None`
- `estado: str`

El router de licitaciones vive en `backend/app/api/licitaciones.py`. El usuario autenticado se obtiene con `Depends(get_current_user)` que devuelve un `User` con `company_id`.

- [ ] **Step 1: Escribir el test del helper de scoring**

Crear `backend/tests/test_radar.py`:

```python
import pytest
from unittest.mock import MagicMock
from app.api.licitaciones import _score_licitacion, RANGO_MONTO

def _make_company(**kwargs):
    c = MagicMock()
    c.sector = kwargs.get("sector", "")
    c.rango_financiero = kwargs.get("rango_financiero", "")
    c.prioridades_instituciones = kwargs.get("prioridades_instituciones", [])
    return c

def _make_lic(**kwargs):
    l = MagicMock()
    l.titulo = kwargs.get("titulo", "")
    l.dependencia = kwargs.get("dependencia", "")
    l.monto_estimado = kwargs.get("monto_estimado", None)
    return l

def test_score_zero_no_adn():
    company = _make_company()
    lic = _make_lic(titulo="Servicio médico IMSS", dependencia="IMSS", monto_estimado=10_000_000)
    assert _score_licitacion(lic, company) == 0

def test_score_institucion_match():
    company = _make_company(prioridades_instituciones=["IMSS"])
    lic = _make_lic(dependencia="Instituto Mexicano del Seguro Social IMSS")
    assert _score_licitacion(lic, company) == 1

def test_score_rango_match():
    company = _make_company(rango_financiero="$5M-$20M")
    lic = _make_lic(monto_estimado=10_000_000)
    assert _score_licitacion(lic, company) == 1

def test_score_rango_no_match():
    company = _make_company(rango_financiero="$5M-$20M")
    lic = _make_lic(monto_estimado=500_000)
    assert _score_licitacion(lic, company) == 0

def test_score_rango_100m_plus():
    company = _make_company(rango_financiero="$100M+")
    lic = _make_lic(monto_estimado=200_000_000)
    assert _score_licitacion(lic, company) == 1

def test_score_sector_match():
    company = _make_company(sector="tecnología")
    lic = _make_lic(titulo="Servicios de tecnología de la información")
    assert _score_licitacion(lic, company) == 1

def test_score_max():
    company = _make_company(
        sector="salud",
        rango_financiero="$5M-$20M",
        prioridades_instituciones=["IMSS"],
    )
    lic = _make_lic(
        titulo="Servicio de salud integral",
        dependencia="IMSS División Norte",
        monto_estimado=8_000_000,
    )
    assert _score_licitacion(lic, company) == 3
```

- [ ] **Step 2: Ejecutar el test — verificar que falla**

```bash
docker exec licit-ai-backend-1 python -m pytest tests/test_radar.py -v
```

Expected: `ImportError` — `_score_licitacion` no existe aún.

- [ ] **Step 3: Implementar el helper y el endpoint en `licitaciones.py`**

Reemplazar el contenido completo de `backend/app/api/licitaciones.py`:

```python
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from app.core.database import get_db
from app.core.auth import get_current_user
from app.models.company import User, Company
from app.models.licitacion import Licitacion, IngestaJob
from app.schemas.licitacion import LicitacionResponse, LicitacionDetalle
import uuid

router = APIRouter()

RANGO_MONTO: dict[str, tuple[float, float | None]] = {
    "<$5M":       (0, 5_000_000),
    "$5M-$20M":   (5_000_000, 20_000_000),
    "$20M-$100M": (20_000_000, 100_000_000),
    "$100M+":     (100_000_000, None),
}


def _score_licitacion(licitacion: Licitacion, company: Company) -> int:
    score = 0

    if company.prioridades_instituciones:
        dep = (licitacion.dependencia or "").lower()
        for inst in company.prioridades_instituciones:
            if inst.lower() in dep:
                score += 1
                break

    if company.rango_financiero and licitacion.monto_estimado is not None:
        rango = RANGO_MONTO.get(company.rango_financiero)
        if rango:
            low, high = rango
            monto = float(licitacion.monto_estimado)
            if monto >= low and (high is None or monto <= high):
                score += 1

    if company.sector and licitacion.titulo:
        if company.sector.lower() in licitacion.titulo.lower():
            score += 1

    return score


@router.get("/ingesta-status")
async def ingesta_status(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(IngestaJob)
        .where(IngestaJob.tipo == "backfill")
        .order_by(desc(IngestaJob.created_at))
        .limit(1)
    )
    job = result.scalar_one_or_none()
    if not job:
        return {"progreso": 0, "status": "no_iniciado", "registros": 0}
    return {"progreso": job.progreso, "status": job.status, "registros": job.registros_procesados}


@router.get("/radar")
async def radar_licitaciones(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not current_user.company_id:
        raise HTTPException(400, "Completa el onboarding primero")

    company_result = await db.execute(
        select(Company).where(Company.id == current_user.company_id)
    )
    company = company_result.scalar_one_or_none()
    if not company:
        raise HTTPException(500, "Perfil de empresa no encontrado")

    sin_perfil = not any([
        company.prioridades_instituciones,
        company.rango_financiero,
        company.sector,
    ])

    result = await db.execute(
        select(Licitacion)
        .where(Licitacion.estado == "activa")
        .order_by(desc(Licitacion.created_at))
        .limit(30)
    )
    licitaciones = result.scalars().all()

    scored = sorted(
        [
            {**LicitacionResponse.model_validate(l).model_dump(), "score_relevancia": _score_licitacion(l, company)}
            for l in licitaciones
        ],
        key=lambda x: (-x["score_relevancia"], str(x.get("created_at", ""))),
    )

    return {"sin_perfil": sin_perfil, "resultados": scored}


@router.get("/", response_model=list[LicitacionResponse])
async def list_licitaciones(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, le=100),
    estado: str = Query("activa"),
    q: str | None = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    offset = (page - 1) * page_size
    query = select(Licitacion).where(Licitacion.estado == estado)
    if q:
        pattern = f"%{q}%"
        query = query.where(
            Licitacion.titulo.ilike(pattern) | Licitacion.dependencia.ilike(pattern)
        )
    query = query.order_by(desc(Licitacion.created_at)).offset(offset).limit(page_size)
    result = await db.execute(query)
    licitaciones = result.scalars().all()
    return [LicitacionResponse.model_validate(l) for l in licitaciones]


@router.get("/{licitacion_id}", response_model=LicitacionDetalle)
async def get_licitacion(
    licitacion_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Licitacion).where(Licitacion.id == licitacion_id)
    )
    lic = result.scalar_one_or_none()
    if not lic:
        raise HTTPException(404, "Licitacion not found")
    return LicitacionDetalle.model_validate(lic)
```

- [ ] **Step 4: Ejecutar los tests — verificar que pasan**

```bash
docker exec licit-ai-backend-1 python -m pytest tests/test_radar.py -v
```

Expected output:
```
test_radar.py::test_score_zero_no_adn PASSED
test_radar.py::test_score_institucion_match PASSED
test_radar.py::test_score_rango_match PASSED
test_radar.py::test_score_rango_no_match PASSED
test_radar.py::test_score_rango_100m_plus PASSED
test_radar.py::test_score_sector_match PASSED
test_radar.py::test_score_max PASSED
7 passed
```

- [ ] **Step 5: Verificar que el endpoint responde**

```bash
# El backend debe estar corriendo: docker compose up -d
curl -s http://localhost:8000/api/licitaciones/radar \
  -H "Authorization: Bearer <token>" | python3 -m json.tool | head -20
```

Expected: JSON con `sin_perfil` (bool) y `resultados` (array). Si no hay token válido: `{"detail": "..."}` — eso es esperado.

- [ ] **Step 6: Commit**

```bash
git add backend/app/api/licitaciones.py backend/tests/test_radar.py
git commit -m "feat: add /radar endpoint with ADN scoring and q param on list"
```

---

## Task 2: Backend — agregar `company_nombre` a `GET /api/auth/me`

**Files:**
- Modify: `backend/app/api/auth.py`

### Contexto

El endpoint `me()` en `backend/app/api/auth.py` actualmente devuelve `{ id, email, company_id, rol }`. El frontend necesita `company_nombre` para mostrar "Radar · Empresa XYZ" en el header. Se agrega un JOIN con la tabla `companies`.

La función actual es:
```python
@router.get("/me")
async def me(current_user: User = Depends(get_current_user)):
    return {
        "id": str(current_user.id),
        "email": current_user.email,
        "company_id": str(current_user.company_id) if current_user.company_id else None,
        "rol": current_user.rol,
    }
```

Necesita acceso a la DB para buscar `Company.nombre`. El router ya importa `get_db` (revisar — si no, agregarlo).

- [ ] **Step 1: Modificar el endpoint `me` en `backend/app/api/auth.py`**

Localizar la función `me` y reemplazarla. Asegurarse de que los imports incluyan `AsyncSession`, `get_db`, `select`, `Company`:

```python
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.models.company import User, Company
```

Reemplazar la función `me`:

```python
@router.get("/me")
async def me(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    company_nombre = None
    if current_user.company_id:
        result = await db.execute(
            select(Company.nombre).where(Company.id == current_user.company_id)
        )
        company_nombre = result.scalar_one_or_none()

    return {
        "id": str(current_user.id),
        "email": current_user.email,
        "company_id": str(current_user.company_id) if current_user.company_id else None,
        "company_nombre": company_nombre,
        "rol": current_user.rol,
    }
```

- [ ] **Step 2: Verificar que el endpoint responde con el campo nuevo**

```bash
curl -s http://localhost:8000/api/auth/me \
  -H "Authorization: Bearer <token>" | python3 -m json.tool
```

Expected: JSON con `"company_nombre": "Nombre de la empresa"` (o `null` si no completó onboarding).

- [ ] **Step 3: Commit**

```bash
git add backend/app/api/auth.py
git commit -m "feat: include company_nombre in /api/auth/me response"
```

---

## Task 3: Frontend — tipos y api.ts

**Files:**
- Modify: `frontend/src/types/index.ts`
- Modify: `frontend/src/lib/api.ts`

### Contexto

`frontend/src/types/index.ts` ya tiene `Licitacion` con `score_relevancia: number`. Solo falta agregar `RadarResponse`.

`frontend/src/lib/api.ts` tiene `api.licitaciones.list(page)` que solo acepta un número. Hay que actualizarlo para aceptar `q` opcional.

- [ ] **Step 1: Agregar `RadarResponse` a `frontend/src/types/index.ts`**

Agregar después de la interfaz `Licitacion` (línea 10):

```typescript
export interface RadarResponse {
  sin_perfil: boolean
  resultados: Licitacion[]
}
```

- [ ] **Step 2: Actualizar `frontend/src/lib/api.ts`**

Reemplazar el bloque `licitaciones` en `api`:

```typescript
licitaciones: {
  list: (params?: { page?: number; q?: string }) => {
    const page = params?.page ?? 1
    const q = params?.q ? `&q=${encodeURIComponent(params.q)}` : ""
    return apiFetch<Licitacion[]>(`/api/licitaciones/?page=${page}${q}`)
  },
  radar: () => apiFetch<RadarResponse>("/api/licitaciones/radar"),
  get: (id: string) => apiFetch<any>(`/api/licitaciones/${id}`),
  ingestaStatus: () => apiFetch<any>("/api/licitaciones/ingesta-status"),
},
```

Agregar el import del tipo en la parte superior del archivo (si no existe ya un import de types — en este caso api.ts no importa types, usa `any`. Cambiar solo las dos funciones nuevas para usar los tipos correctos sin tocar el resto):

El tipo `RadarResponse` y `Licitacion` se importan desde `@/types`:

```typescript
import type { Licitacion, RadarResponse } from "@/types"
```

Agregar esta línea al inicio del archivo, después de la línea 1 (`const API_URL = ...`).

- [ ] **Step 3: Verificar TypeScript**

```bash
cd frontend && npx tsc --noEmit
```

Expected: sin errores.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/types/index.ts frontend/src/lib/api.ts
git commit -m "feat: add RadarResponse type and radar/q api methods"
```

---

## Task 4: Frontend — dashboard page con dual-mode

**Files:**
- Modify: `frontend/src/app/(app)/dashboard/page.tsx`

### Contexto

El dashboard actual (`frontend/src/app/(app)/dashboard/page.tsx`) carga licitaciones con `api.licitaciones.list()` sin ningún filtro. Tiene estados: `licitaciones`, `loading`, `ingesta`.

La nueva versión necesita:
- Estado `query: string` para el campo de búsqueda
- Estado `sinPerfil: boolean` para el empty state del radar
- Estado `companyNombre: string` para el header
- Debounce manual de 400ms con `useRef<ReturnType<typeof setTimeout>>`
- Modo Radar cuando `query === ""`, modo Búsqueda cuando `query !== ""`

`api.auth.me()` ahora devuelve `company_nombre`. El tipo sigue siendo `any` en api.ts para `me()` — está bien, lo usamos con optional chaining.

- [ ] **Step 1: Reescribir `frontend/src/app/(app)/dashboard/page.tsx`**

```tsx
"use client"
export const dynamic = "force-dynamic"
import { useEffect, useRef, useState } from "react"
import { api } from "@/lib/api"
import { LicitacionCard } from "@/components/dashboard/LicitacionCard"
import type { Licitacion } from "@/types"

export default function DashboardPage() {
  const [licitaciones, setLicitaciones] = useState<Licitacion[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState("")
  const [sinPerfil, setSinPerfil] = useState(false)
  const [companyNombre, setCompanyNombre] = useState("")
  const [ingesta, setIngesta] = useState<{
    progreso: number
    status: string
    registros: number
  } | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  async function cargarRadar() {
    setLoading(true)
    try {
      const data = await api.licitaciones.radar()
      setLicitaciones(data.resultados)
      setSinPerfil(data.sin_perfil)
    } finally {
      setLoading(false)
    }
  }

  async function cargarBusqueda(q: string) {
    setLoading(true)
    try {
      const data = await api.licitaciones.list({ q })
      setLicitaciones(data)
      setSinPerfil(false)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    cargarRadar()
    api.licitaciones.ingestaStatus().then(setIngesta).catch(() => null)
    api.auth.me().then((me: any) => {
      if (me?.company_nombre) setCompanyNombre(me.company_nombre)
    }).catch(() => null)
  }, [])

  function handleQuery(value: string) {
    setQuery(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (value === "") {
      cargarRadar()
      return
    }
    debounceRef.current = setTimeout(() => cargarBusqueda(value), 400)
  }

  const titulo = companyNombre ? `Radar · ${companyNombre}` : "LICIT-IA"
  const subtitulo = query ? "Búsqueda libre" : "Oportunidades filtradas por tu ADN"

  return (
    <div className="min-h-screen bg-gray-950 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-white">
              {companyNombre
                ? <>Radar · <span className="text-blue-400">{companyNombre}</span></>
                : <>LICIT<span className="text-blue-400">-IA</span></>
              }
            </h1>
            <p className="text-gray-500 text-sm mt-0.5">{subtitulo}</p>
          </div>
          {ingesta && ingesta.status !== "completado" && (
            <div className="flex items-center gap-2 text-xs text-gray-500 bg-gray-900 border border-gray-800 rounded-lg px-3 py-2">
              <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
              <span>
                Ingesta histórica: {ingesta.progreso}% ·{" "}
                {ingesta.registros.toLocaleString()} registros
              </span>
            </div>
          )}
        </div>

        {/* Búsqueda */}
        <div className="mb-6">
          <input
            type="text"
            value={query}
            onChange={(e) => handleQuery(e.target.value)}
            placeholder="Buscar licitaciones por nombre o dependencia..."
            className="w-full bg-gray-900 border border-gray-800 rounded-lg px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-gray-600 transition-colors"
          />
        </div>

        {/* Content */}
        {loading ? (
          <div className="space-y-3">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="h-28 bg-gray-900 rounded-lg animate-pulse border border-gray-800"
              />
            ))}
          </div>
        ) : licitaciones.length === 0 ? (
          <div className="text-center py-24">
            {sinPerfil ? (
              <>
                <p className="text-gray-400 font-medium">Completa tu perfil ADN</p>
                <p className="text-gray-600 text-sm mt-1 mb-4">
                  Para ver oportunidades personalizadas necesitamos conocer tu empresa
                </p>
                <a
                  href="/onboarding"
                  className="text-blue-400 text-sm hover:underline"
                >
                  Completar perfil →
                </a>
              </>
            ) : query ? (
              <>
                <p className="text-gray-400 font-medium">Sin resultados para "{query}"</p>
                <p className="text-gray-600 text-sm mt-1">Intenta con otro término</p>
              </>
            ) : (
              <>
                <div className="w-12 h-12 rounded-full bg-gray-900 border border-gray-800 flex items-center justify-center mx-auto mb-4">
                  <div className="w-4 h-4 rounded-full bg-blue-400 animate-pulse" />
                </div>
                <p className="text-gray-400 font-medium">
                  No hay licitaciones activas que coincidan con tu perfil
                </p>
                <button
                  onClick={() => { setQuery(""); cargarRadar() }}
                  className="text-blue-400 text-sm hover:underline mt-2"
                >
                  Ver todas las licitaciones
                </button>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {licitaciones.map((l) => (
              <LicitacionCard key={l.id} licitacion={l} relevancia={l.score_relevancia} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verificar TypeScript**

```bash
cd frontend && npx tsc --noEmit
```

Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/app/\(app\)/dashboard/page.tsx
git commit -m "feat: dual-mode dashboard with radar and free search"
```

---

## Task 5: Frontend — badge de relevancia en LicitacionCard

**Files:**
- Modify: `frontend/src/components/dashboard/LicitacionCard.tsx`

### Contexto

`LicitacionCard` actualmente recibe solo `{ licitacion: Licitacion }`. Hay que agregar prop opcional `relevancia?: number`. Cuando `relevancia > 0`, mostrar un punto verde con `title="Coincide con tu perfil ADN"` junto al badge de estado.

El badge de estado actual está en:
```tsx
<span className={`text-xs px-2 py-0.5 rounded-full border ${...}`}>
  {licitacion.estado}
</span>
```

El punto verde va justo antes de ese span, en el mismo `flex` container.

- [ ] **Step 1: Modificar `frontend/src/components/dashboard/LicitacionCard.tsx`**

```tsx
import { MeInteresaButton } from "./MeInteresaButton"
import type { Licitacion } from "@/types"

function formatMonto(monto: number | null): string {
  if (monto === null || monto === undefined) return "Monto no especificado"
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
```

Nota: también se corrige el null guard de `formatMonto` — cambia `if (!monto)` a `if (monto === null || monto === undefined)` para consistencia con el resto del proyecto.

- [ ] **Step 2: Verificar TypeScript**

```bash
cd frontend && npx tsc --noEmit
```

Expected: sin errores.

- [ ] **Step 3: Verificar visualmente en el browser**

Arrancar el dev server si no está corriendo:
```bash
cd frontend && npm run dev
```

Abrir `http://localhost:3000/dashboard`. Verificar:
- El header muestra el nombre de la empresa (o "LICIT-IA" si no hay nombre)
- El subtítulo dice "Oportunidades filtradas por tu ADN"
- Las licitaciones con score > 0 tienen el punto verde
- Al escribir en el campo de búsqueda, el subtítulo cambia a "Búsqueda libre" y los puntos verdes desaparecen
- Al borrar la búsqueda, vuelve al modo Radar con puntos verdes

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/dashboard/LicitacionCard.tsx
git commit -m "feat: add relevancia badge to LicitacionCard"
```

---

## Self-Review

**Spec coverage:**
- ✅ Endpoint `/radar` con score 0–3 — Task 1
- ✅ Mapeo rango financiero — Task 1 (RANGO_MONTO dict)
- ✅ Param `q` en `GET /` — Task 1
- ✅ `company_nombre` en `me()` — Task 2
- ✅ Tipo `RadarResponse` — Task 3
- ✅ `api.licitaciones.radar()` y `list({ q })` — Task 3
- ✅ Dual-mode con debounce 400ms — Task 4
- ✅ Header con nombre empresa — Task 4
- ✅ Empty states (sinPerfil, búsqueda vacía, sin matches) — Task 4
- ✅ Badge verde en tarjeta — Task 5
- ✅ Comportamiento sin ADN (`sin_perfil: true`) — Task 4 + Task 1

**Type consistency:**
- `RadarResponse.resultados` es `Licitacion[]` — Task 3
- `Licitacion.score_relevancia` ya existe en `types/index.ts`
- `LicitacionCard` recibe `relevancia?: number` — Task 5
- Dashboard pasa `l.score_relevancia` al componente — Task 4 ✅
