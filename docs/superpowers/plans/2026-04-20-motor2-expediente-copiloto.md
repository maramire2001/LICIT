# Motor 2 — Expediente Co-Piloto Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Agregar al Expediente un editor punto por punto del Anexo Técnico donde el usuario confirma si cumple cada requisito, agrega notas de evidencia, y descarga un ZIP que incluye esa revisión.

**Architecture:** Se agrega `anexo_respuestas` al modelo `Expediente` (JSON array de respuestas por requisito). El frontend añade un tab "Anexo Técnico" al `ExpedienteEditor` que carga los requisitos desde `Analisis.anexo_tecnico_requisitos` y los cruza con las respuestas guardadas del expediente. El backend expone un PATCH para guardar respuestas y actualiza el ZIP con una sección de Anexo.

**Tech Stack:** FastAPI + SQLAlchemy async + PostgreSQL + Alembic | Next.js App Router, TypeScript, Tailwind | python-docx no requerido (ZIP de .txt ya existe)

---

## File Structure

**Backend — modificados:**
- `backend/app/models/expediente.py` — añadir campo `anexo_respuestas: Mapped[dict | None]`
- `backend/alembic/versions/007_anexo_respuestas.py` — migración nueva
- `backend/app/schemas/expediente.py` — añadir `anexo_respuestas` a `ExpedienteResponse` + nuevo schema `UpdateAnexoRespuestas`
- `backend/app/api/expediente.py` — nuevo endpoint PATCH + actualizar `_generar_checklist` del ZIP para incluir Anexo

**Tests backend:**
- `backend/tests/test_expediente_anexo.py` — nuevo archivo

**Frontend — modificados:**
- `frontend/src/types/index.ts` — añadir `AnexoRespuesta`, `AnexoRequisito`, actualizar `Expediente` y `Analisis`
- `frontend/src/lib/api.ts` — añadir `expediente.updateAnexo()`
- `frontend/src/components/expediente/ExpedienteEditor.tsx` — nuevo tab "Anexo Técnico"
- `frontend/src/app/(app)/expediente/[id]/page.tsx` — pasar `analisis` al editor

---

### Task 1: Modelo + migración + schema para `anexo_respuestas`

**Files:**
- Modify: `backend/app/models/expediente.py`
- Create: `backend/alembic/versions/007_anexo_respuestas.py`
- Modify: `backend/app/schemas/expediente.py`
- Create: `backend/tests/test_expediente_anexo.py`

El campo almacena respuestas del usuario por requisito:
```json
{
  "items": [
    {"numero": "3.1", "cumple": true, "nota": "Tenemos 2 unidades propias"},
    {"numero": "3.2", "cumple": false, "nota": ""},
    {"numero": "3.3", "cumple": null, "nota": ""}
  ]
}
```
`cumple: null` = sin revisar aún.

- [ ] **Step 1: Escribir el test que falla**

```python
# backend/tests/test_expediente_anexo.py
import pytest
import uuid
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.core.database import AsyncSessionLocal
from app.models.expediente import Expediente

FAKE_ANALISIS_ID = uuid.uuid4()
FAKE_COMPANY_ID = uuid.UUID("b6f8a1d2-0000-0000-0000-000000000001")

@pytest.fixture
async def expediente_en_db():
    async with AsyncSessionLocal() as db:
        exp = Expediente(
            analisis_id=FAKE_ANALISIS_ID,
            company_id=FAKE_COMPANY_ID,
            carpeta_admin={"documentos": []},
            propuesta_economica={"monto_propuesto": None, "desglose": []},
            checklist={"items": []},
            faltantes={"items": []},
            anexo_respuestas={"items": []},
        )
        db.add(exp)
        await db.commit()
        await db.refresh(exp)
        return exp

@pytest.mark.asyncio
async def test_update_anexo_respuestas(expediente_en_db):
    payload = {
        "items": [
            {"numero": "3.1", "cumple": True, "nota": "Tenemos 2 unidades"},
            {"numero": "3.2", "cumple": False, "nota": ""},
        ]
    }
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        resp = await client.patch(
            f"/api/expediente/{expediente_en_db.id}/anexo-respuestas",
            json=payload,
            headers={"Authorization": "Bearer test-bypass"},
        )
    assert resp.status_code == 200
    data = resp.json()
    assert data["anexo_respuestas"]["items"][0]["cumple"] is True
    assert data["anexo_respuestas"]["items"][1]["cumple"] is False

@pytest.mark.asyncio
async def test_expediente_response_includes_anexo(expediente_en_db):
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        resp = await client.get(
            f"/api/expediente/{str(FAKE_ANALISIS_ID)}",
            headers={"Authorization": "Bearer test-bypass"},
        )
    assert resp.status_code == 200
    assert "anexo_respuestas" in resp.json()
```

- [ ] **Step 2: Correr el test para verificar que falla**

```bash
docker compose exec backend pytest tests/test_expediente_anexo.py -v 2>&1 | tail -20
```
Expected: FAIL — `anexo_respuestas` no existe en el modelo ni en el schema.

- [ ] **Step 3: Agregar campo al modelo**

Reemplazar en `backend/app/models/expediente.py`:
```python
import uuid
from datetime import datetime
from sqlalchemy import DateTime, JSON, Text, Integer
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base

class Expediente(Base):
    __tablename__ = "expedientes"
    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    analisis_id: Mapped[uuid.UUID] = mapped_column()
    company_id: Mapped[uuid.UUID] = mapped_column()
    carpeta_admin: Mapped[dict] = mapped_column(JSON, default=dict)
    propuesta_tecnica_draft: Mapped[str | None] = mapped_column(Text, nullable=True)
    propuesta_economica: Mapped[dict] = mapped_column(JSON, default=dict)
    checklist: Mapped[dict] = mapped_column(JSON, default=dict)
    faltantes: Mapped[dict] = mapped_column(JSON, default=dict)
    anexo_respuestas: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    version: Mapped[int] = mapped_column(Integer, default=1)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
```

- [ ] **Step 4: Crear la migración**

Crear `backend/alembic/versions/007_anexo_respuestas.py`:
```python
"""add anexo_respuestas to expedientes

Revision ID: 007
Revises: 006
Create Date: 2026-04-20
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "007"
down_revision = "006"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "expedientes",
        sa.Column(
            "anexo_respuestas",
            postgresql.JSON(astext_type=sa.Text()),
            nullable=True,
        ),
    )


def downgrade():
    op.drop_column("expedientes", "anexo_respuestas")
```

- [ ] **Step 5: Actualizar schema**

Reemplazar `backend/app/schemas/expediente.py`:
```python
from pydantic import BaseModel
import uuid
from datetime import datetime
from typing import Any

class AnexoRespuestaItem(BaseModel):
    numero: str
    cumple: bool | None = None
    nota: str = ""

class UpdateAnexoRespuestas(BaseModel):
    items: list[AnexoRespuestaItem]

class ExpedienteResponse(BaseModel):
    id: uuid.UUID
    analisis_id: uuid.UUID
    carpeta_admin: dict
    propuesta_tecnica_draft: str | None
    propuesta_economica: dict
    checklist: dict
    faltantes: dict
    anexo_respuestas: dict | None = None
    version: int
    created_at: datetime

    model_config = {"from_attributes": True}

class UpdatePropuestaTecnica(BaseModel):
    propuesta_tecnica_draft: str
```

- [ ] **Step 6: Correr migración**

```bash
docker compose exec backend alembic upgrade head
```
Expected: `Running upgrade 006 -> 007`

- [ ] **Step 7: Correr tests**

```bash
docker compose exec backend pytest tests/test_expediente_anexo.py -v 2>&1 | tail -20
```
Expected: aún fallan — el endpoint no existe todavía.

- [ ] **Step 8: Commit**

```bash
git add backend/app/models/expediente.py backend/alembic/versions/007_anexo_respuestas.py backend/app/schemas/expediente.py backend/tests/test_expediente_anexo.py
git commit -m "feat: add anexo_respuestas field to Expediente model and schema"
```

---

### Task 2: Endpoint PATCH + Anexo Técnico en el ZIP

**Files:**
- Modify: `backend/app/api/expediente.py`

Agregar el endpoint `PATCH /{expediente_id}/anexo-respuestas` y actualizar el ZIP para incluir una sección con el estado de cada requisito del Anexo.

- [ ] **Step 1: Agregar endpoint PATCH en `backend/app/api/expediente.py`**

Agregar después del endpoint `ai-refine` (línea ~217), antes de `@router.get("/{analisis_id}/zip")`

```python
@router.patch("/{expediente_id}/anexo-respuestas", response_model=ExpedienteResponse)
async def update_anexo_respuestas(
    expediente_id: uuid.UUID,
    payload: UpdateAnexoRespuestas,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Expediente).where(
            Expediente.id == expediente_id,
            Expediente.company_id == current_user.company_id,
        )
    )
    exp = result.scalar_one_or_none()
    if not exp:
        raise HTTPException(404, "Expediente no encontrado")
    exp.anexo_respuestas = {"items": [r.model_dump() for r in payload.items]}
    exp.version += 1
    await db.commit()
    await db.refresh(exp)
    return exp
```

También actualizar el import del schema al inicio del archivo para incluir `UpdateAnexoRespuestas`:
```python
from app.schemas.expediente import ExpedienteResponse, UpdatePropuestaTecnica, UpdateAnexoRespuestas
```

- [ ] **Step 2: Agregar función `_generar_anexo` para el ZIP**

Agregar después de `_generar_pendientes` (antes de `router = APIRouter()`):

```python
def _generar_anexo(anexo_respuestas: dict | None, requisitos_extraidos: list[dict]) -> str:
    respuestas_map: dict[str, dict] = {}
    for r in (anexo_respuestas or {}).get("items", []):
        respuestas_map[r.get("numero", "")] = r

    lines = ["REVISIÓN ANEXO TÉCNICO", "=" * 40, ""]
    cumple_count = 0
    no_cumple_count = 0
    pendiente_count = 0

    for req in requisitos_extraidos:
        num = req.get("numero", "?")
        texto = req.get("texto", "")[:120]
        riesgo = req.get("riesgo", "bajo").upper()
        resp = respuestas_map.get(num, {})
        cumple = resp.get("cumple")
        nota = resp.get("nota", "")

        if cumple is True:
            estado = "✓ CUMPLE"
            cumple_count += 1
        elif cumple is False:
            estado = "✗ NO CUMPLE"
            no_cumple_count += 1
        else:
            estado = "? PENDIENTE"
            pendiente_count += 1

        lines.append(f"[{num}] [{riesgo}] {estado}")
        lines.append(f"  {texto}...")
        if nota:
            lines.append(f"  Nota: {nota}")
        lines.append("")

    lines.insert(2, f"Cumple: {cumple_count}  |  No cumple: {no_cumple_count}  |  Pendiente: {pendiente_count}")
    lines.insert(3, "")
    return "\n".join(lines)
```

- [ ] **Step 3: Incluir Anexo en el ZIP**

En la función `descargar_zip`, localizar el bloque `with zipfile.ZipFile(...)` y agregar la sección de Anexo:

Antes del `buf.seek(0)`, reemplazar el bloque `with zipfile.ZipFile` por:
```python
    req_items = (analisis.anexo_tecnico_requisitos or {}).get("items", [])
    anexo_txt = _generar_anexo(exp.anexo_respuestas, req_items)

    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("portada.txt", portada)
        zf.writestr("01_checklist_cumplimiento.txt", checklist)
        zf.writestr("02_propuesta_tecnica.txt", tecnica)
        zf.writestr("03_anexo_tecnico_revision.txt", anexo_txt)
        zf.writestr("04_propuesta_economica.txt", economica)
        zf.writestr("05_pendientes.txt", pendientes)
    buf.seek(0)
```

- [ ] **Step 4: Rebuild y correr tests**

```bash
docker compose up -d --build backend worker 2>&1 | grep -E "Built|Started|Error"
docker compose exec backend pytest tests/test_expediente_anexo.py -v 2>&1 | tail -20
```
Expected: 2/2 PASS

- [ ] **Step 5: Commit**

```bash
git add backend/app/api/expediente.py
git commit -m "feat: PATCH anexo-respuestas endpoint + anexo section in ZIP export"
```

---

### Task 3: Frontend — Tab "Anexo Técnico" en ExpedienteEditor

**Files:**
- Modify: `frontend/src/types/index.ts`
- Modify: `frontend/src/lib/api.ts`
- Modify: `frontend/src/components/expediente/ExpedienteEditor.tsx`
- Modify: `frontend/src/app/(app)/expediente/[id]/page.tsx`

El tab muestra cada requisito del Anexo Técnico (de `analisis.anexo_tecnico_requisitos`) con:
- Badge de riesgo (rojo=alto, amarillo=medio, verde=bajo)
- Número y texto del requisito
- 3 botones: ✓ Cumple / ✗ No cumple / ? Pendiente
- Campo de texto para nota/evidencia
- Botón "Guardar revisión" al final

- [ ] **Step 1: Actualizar tipos en `frontend/src/types/index.ts`**

Agregar al final del archivo (antes del cierre):
```typescript
export interface AnexoRequisito {
  numero: string
  texto: string
  categoria: "legal" | "tecnico" | "financiero"
  riesgo: "alto" | "medio" | "bajo"
  evidencia_requerida: string
}

export interface AnexoRespuesta {
  numero: string
  cumple: boolean | null
  nota: string
}
```

Actualizar la interfaz `Analisis` para incluir `anexo_tecnico_requisitos`:
```typescript
  anexo_tecnico_requisitos: { items: AnexoRequisito[] } | null
```

Actualizar la interfaz `Expediente` para incluir `anexo_respuestas`:
```typescript
  anexo_respuestas: { items: AnexoRespuesta[] } | null
```

- [ ] **Step 2: Agregar método al API client**

En `frontend/src/lib/api.ts`, dentro de `expediente:`, agregar después de `aiRefine`:
```typescript
    updateAnexo: (expediente_id: string, items: import("@/types").AnexoRespuesta[]) =>
      apiFetch<any>(`/api/expediente/${expediente_id}/anexo-respuestas`, {
        method: "PATCH",
        body: JSON.stringify({ items }),
      }),
```

- [ ] **Step 3: Actualizar `ExpedienteEditor` con el tab Anexo Técnico**

Reemplazar el archivo completo `frontend/src/components/expediente/ExpedienteEditor.tsx`:

```tsx
"use client"
import { useState } from "react"
import { api } from "@/lib/api"
import type { Expediente, Analisis, AnexoRespuesta } from "@/types"

function fmt(n: number | null): string {
  if (n == null) return "—"
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(n)
}

const RIESGO_COLORS = {
  alto: "bg-red-900/40 text-red-400 border-red-800",
  medio: "bg-yellow-900/40 text-yellow-400 border-yellow-800",
  bajo: "bg-green-900/40 text-green-400 border-green-800",
}

export function ExpedienteEditor({
  expediente: initial,
  analisis,
}: {
  expediente: Expediente
  analisis: Analisis | null
}) {
  const [exp, setExp] = useState(initial)
  const [tab, setTab] = useState<"admin" | "tecnica" | "economica" | "anexo">("anexo")
  const [instruccion, setInstruccion] = useState("")
  const [saving, setSaving] = useState(false)
  const [refining, setRefining] = useState(false)
  const [savingAnexo, setSavingAnexo] = useState(false)

  const requisitos = analisis?.anexo_tecnico_requisitos?.items ?? []

  // Build mutable map: numero -> AnexoRespuesta
  const initRespuestas = (): Record<string, AnexoRespuesta> => {
    const map: Record<string, AnexoRespuesta> = {}
    requisitos.forEach((r) => {
      map[r.numero] = { numero: r.numero, cumple: null, nota: "" }
    })
    ;(exp.anexo_respuestas?.items ?? []).forEach((r) => {
      map[r.numero] = r
    })
    return map
  }

  const [respuestas, setRespuestas] = useState<Record<string, AnexoRespuesta>>(initRespuestas)

  function setRespuesta(numero: string, patch: Partial<AnexoRespuesta>) {
    setRespuestas((prev) => ({ ...prev, [numero]: { ...prev[numero], ...patch } }))
  }

  async function handleSave() {
    setSaving(true)
    try {
      const updated = await api.expediente.updatePropuesta(exp.id, exp.propuesta_tecnica_draft ?? "")
      setExp(updated)
    } finally {
      setSaving(false)
    }
  }

  async function handleRefine() {
    if (!instruccion.trim()) return
    setRefining(true)
    try {
      const result = await api.expediente.aiRefine(exp.id, instruccion)
      setExp({ ...exp, propuesta_tecnica_draft: result.propuesta_tecnica_draft })
      setInstruccion("")
    } finally {
      setRefining(false)
    }
  }

  async function handleSaveAnexo() {
    setSavingAnexo(true)
    try {
      const items = Object.values(respuestas)
      const updated = await api.expediente.updateAnexo(exp.id, items)
      setExp(updated)
    } finally {
      setSavingAnexo(false)
    }
  }

  const cumpleCount = Object.values(respuestas).filter((r) => r.cumple === true).length
  const noCumpleCount = Object.values(respuestas).filter((r) => r.cumple === false).length
  const pendienteCount = Object.values(respuestas).filter((r) => r.cumple === null).length

  const tabs = [
    { key: "anexo", label: `Anexo Técnico${requisitos.length ? ` (${requisitos.length})` : ""}` },
    { key: "admin", label: "Carpeta Admin" },
    { key: "tecnica", label: "Propuesta Técnica" },
    { key: "economica", label: "Propuesta Económica" },
  ] as const

  return (
    <div>
      {/* Tab bar */}
      <div className="flex border-b border-gray-800 mb-4 overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              tab === t.key
                ? "border-blue-500 text-white"
                : "border-transparent text-gray-500 hover:text-gray-300"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Anexo Técnico tab */}
      {tab === "anexo" && (
        <div className="space-y-3">
          {requisitos.length === 0 ? (
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 text-center">
              <p className="text-gray-500 text-sm">No se extrajeron requisitos del Anexo Técnico para este análisis.</p>
            </div>
          ) : (
            <>
              {/* Resumen */}
              <div className="flex gap-4 bg-gray-900 border border-gray-800 rounded-lg p-4 text-xs">
                <span className="text-green-400">✓ {cumpleCount} cumple</span>
                <span className="text-red-400">✗ {noCumpleCount} no cumple</span>
                <span className="text-gray-500">? {pendienteCount} pendiente</span>
              </div>

              {/* Lista de requisitos */}
              <div className="space-y-3">
                {requisitos.map((req) => {
                  const resp = respuestas[req.numero] ?? { numero: req.numero, cumple: null, nota: "" }
                  return (
                    <div
                      key={req.numero}
                      className="bg-gray-900 border border-gray-800 rounded-lg p-4 space-y-3"
                    >
                      <div className="flex items-start gap-3">
                        <span className="text-gray-500 text-xs font-mono shrink-0 mt-0.5">{req.numero}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-gray-200 text-sm leading-relaxed">{req.texto}</p>
                          {req.evidencia_requerida && (
                            <p className="text-gray-500 text-xs mt-1">
                              Evidencia: {req.evidencia_requerida}
                            </p>
                          )}
                        </div>
                        <span
                          className={`shrink-0 text-xs px-2 py-0.5 rounded border font-medium ${RIESGO_COLORS[req.riesgo]}`}
                        >
                          {req.riesgo}
                        </span>
                      </div>

                      {/* Botones cumple/no cumple/pendiente */}
                      <div className="flex gap-2">
                        <button
                          onClick={() => setRespuesta(req.numero, { cumple: true })}
                          className={`flex-1 py-1.5 text-xs rounded-md border transition-colors ${
                            resp.cumple === true
                              ? "bg-green-900/60 border-green-700 text-green-300"
                              : "bg-gray-800 border-gray-700 text-gray-500 hover:text-green-400 hover:border-green-800"
                          }`}
                        >
                          ✓ Cumple
                        </button>
                        <button
                          onClick={() => setRespuesta(req.numero, { cumple: false })}
                          className={`flex-1 py-1.5 text-xs rounded-md border transition-colors ${
                            resp.cumple === false
                              ? "bg-red-900/60 border-red-700 text-red-300"
                              : "bg-gray-800 border-gray-700 text-gray-500 hover:text-red-400 hover:border-red-800"
                          }`}
                        >
                          ✗ No cumple
                        </button>
                        <button
                          onClick={() => setRespuesta(req.numero, { cumple: null })}
                          className={`flex-1 py-1.5 text-xs rounded-md border transition-colors ${
                            resp.cumple === null
                              ? "bg-gray-700 border-gray-600 text-gray-300"
                              : "bg-gray-800 border-gray-700 text-gray-500 hover:text-gray-300"
                          }`}
                        >
                          ? Pendiente
                        </button>
                      </div>

                      {/* Nota */}
                      <input
                        value={resp.nota}
                        onChange={(e) => setRespuesta(req.numero, { nota: e.target.value })}
                        placeholder="Nota de evidencia (opcional)"
                        className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-xs text-gray-200 placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  )
                })}
              </div>

              <button
                onClick={handleSaveAnexo}
                disabled={savingAnexo}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 text-white text-sm font-semibold rounded-md transition-colors"
              >
                {savingAnexo ? "Guardando..." : "Guardar revisión"}
              </button>
            </>
          )}
        </div>
      )}

      {/* Admin tab */}
      {tab === "admin" && (
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-5">
          <p className="text-gray-400 text-sm mb-4">
            Documentos requeridos en carpeta administrativa:
          </p>
          <ul className="space-y-2">
            {exp.carpeta_admin.documentos?.map((doc, i) => (
              <li key={i} className="flex items-center gap-3 text-sm">
                <div className="w-4 h-4 rounded border border-gray-600 shrink-0" />
                <span className="text-gray-300">{doc}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Técnica tab */}
      {tab === "tecnica" && (
        <div className="space-y-3">
          <textarea
            value={exp.propuesta_tecnica_draft ?? ""}
            onChange={(e) => setExp({ ...exp, propuesta_tecnica_draft: e.target.value })}
            className="w-full min-h-[400px] bg-gray-900 border border-gray-700 rounded-lg p-4 text-gray-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
          />
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 text-white text-sm rounded-md transition-colors"
            >
              {saving ? "Guardando..." : "Guardar cambios"}
            </button>
            <span className="text-gray-600 text-xs self-center">v{exp.version}</span>
          </div>
          <div className="flex gap-2 pt-2 border-t border-gray-800">
            <input
              value={instruccion}
              onChange={(e) => setInstruccion(e.target.value)}
              placeholder="Instrucción para la IA (ej: hazlo más formal)"
              className="flex-1 bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              onKeyDown={(e) => e.key === "Enter" && handleRefine()}
            />
            <button
              onClick={handleRefine}
              disabled={refining || !instruccion.trim()}
              className="px-3 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white text-sm rounded-md transition-colors"
            >
              {refining ? "..." : "Refinar con IA"}
            </button>
          </div>
        </div>
      )}

      {/* Económica tab */}
      {tab === "economica" && (
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-5 space-y-4">
          <div>
            <p className="text-gray-500 text-xs mb-1">Monto propuesto (óptimo)</p>
            <p className="text-white text-3xl font-bold">
              {fmt(exp.propuesta_economica.monto_propuesto)}
            </p>
          </div>
          <p className="text-gray-600 text-xs">
            Basado en análisis de adjudicaciones históricas para esta dependencia
          </p>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Actualizar la page del expediente para pasar `analisis`**

En `frontend/src/app/(app)/expediente/[id]/page.tsx`, actualizar el `useEffect` y el estado para cargar también el `analisis`:

Agregar estado: `const [analisis, setAnalisis] = useState<Analisis | null>(null)`

Importar `Analisis` del tipo: `import type { Expediente, Analisis } from "@/types"`

Actualizar el `useEffect` — reemplazar el bloque `.then((data) => {`:
```tsx
      .then((data) => {
        if (data) {
          setExpediente(data)
          return api.analisis.get(data.analisis_id)
        }
        return undefined
      })
      .then((analisisData) => {
        if (analisisData) {
          setAnalisis(analisisData)
        }
        setLoading(false)
      })
```

Actualizar la llamada al `ExpedienteEditor` pasando `analisis`:
```tsx
<ExpedienteEditor expediente={expediente} analisis={analisis} />
```

- [ ] **Step 5: Build del frontend y verificación visual**

```bash
cd frontend && npm run build 2>&1 | tail -20
```
Expected: sin errores de TypeScript.

Luego arrancar dev server:
```bash
cd frontend && npm run dev
```
Abrir `http://localhost:3000/expediente/<analisis_id>` y verificar:
- Tab "Anexo Técnico" aparece primero y activo por defecto
- Se ven los requisitos con badges de riesgo
- Los botones Cumple/No cumple/Pendiente cambian estado
- "Guardar revisión" funciona sin error 500
- ZIP descargado incluye `03_anexo_tecnico_revision.txt`

- [ ] **Step 6: Commit**

```bash
git add frontend/src/types/index.ts frontend/src/lib/api.ts frontend/src/components/expediente/ExpedienteEditor.tsx frontend/src/app/\(app\)/expediente/\[id\]/page.tsx
git commit -m "feat: Motor 2 - Anexo Técnico co-pilot editor with per-requirement review"
```
