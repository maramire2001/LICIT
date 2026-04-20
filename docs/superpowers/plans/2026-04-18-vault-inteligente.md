# Vault Inteligente — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Conectar el Vault con el análisis de cada licitación: la app genera automáticamente la lista específica de documentos que el cliente necesita subir, cruza con lo que ya tiene en el vault, y muestra el gap en la página del expediente.

**Architecture:** (1) Nuevo endpoint backend que extrae doc requirements del análisis via keyword matching y cruza contra vault existente. (2) Actualizar AnalisisResponse schema para exponer campos nuevos. (3) Expandir tipos de documentos en el frontend. (4) Sección "Documentos requeridos" en la página de expediente. (5) Actualizar api.ts.

**Tech Stack:** FastAPI, SQLAlchemy async, Next.js 16 + TailwindCSS 4.

---

## Lógica de extracción de documentos requeridos

Keyword matching sobre `requisitos_criticos.items` + items de matrices. Sin llamada a Claude — más rápido y sin costo extra.

```python
KEYWORD_MAP = [
    (["repse"], "repse", "Registro REPSE vigente ante STPS"),
    (["iso 9001", "iso9001"], "iso9001", "Certificación ISO 9001:2015"),
    (["iso 27001", "iso27001"], "iso27001", "Certificación ISO 27001"),
    (["acta constitutiva", "acta"], "acta", "Acta Constitutiva"),
    (["rfc", "constancia fiscal"], "rfc", "Constancia de Situación Fiscal RFC"),
    (["sat", "opinión de cumplimiento", "32-d", "32d"], "sat32d", "Opinión de Cumplimiento SAT 32-D"),
    (["infonavit", "cumplimiento ante infonavit"], "infonavit", "Opinión de Cumplimiento INFONAVIT"),
    (["poder notarial", "representante legal"], "poder", "Poder Notarial del representante"),
    (["estado de cuenta", "cuenta bancaria"], "estado_cuenta", "Estado de cuenta bancario (últimos 3 meses)"),
    (["fianza", "garantía de seriedad"], "fianza", "Póliza de fianza de seriedad"),
    (["seguro", "póliza"], "seguro", "Póliza de seguro de responsabilidad civil"),
]

def extraer_docs_requeridos(requisitos: list[str], matrices: list[dict]) -> list[dict]:
    todos = [r.lower() for r in requisitos]
    for m in matrices:
        todos.append(m.get("requisito", "").lower())
    
    encontrados = {}
    for keywords, tipo, descripcion in KEYWORD_MAP:
        for texto in todos:
            if any(kw in texto for kw in keywords):
                if tipo not in encontrados:
                    encontrados[tipo] = descripcion
                break
    
    # Siempre requerir acta + rfc como base
    for tipo, desc in [("acta", "Acta Constitutiva"), ("rfc", "Constancia de Situación Fiscal RFC")]:
        if tipo not in encontrados:
            encontrados[tipo] = desc
    
    return [{"tipo": k, "descripcion": v} for k, v in encontrados.items()]
```

---

## Task 1: Backend — nuevo endpoint de requerimiento vault

**Files:**
- Modify: `backend/app/api/vault.py`

- [ ] **Step 1: Agregar imports y función helper al tope del archivo**

Agregar después de los imports existentes:

```python
from app.models.analisis import Analisis

KEYWORD_MAP = [
    (["repse"], "repse", "Registro REPSE vigente ante STPS"),
    (["iso 9001", "iso9001"], "iso9001", "Certificación ISO 9001:2015"),
    (["iso 27001", "iso27001"], "iso27001", "Certificación ISO 27001"),
    (["acta constitutiva", "acta"], "acta", "Acta Constitutiva"),
    (["rfc", "constancia fiscal"], "rfc", "Constancia de Situación Fiscal RFC"),
    (["sat", "opinión de cumplimiento", "32-d", "32d"], "sat32d", "Opinión de Cumplimiento SAT 32-D"),
    (["infonavit", "cumplimiento ante infonavit"], "infonavit", "Opinión de Cumplimiento INFONAVIT"),
    (["poder notarial", "representante legal"], "poder", "Poder Notarial del representante"),
    (["estado de cuenta", "cuenta bancaria"], "estado_cuenta", "Estado de cuenta bancario (últimos 3 meses)"),
    (["fianza", "garantía de seriedad"], "fianza", "Póliza de fianza de seriedad"),
    (["seguro", "póliza"], "seguro", "Póliza de seguro de responsabilidad civil"),
]

def _extraer_docs_requeridos(requisitos: list, matrices: list) -> list[dict]:
    textos = [str(r).lower() for r in requisitos]
    for m in matrices:
        textos.append(str(m.get("requisito", "")).lower())

    encontrados: dict[str, str] = {}
    for keywords, tipo, descripcion in KEYWORD_MAP:
        for texto in textos:
            if any(kw in texto for kw in keywords):
                if tipo not in encontrados:
                    encontrados[tipo] = descripcion
                break

    for tipo, desc in [("acta", "Acta Constitutiva"), ("rfc", "Constancia de Situación Fiscal RFC")]:
        if tipo not in encontrados:
            encontrados[tipo] = desc

    return [{"tipo": k, "descripcion": v} for k, v in encontrados.items()]
```

- [ ] **Step 2: Agregar el endpoint al final del archivo**

```python
@router.get("/requerimiento/{analisis_id}")
async def requerimiento_vault(
    analisis_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Devuelve los documentos requeridos para una licitación y cuáles ya están en el vault."""
    if not current_user.company_id:
        raise HTTPException(400, "Completa el onboarding primero")

    analisis_result = await db.execute(
        select(Analisis).where(Analisis.id == uuid.UUID(analisis_id))
    )
    analisis = analisis_result.scalar_one_or_none()
    if not analisis:
        raise HTTPException(404, "Análisis no encontrado")

    requisitos = (analisis.requisitos_criticos or {}).get("items", [])
    matrices_items = []
    for campo in [analisis.matriz_humana, analisis.matriz_materiales, analisis.matriz_financiera]:
        if campo:
            matrices_items.extend(campo.get("items", []))

    requeridos = _extraer_docs_requeridos(requisitos, matrices_items)

    vault_result = await db.execute(
        select(VaultDocumento).where(VaultDocumento.company_id == current_user.company_id)
    )
    vault_docs = vault_result.scalars().all()
    vault_tipos = {d.tipo: str(d.id) for d in vault_docs}

    return [
        {
            "tipo": r["tipo"],
            "descripcion": r["descripcion"],
            "cubierto": r["tipo"] in vault_tipos,
            "vault_doc_id": vault_tipos.get(r["tipo"]),
        }
        for r in requeridos
    ]
```

- [ ] **Step 3: Verificar import en Docker**

```bash
docker exec licit-ai-backend-1 python -c "from app.api.vault import router; print('OK')"
```

- [ ] **Step 4: Commit**

```bash
git add backend/app/api/vault.py
git commit -m "feat: add vault requerimiento endpoint - extracts required docs from analysis and cross-references vault"
```

---

## Task 2: Schema — AnalisisResponse con campos nuevos

**Files:**
- Modify: `backend/app/schemas/analisis.py`

El schema actual no expone `nivel_complejidad`, `matriz_humana`, `matriz_materiales`, `matriz_financiera`, `roi_datos`. El frontend los necesita.

- [ ] **Step 1: Reemplazar contenido de `backend/app/schemas/analisis.py`**

```python
from pydantic import BaseModel
from datetime import datetime
import uuid

class AnalisisCreate(BaseModel):
    licitacion_id: uuid.UUID

class AnalisisResponse(BaseModel):
    id: uuid.UUID
    licitacion_id: uuid.UUID
    status: str
    viabilidad: str | None
    score_viabilidad: float | None
    modelo_evaluacion_detectado: str | None
    requisitos_criticos: dict
    riesgos: dict
    price_to_win_conservador: float | None
    ptw_optimo: float | None
    ptw_agresivo: float | None
    competidores: dict
    nivel_complejidad: str | None = None
    matriz_humana: dict | None = None
    matriz_materiales: dict | None = None
    matriz_financiera: dict | None = None
    roi_datos: dict | None = None
    created_at: datetime

    model_config = {"from_attributes": True}
```

- [ ] **Step 2: Verificar**

```bash
docker exec licit-ai-backend-1 python -c "from app.schemas.analisis import AnalisisResponse; print('OK')"
```

- [ ] **Step 3: Commit**

```bash
git add backend/app/schemas/analisis.py
git commit -m "feat: expose nivel_complejidad, matrices, roi_datos in AnalisisResponse schema"
```

---

## Task 3: Frontend — api.ts + tipos vault

**Files:**
- Modify: `frontend/src/lib/api.ts`
- Modify: `frontend/src/app/(app)/vault/page.tsx`

- [ ] **Step 1: Agregar método vault.requerimiento en `frontend/src/lib/api.ts`**

En el objeto `vault`, agregar después de `list`:

```typescript
requerimiento: (analisis_id: string) =>
  apiFetch<any[]>(`/api/vault/requerimiento/${analisis_id}`),
```

- [ ] **Step 2: Expandir TIPOS en `frontend/src/app/(app)/vault/page.tsx`**

Reemplazar el array TIPOS con:

```typescript
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
```

- [ ] **Step 3: TypeScript check**

```bash
cd /Users/maramire2001/Desktop/LICIT-AI/frontend && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/lib/api.ts frontend/src/app/(app)/vault/page.tsx
git commit -m "feat: add vault.requerimiento API method and expand vault document types"
```

---

## Task 4: Frontend — sección "Documentos requeridos" en expediente page

**Files:**
- Modify: `frontend/src/app/(app)/expediente/[id]/page.tsx`

La página de expediente recibe `params.id` que es el `analisis_id` (el endpoint `GET /api/expediente/{analisis_id}` lo usa así). El mismo ID sirve para `GET /api/vault/requerimiento/{analisis_id}`.

- [ ] **Step 1: Reemplazar contenido de `frontend/src/app/(app)/expediente/[id]/page.tsx`**

```tsx
"use client"
export const dynamic = "force-dynamic"
import { useEffect, useState } from "react"
import { api } from "@/lib/api"
import type { Expediente } from "@/types"
import { ExpedienteEditor } from "@/components/expediente/ExpedienteEditor"
import Link from "next/link"

type DocRequerido = {
  tipo: string
  descripcion: string
  cubierto: boolean
  vault_doc_id: string | null
}

function VaultGap({ analisisId }: { analisisId: string }) {
  const [docs, setDocs] = useState<DocRequerido[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.vault
      .requerimiento(analisisId)
      .then(setDocs)
      .catch(() => setDocs([]))
      .finally(() => setLoading(false))
  }, [analisisId])

  if (loading) return null

  const faltantes = docs.filter((d) => !d.cubierto)
  const cubiertos = docs.filter((d) => d.cubierto)

  if (docs.length === 0) return null

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-5 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-white text-sm font-semibold">Documentos requeridos para esta licitación</h2>
        {faltantes.length > 0 && (
          <Link
            href="/vault"
            className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
          >
            Subir al Vault →
          </Link>
        )}
      </div>

      {faltantes.length > 0 && (
        <div className="mb-4">
          <p className="text-red-400 text-xs font-medium mb-2">
            Faltan {faltantes.length} documento{faltantes.length !== 1 ? "s" : ""}
          </p>
          <ul className="space-y-2">
            {faltantes.map((doc) => (
              <li key={doc.tipo} className="flex items-start gap-2 text-xs">
                <span className="text-red-400 shrink-0 mt-0.5">✗</span>
                <span className="text-gray-300">{doc.descripcion}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {cubiertos.length > 0 && (
        <div>
          {faltantes.length > 0 && <div className="border-t border-gray-800 my-3" />}
          <p className="text-green-400 text-xs font-medium mb-2">
            {cubiertos.length} documento{cubiertos.length !== 1 ? "s" : ""} en el Vault
          </p>
          <ul className="space-y-2">
            {cubiertos.map((doc) => (
              <li key={doc.tipo} className="flex items-start gap-2 text-xs">
                <span className="text-green-400 shrink-0 mt-0.5">✓</span>
                <span className="text-gray-500">{doc.descripcion}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

export default function ExpedientePage({
  params,
}: {
  params: { id: string }
}) {
  const [expediente, setExpediente] = useState<Expediente | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    api.expediente
      .get(params.id)
      .then((data) => {
        setExpediente(data)
        setLoading(false)
      })
      .catch(() => {
        setError("Expediente no encontrado o análisis aún en proceso")
        setLoading(false)
      })
  }, [params.id])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-gray-500 text-sm">Cargando expediente...</div>
      </div>
    )
  }

  if (error || !expediente) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 text-sm mb-4">{error}</p>
          <Link href="/dashboard" className="text-blue-400 text-sm hover:underline">
            ← Volver al dashboard
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 p-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-white">
              Expediente v{expediente.version}
            </h1>
            <p className="text-gray-500 text-sm mt-0.5">
              Revisión y ajuste del borrador generado por IA
            </p>
          </div>
          <Link
            href="/dashboard"
            className="text-gray-500 hover:text-gray-300 text-sm transition-colors"
          >
            ← Dashboard
          </Link>
        </div>

        <VaultGap analisisId={params.id} />
        <ExpedienteEditor expediente={expediente} />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: TypeScript check**

```bash
cd /Users/maramire2001/Desktop/LICIT-AI/frontend && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/app/(app)/expediente/[id]/page.tsx
git commit -m "feat: add VaultGap component to expediente page - shows required vs available documents"
```
