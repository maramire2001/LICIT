# Onboarding ADN Express — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reemplazar el onboarding de 2 pasos (RFC + sector) por un wizard de 6 pasos que capture las 5 dimensiones del ADN corporativo del cliente mediante selección por clics, más un campo libre de intereses, sin fricción.

**Architecture:** Tres capas en orden: (1) migración de BD que agrega 5 columnas nuevas a `companies`, (2) backend que actualiza modelo + schema + endpoint, (3) frontend que reemplaza el wizard actual con 6 steps + campo libre.

## Modelo comercial — Tipos de acceso y precios

| Plan | Acceso | Bronce | Plata | Oro |
|---|---|---|---|---|
| `radar` (suscripción mensual) | Radar + Anatomía + Victoria | $20,000 MXN | $30,000 MXN | $40,000 MXN |
| `directo` (sin suscripción) | Solo Victoria (expediente) | $40,000 MXN | $50,000 MXN | $60,000 MXN |

- `tipo_plan` se guarda en Company con default `"radar"`.
- Clientes `"directo"` entran por un flujo alternativo (sin wizard completo) y pagan el doble por expediente.
- La lógica de routing y cobro diferenciado va en un plan separado; aquí solo se establece el campo.

**Tech Stack:** PostgreSQL + Alembic (migrations), SQLAlchemy 2.0 async (models), FastAPI + Pydantic (API), Next.js 16 + React 19 + TailwindCSS 4 (frontend).

---

## Mapa de campos: modelo → app

| Dimensión del modelo | Campo en DB | Estado actual |
|---|---|---|
| RFC + Nombre | `rfc`, `nombre` | ✅ Existe — solo se mejora el UI |
| Especialidad | `sector` | ✅ Existe — cambiar opciones y label |
| Cobertura | `regiones` (ARRAY) | ✅ Existe en DB — no expuesto en frontend |
| Rango financiero | `rango_financiero` (String) | ❌ No existe — crear |
| Acreditaciones | `acreditaciones` (ARRAY) | ❌ No existe — crear |
| Prioridad de instituciones | `prioridades_instituciones` (ARRAY) | ❌ No existe — crear |
| Intereses libres | `intereses_libres` (Text) | ❌ No existe — crear (campo libre, opcional, en paso 0) |
| Tipo de plan | `tipo_plan` (String) | ❌ No existe — crear (default `"radar"`, no expuesto en wizard) |

---

## Task 1: Migración de base de datos

**Files:**
- Create: `backend/alembic/versions/002_onboarding_adn.py`

- [ ] **Step 1: Crear archivo de migración**

```python
# backend/alembic/versions/002_onboarding_adn.py
"""add onboarding adn fields to companies

Revision ID: 002
Revises: 001
Create Date: 2026-04-18
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = '002'
down_revision = '001'
branch_labels = None
depends_on = None

def upgrade() -> None:
    op.add_column('companies',
        sa.Column('rango_financiero', sa.String(20), nullable=True))
    op.add_column('companies',
        sa.Column('acreditaciones', postgresql.ARRAY(sa.String()), nullable=True))
    op.add_column('companies',
        sa.Column('prioridades_instituciones', postgresql.ARRAY(sa.String()), nullable=True))
    op.add_column('companies',
        sa.Column('intereses_libres', sa.Text(), nullable=True))
    op.add_column('companies',
        sa.Column('tipo_plan', sa.String(20), nullable=True, server_default='radar'))

def downgrade() -> None:
    op.drop_column('companies', 'tipo_plan')
    op.drop_column('companies', 'intereses_libres')
    op.drop_column('companies', 'prioridades_instituciones')
    op.drop_column('companies', 'acreditaciones')
    op.drop_column('companies', 'rango_financiero')
```

- [ ] **Step 2: Correr la migración**

```bash
cd backend
alembic upgrade head
```

Salida esperada:
```
INFO  [alembic.runtime.migration] Running upgrade 001 -> 002, add onboarding adn fields to companies
```

- [ ] **Step 3: Verificar que las columnas existen**

```bash
cd backend
python -c "
import asyncio
from app.core.database import engine
from sqlalchemy import text

async def check():
    async with engine.connect() as conn:
        result = await conn.execute(text(\"SELECT column_name FROM information_schema.columns WHERE table_name='companies' ORDER BY column_name\"))
        print([row[0] for row in result.fetchall()])

asyncio.run(check())
"
```

Salida esperada (debe incluir los 3 campos nuevos):
```
['acreditaciones', 'cucop_codes', 'id', 'nombre', 'perfil_semantico', 'prioridades_instituciones', 'rango_financiero', 'rfc', 'regiones', 'sector']
```

- [ ] **Step 4: Commit**

```bash
git add backend/alembic/versions/002_onboarding_adn.py
git commit -m "feat: migration 002 - add rango_financiero, acreditaciones, prioridades_instituciones to companies"
```

---

## Task 2: Modelo SQLAlchemy actualizado

**Files:**
- Modify: `backend/app/models/company.py`

- [ ] **Step 1: Actualizar el modelo**

Reemplazar el contenido completo de `backend/app/models/company.py`:

```python
import uuid
from sqlalchemy import String, ARRAY, JSON
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base

class Company(Base):
    __tablename__ = "companies"
    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    nombre: Mapped[str] = mapped_column(String(255))
    rfc: Mapped[str] = mapped_column(String(13), unique=True)
    sector: Mapped[str] = mapped_column(String(100))
    regiones: Mapped[list] = mapped_column(ARRAY(String), default=list)
    cucop_codes: Mapped[list] = mapped_column(ARRAY(String), default=list)
    perfil_semantico: Mapped[dict] = mapped_column(JSON, default=dict)
    rango_financiero: Mapped[str | None] = mapped_column(String(20), nullable=True)
    acreditaciones: Mapped[list] = mapped_column(ARRAY(String), default=list, nullable=True)
    prioridades_instituciones: Mapped[list] = mapped_column(ARRAY(String), default=list, nullable=True)
    intereses_libres: Mapped[str | None] = mapped_column(Text, nullable=True)
    tipo_plan: Mapped[str] = mapped_column(String(20), default="radar")

class User(Base):
    __tablename__ = "users"
    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    supabase_uid: Mapped[str] = mapped_column(String(255), unique=True)
    company_id: Mapped[uuid.UUID | None] = mapped_column(nullable=True)
    email: Mapped[str] = mapped_column(String(255))
    rol: Mapped[str] = mapped_column(String(20), default="analista")
```

- [ ] **Step 2: Verificar que el modelo importa sin errores**

```bash
cd backend
python -c "from app.models.company import Company, User; print('OK')"
```

Salida esperada: `OK`

- [ ] **Step 3: Commit**

```bash
git add backend/app/models/company.py
git commit -m "feat: add rango_financiero, acreditaciones, prioridades_instituciones to Company model"
```

---

## Task 3: Schema Pydantic y endpoint API

**Files:**
- Modify: `backend/app/schemas/company.py`
- Modify: `backend/app/api/auth.py`

- [ ] **Step 1: Actualizar schema Pydantic**

Reemplazar el contenido de `backend/app/schemas/company.py`:

```python
from pydantic import BaseModel
import uuid

class OnboardingRequest(BaseModel):
    rfc: str
    nombre: str
    sector: str
    regiones: list[str] = []
    cucop_codes: list[str] = []
    rango_financiero: str | None = None
    acreditaciones: list[str] = []
    prioridades_instituciones: list[str] = []
    intereses_libres: str | None = None
    # tipo_plan no se expone en el wizard: default "radar" en DB

class CompanyResponse(BaseModel):
    id: uuid.UUID
    nombre: str
    rfc: str
    sector: str
    regiones: list[str] = []
    rango_financiero: str | None = None
    acreditaciones: list[str] = []
    prioridades_instituciones: list[str] = []
    intereses_libres: str | None = None
    tipo_plan: str = "radar"

    model_config = {"from_attributes": True}
```

- [ ] **Step 2: Actualizar endpoint de onboarding**

Reemplazar la función `onboarding` en `backend/app/api/auth.py`:

```python
@router.post("/onboarding", response_model=CompanyResponse)
async def onboarding(
    payload: OnboardingRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Company).where(Company.rfc == payload.rfc))
    existing = result.scalar_one_or_none()
    if existing:
        current_user.company_id = existing.id
        await db.commit()
        return existing

    company = Company(
        nombre=payload.nombre,
        rfc=payload.rfc,
        sector=payload.sector,
        regiones=payload.regiones,
        cucop_codes=payload.cucop_codes,
        rango_financiero=payload.rango_financiero,
        acreditaciones=payload.acreditaciones,
        prioridades_instituciones=payload.prioridades_instituciones,
        intereses_libres=payload.intereses_libres,
    )
    db.add(company)
    await db.flush()
    current_user.company_id = company.id
    await db.commit()
    return company
```

- [ ] **Step 3: Verificar que el servidor arranca sin errores**

```bash
cd backend
uvicorn app.main:app --reload --port 8000
```

Salida esperada: `INFO: Application startup complete.` (sin errores de import o schema)

Ctrl+C para detener.

- [ ] **Step 4: Probar el endpoint con curl**

Con el servidor corriendo en otra terminal:

```bash
# Primero obtén un token de Supabase (o usa un token de prueba existente)
curl -X POST http://localhost:8000/api/auth/onboarding \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{
    "rfc": "TST010101TST",
    "nombre": "Empresa Test SA",
    "sector": "Seguridad",
    "regiones": ["Centro", "Norte"],
    "rango_financiero": "$20M-$100M",
    "acreditaciones": ["REPSE", "ISO 9001"],
    "prioridades_instituciones": ["IMSS", "CFE"]
  }'
```

Salida esperada (JSON con el company creado incluyendo los nuevos campos):
```json
{
  "id": "...",
  "nombre": "Empresa Test SA",
  "rfc": "TST010101TST",
  "sector": "Seguridad",
  "regiones": ["Centro", "Norte"],
  "rango_financiero": "$20M-$100M",
  "acreditaciones": ["REPSE", "ISO 9001"],
  "prioridades_instituciones": ["IMSS", "CFE"]
}
```

- [ ] **Step 5: Commit**

```bash
git add backend/app/schemas/company.py backend/app/api/auth.py
git commit -m "feat: update onboarding schema and endpoint to accept full ADN corporativo"
```

---

## Task 4: Frontend — Wizard de 6 pasos

**Files:**
- Modify: `frontend/src/app/(auth)/onboarding/page.tsx`

El wizard tiene 6 pasos numerados. Paso 0: RFC + Nombre. Pasos 1-5: las 5 dimensiones del ADN. Cada dimensión usa tarjetas de clic (grid), multi-select excepto `rango_financiero` (single-select). Botón "Siguiente" deshabilitado hasta que haya al menos una selección en cada paso.

- [ ] **Step 1: Reescribir onboarding/page.tsx**

Reemplazar el contenido completo de `frontend/src/app/(auth)/onboarding/page.tsx`:

```tsx
"use client"
export const dynamic = "force-dynamic"
import { useState } from "react"
import { api } from "@/lib/api"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const STEPS = [
  { id: 0, label: "Tu empresa" },
  { id: 1, label: "Especialidad" },
  { id: 2, label: "Cobertura" },
  { id: 3, label: "Rango" },
  { id: 4, label: "Acreditaciones" },
  { id: 5, label: "Prioridades" },
]

const ESPECIALIDADES = ["Seguridad", "Limpieza", "Construcción", "TI", "Salud", "Manufactura", "Consultoría", "Otros"]
const COBERTURAS = ["Nacional", "Centro", "Norte", "Occidente", "Sureste", "Noreste", "Bajío", "Otros"]
const RANGOS = ["<$5M", "$5M-$20M", "$20M-$100M", "$100M+"]
const ACREDITACIONES = ["REPSE", "ISO 9001", "ISO 27001", "ESR", "Pyme", "Otros"]
const INSTITUCIONES = ["IMSS", "PEMEX", "CFE", "SEDENA", "CAPUFE", "ISSSTE", "Estados", "Otros"]

type Form = {
  rfc: string
  nombre: string
  sector: string
  regiones: string[]
  rango_financiero: string
  acreditaciones: string[]
  prioridades_instituciones: string[]
  intereses_libres: string
}

function toggleItem(arr: string[], item: string): string[] {
  return arr.includes(item) ? arr.filter((x) => x !== item) : [...arr, item]
}

function SelectionGrid({
  options,
  selected,
  onToggle,
  single = false,
}: {
  options: string[]
  selected: string[]
  onToggle: (item: string) => void
  single?: boolean
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {options.map((opt) => {
        const active = selected.includes(opt)
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onToggle(opt)}
            className={`p-3 rounded-md text-sm border transition-colors text-left ${
              active
                ? "bg-blue-600 border-blue-500 text-white"
                : "bg-gray-800 border-gray-700 text-gray-300 hover:border-gray-500"
            }`}
          >
            {opt}
          </button>
        )
      })}
    </div>
  )
}

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [form, setForm] = useState<Form>({
    rfc: "",
    nombre: "",
    sector: "",
    regiones: [],
    rango_financiero: "",
    acreditaciones: [],
    prioridades_instituciones: [],
    intereses_libres: "",
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const canProceed = () => {
    if (step === 0) return form.rfc.length >= 12 && form.nombre.trim().length > 0
    if (step === 1) return form.sector !== ""
    if (step === 2) return form.regiones.length > 0
    if (step === 3) return form.rango_financiero !== ""
    if (step === 4) return true // acreditaciones es opcional
    if (step === 5) return form.prioridades_instituciones.length > 0
    return false
  }

  async function handleFinish() {
    setLoading(true)
    setError("")
    try {
      await api.auth.onboarding({
        rfc: form.rfc,
        nombre: form.nombre,
        sector: form.sector,
        regiones: form.regiones,
        rango_financiero: form.rango_financiero,
        acreditaciones: form.acreditaciones,
        prioridades_instituciones: form.prioridades_instituciones,
        intereses_libres: form.intereses_libres || null,
      })
      router.push("/dashboard")
    } catch (err: any) {
      setError(err.message || "Error al guardar")
    } finally {
      setLoading(false)
    }
  }

  const stepTitle = [
    "Tu empresa",
    "¿En qué especialidad opera?",
    "¿En qué zonas tiene cobertura real?",
    "¿Cuál es su techo financiero por contrato?",
    "¿Qué acreditaciones tiene vigentes?",
    "¿Qué instituciones son prioritarias?",
  ][step]

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg bg-gray-900 border-gray-800">
        <CardHeader>
          <div className="text-center mb-2">
            <span className="text-xl font-bold text-white">LICIT</span>
            <span className="text-xl font-bold text-blue-400">-IA</span>
          </div>

          {/* Progress bar */}
          <div className="flex gap-1 mb-2">
            {STEPS.map((s) => (
              <div
                key={s.id}
                className={`h-1 flex-1 rounded-full transition-colors ${
                  s.id <= step ? "bg-blue-500" : "bg-gray-700"
                }`}
              />
            ))}
          </div>

          <CardTitle className="text-white text-center text-base font-medium">
            {stepTitle}
          </CardTitle>
          <p className="text-center text-gray-500 text-xs">
            Paso {step + 1} de {STEPS.length}
          </p>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Paso 0: RFC + Nombre + Intereses libres */}
          {step === 0 && (
            <>
              <input
                placeholder="RFC (ej. XAXX010101000)"
                value={form.rfc}
                onChange={(e) => setForm({ ...form, rfc: e.target.value.toUpperCase() })}
                className="w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                maxLength={13}
              />
              <input
                placeholder="Nombre o razón social"
                value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div>
                <p className="text-gray-500 text-xs mb-1">
                  ¿Hay algún rubro o tipo de licitación que le interese en particular? (opcional)
                </p>
                <textarea
                  placeholder="Ej: vigilancia en hospitales, mantenimiento de edificios federales, suministro de medicamentos..."
                  value={form.intereses_libres}
                  onChange={(e) => setForm({ ...form, intereses_libres: e.target.value })}
                  rows={3}
                  className="w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
            </>
          )}

          {/* Paso 1: Especialidad (single-select) */}
          {step === 1 && (
            <SelectionGrid
              options={ESPECIALIDADES}
              selected={form.sector ? [form.sector] : []}
              onToggle={(item) => setForm({ ...form, sector: item })}
              single
            />
          )}

          {/* Paso 2: Cobertura (multi-select) */}
          {step === 2 && (
            <>
              <p className="text-gray-500 text-xs">Puede seleccionar varias zonas</p>
              <SelectionGrid
                options={COBERTURAS}
                selected={form.regiones}
                onToggle={(item) =>
                  setForm({ ...form, regiones: toggleItem(form.regiones, item) })
                }
              />
            </>
          )}

          {/* Paso 3: Rango financiero (single-select) */}
          {step === 3 && (
            <SelectionGrid
              options={RANGOS}
              selected={form.rango_financiero ? [form.rango_financiero] : []}
              onToggle={(item) => setForm({ ...form, rango_financiero: item })}
              single
            />
          )}

          {/* Paso 4: Acreditaciones (multi-select, opcional) */}
          {step === 4 && (
            <>
              <p className="text-gray-500 text-xs">Opcional — puede continuar sin seleccionar</p>
              <SelectionGrid
                options={ACREDITACIONES}
                selected={form.acreditaciones}
                onToggle={(item) =>
                  setForm({ ...form, acreditaciones: toggleItem(form.acreditaciones, item) })
                }
              />
            </>
          )}

          {/* Paso 5: Prioridades (multi-select) */}
          {step === 5 && (
            <>
              <p className="text-gray-500 text-xs">¿Con qué instituciones quiere trabajar?</p>
              <SelectionGrid
                options={INSTITUCIONES}
                selected={form.prioridades_instituciones}
                onToggle={(item) =>
                  setForm({
                    ...form,
                    prioridades_instituciones: toggleItem(form.prioridades_instituciones, item),
                  })
                }
              />
            </>
          )}

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <div className="flex gap-2 pt-2">
            {step > 0 && (
              <Button
                variant="outline"
                className="flex-1 border-gray-700 text-gray-300 hover:bg-gray-800"
                onClick={() => setStep(step - 1)}
              >
                Atrás
              </Button>
            )}
            {step < STEPS.length - 1 ? (
              <Button
                className="flex-1 bg-blue-600 hover:bg-blue-700"
                onClick={() => setStep(step + 1)}
                disabled={!canProceed()}
              >
                Siguiente
              </Button>
            ) : (
              <Button
                className="flex-1 bg-blue-600 hover:bg-blue-700"
                onClick={handleFinish}
                disabled={!canProceed() || loading}
              >
                {loading ? "Guardando..." : "Comenzar"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
```

- [ ] **Step 2: Verificar que el frontend compila sin errores de TypeScript**

```bash
cd frontend
npx tsc --noEmit
```

Salida esperada: ningún error de tipo.

- [ ] **Step 3: Arrancar el frontend y verificar visualmente**

```bash
cd frontend
npm run dev
```

Abrir `http://localhost:3000/onboarding` y verificar:
- Paso 0: inputs de RFC y Nombre con botón deshabilitado hasta llenar ambos
- Pasos 1-5: grids de tarjetas con selección visual correcta (azul cuando activo)
- Progress bar avanza en cada paso
- Botón "Atrás" aparece desde paso 1
- Paso 5 tiene botón "Comenzar" en vez de "Siguiente"

- [ ] **Step 4: Probar el flujo completo**

Con backend y frontend corriendo:
1. Ir a `http://localhost:3000/login` y registrar un usuario nuevo
2. El sistema redirige a `/onboarding`
3. Completar los 6 pasos
4. Verificar que redirige a `/dashboard`
5. Verificar en la BD que la empresa se guardó con todos los campos:

```bash
cd backend
python -c "
import asyncio
from app.core.database import engine
from sqlalchemy import text

async def check():
    async with engine.connect() as conn:
        result = await conn.execute(text('SELECT nombre, sector, regiones, rango_financiero, acreditaciones, prioridades_instituciones FROM companies ORDER BY rowid DESC LIMIT 1') )
        row = result.fetchone()
        print(dict(zip(result.keys(), row)))

asyncio.run(check())
"
```

Salida esperada: todos los campos con los valores seleccionados en el wizard.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/(auth)/onboarding/page.tsx
git commit -m "feat: replace 2-step onboarding with 6-step ADN wizard (especialidad, cobertura, rango, acreditaciones, prioridades)"
```

---

## Self-Review

**Spec coverage:**
- ✅ Especialidad → `sector` (single-select, Paso 1)
- ✅ Cobertura → `regiones` (multi-select, Paso 2)
- ✅ Rango financiero → `rango_financiero` (single-select, Paso 3)
- ✅ Acreditaciones → `acreditaciones` (multi-select, Paso 4)
- ✅ Prioridad de instituciones → `prioridades_instituciones` (multi-select, Paso 5)
- ✅ Migración de BD agrega los 3 campos nuevos
- ✅ Backend acepta y guarda los 5 campos
- ✅ Frontend wizard con clics, sin fricción, progress bar, botón Atrás

**Placeholder scan:** Ningún TBD/TODO en el plan. Todo el código es concreto.

**Type consistency:**
- `form.sector` (string) → enviado como `sector` al backend ✅
- `form.regiones` (string[]) → enviado como `regiones` ✅
- `form.rango_financiero` (string) → enviado como `rango_financiero` ✅
- `form.acreditaciones` (string[]) → enviado como `acreditaciones` ✅
- `form.prioridades_instituciones` (string[]) → enviado como `prioridades_instituciones` ✅
- `OnboardingRequest` schema acepta exactamente estos campos ✅
- `Company` model tiene estos campos como columnas ✅

---

## Task 5: Aviso Legal de Responsabilidad

**Files:**
- Modify: `frontend/src/app/(auth)/onboarding/page.tsx` — agregar paso de aceptación legal al final
- Modify: `frontend/src/components/analisis/PanelDecision.tsx` — cambiar lenguaje de garantía a probabilidad

### Objetivo
Dos protecciones legales:
1. Aceptación explícita (checkbox) antes de que el cliente complete el onboarding
2. Lenguaje ajustado en los resultados del análisis (score, viabilidad) para eliminar garantías implícitas

### 5a: Paso legal en onboarding (nuevo Step 6)

Agregar un Step 6 al wizard — pantalla de aceptación antes de "Comenzar". No es un paso de datos, es un contrato mínimo.

**En `onboarding/page.tsx`:**

1. Agregar `{ id: 6, label: "Aviso" }` al array STEPS
2. Agregar campo `aceptaTerminos: boolean` al tipo Form, inicializado en `false`
3. En `canProceed()`, agregar: `if (step === 6) return form.aceptaTerminos`
4. Agregar el Step 6 al JSX:

```tsx
{step === 6 && (
  <div className="space-y-4">
    <div className="bg-gray-800 border border-gray-700 rounded-md p-4 text-xs text-gray-400 space-y-2 max-h-48 overflow-y-auto">
      <p className="text-gray-300 font-medium">Aviso de Responsabilidad y Limitación de Garantías</p>
      <p>LICIT-IA es una herramienta de análisis e inteligencia de datos para licitaciones públicas. No es una consultoría legal ni garantiza resultado alguno en los procesos de contratación.</p>
      <p>Los índices de competitividad, escenarios de precio y análisis generados son estimaciones probabilísticas basadas en información histórica pública y en los datos declarados por el usuario. No constituyen garantía de adjudicación.</p>
      <p>La exactitud y completitud de los resultados depende directamente de la información proporcionada por el cliente. LICIT-IA no se hace responsable por errores, omisiones o inexactitudes en los datos ingresados por el usuario, ni por descalificaciones derivadas de información incorrecta o incompleta.</p>
      <p>La responsabilidad de revisar, validar y presentar correctamente el expediente ante la dependencia convocante es exclusiva del cliente. LICIT-IA proporciona un borrador de apoyo, no un documento oficial.</p>
      <p>Al continuar, el usuario acepta estos términos y reconoce que LICIT-IA actúa como herramienta de apoyo a la decisión, sin responsabilidad sobre el resultado del proceso licitatorio.</p>
    </div>
    <label className="flex items-start gap-3 cursor-pointer">
      <input
        type="checkbox"
        checked={form.aceptaTerminos}
        onChange={(e) => setForm({ ...form, aceptaTerminos: e.target.checked })}
        className="mt-0.5 h-4 w-4 rounded border-gray-600 bg-gray-800 text-blue-600 focus:ring-blue-500"
      />
      <span className="text-sm text-gray-300">
        He leído y acepto los términos. Entiendo que LICIT-IA es una herramienta de análisis y no garantiza la adjudicación del contrato.
      </span>
    </label>
  </div>
)}
```

5. El `stepTitle` array debe tener 7 entradas: agregar `"Aviso legal"` al final.
6. Actualizar: `"Paso {step + 1} de {STEPS.length}"` — STEPS ahora tiene 7 elementos.
7. `handleFinish()` permanece igual — `aceptaTerminos` no se envía al backend, solo controla el botón.

### 5b: Lenguaje en PanelDecision

Leer `frontend/src/components/analisis/PanelDecision.tsx` y cambiar:
- Cualquier texto "Generar Expediente" o similar que implique garantía → no cambiar la acción, solo verificar el lenguaje
- Buscar si hay texto tipo "garantizado", "ganador", "asegurado" → reemplazar por "optimizado", "estimado", "recomendado"
- Agregar debajo del score de viabilidad una línea pequeña en gris: `"Índice estimado basado en datos históricos y perfil declarado. No constituye garantía de adjudicación."`

**Commit:**
```bash
git add frontend/src/app/(auth)/onboarding/page.tsx frontend/src/components/analisis/PanelDecision.tsx
git commit -m "feat: add legal disclaimer step to onboarding and probability language to analysis panel"
```
