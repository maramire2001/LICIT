# Anatomía Quirúrgica — Matrices + Bronce/Plata/Oro + ROI

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transformar el análisis genérico de licitaciones en una Anatomía Quirúrgica con tres matrices estructuradas (Humana/Materiales/Financiera), clasificación de complejidad (Bronce/Plata/Oro), y display de ROI operativo.

**Architecture:** (1) Migración BD con 5 columnas nuevas en `analisis`, (2) Modelo SQLAlchemy actualizado, (3) Pipeline de IA reestructurado con nuevo prompt Claude, (4) Tipos TypeScript actualizados, (5) PanelDecision rediseñado con matrices, badge de complejidad y banner ROI.

**Tech Stack:** PostgreSQL + Alembic, SQLAlchemy 2.0 async, FastAPI + Celery, Claude API (Anthropic), Next.js 16 + React 19 + TailwindCSS 4.

---

## Lógica de clasificación Bronce/Plata/Oro

Calculada en el servicio (no por Claude), basada en dependencia y monto:

```python
def clasificar_complejidad(dependencia: str, monto: float | None) -> str:
    ORO = ["IMSS", "ISSSTE", "PEMEX", "CFE", "SEDENA", "SEMAR", "CAPUFE", "FONATUR"]
    PLATA_KEYWORDS = ["ESTADO", "GOBIERNO DEL ESTADO", "MUNICIPIO", "SECRETARIA"]
    dep = (dependencia or "").upper()
    if any(k in dep for k in ORO):
        return "oro"
    if monto and monto >= 20_000_000:
        return "oro"
    if monto and monto >= 5_000_000:
        return "plata"
    if any(k in dep for k in PLATA_KEYWORDS):
        return "plata"
    return "bronce"
```

## ROI fijo por análisis

```python
ROI = {
    "horas_equipo": 72,
    "costo_por_hora_mxn": 350,
    "costo_total_mxn": 25_200,
    "tiempo_licit_ia": "180 segundos",
}
```

---

## Task 1: Migración BD — 5 nuevas columnas en analisis

**Files:**
- Create: `backend/alembic/versions/003_analisis_anatomia.py`

- [ ] **Step 1: Crear migración**

```python
# backend/alembic/versions/003_analisis_anatomia.py
"""add anatomia fields to analisis

Revision ID: 003
Revises: 002
Create Date: 2026-04-18
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = '003'
down_revision = '002'
branch_labels = None
depends_on = None

def upgrade() -> None:
    op.add_column('analisis',
        sa.Column('nivel_complejidad', sa.String(10), nullable=True))
    op.add_column('analisis',
        sa.Column('matriz_humana', postgresql.JSON(astext_type=sa.Text()), nullable=True))
    op.add_column('analisis',
        sa.Column('matriz_materiales', postgresql.JSON(astext_type=sa.Text()), nullable=True))
    op.add_column('analisis',
        sa.Column('matriz_financiera', postgresql.JSON(astext_type=sa.Text()), nullable=True))
    op.add_column('analisis',
        sa.Column('roi_datos', postgresql.JSON(astext_type=sa.Text()), nullable=True))

def downgrade() -> None:
    op.drop_column('analisis', 'roi_datos')
    op.drop_column('analisis', 'matriz_financiera')
    op.drop_column('analisis', 'matriz_materiales')
    op.drop_column('analisis', 'matriz_humana')
    op.drop_column('analisis', 'nivel_complejidad')
```

- [ ] **Step 2: Correr migración en Docker**

```bash
docker exec licit-ai-backend-1 alembic upgrade head
```

Salida esperada:
```
INFO  [alembic.runtime.migration] Running upgrade 002 -> 003, add anatomia fields to analisis
```

- [ ] **Step 3: Verificar columnas**

```bash
docker exec licit-ai-backend-1 python -c "
import asyncio
from app.core.database import engine
from sqlalchemy import text
async def check():
    async with engine.connect() as conn:
        r = await conn.execute(text(\"SELECT column_name FROM information_schema.columns WHERE table_name='analisis' ORDER BY column_name\"))
        print([row[0] for row in r.fetchall()])
asyncio.run(check())
"
```

Salida debe incluir: `matriz_financiera`, `matriz_humana`, `matriz_materiales`, `nivel_complejidad`, `roi_datos`

- [ ] **Step 4: Commit**

```bash
git add backend/alembic/versions/003_analisis_anatomia.py
git commit -m "feat: migration 003 - add nivel_complejidad, matrices, roi_datos to analisis"
```

---

## Task 2: Modelo SQLAlchemy — Analisis actualizado

**Files:**
- Modify: `backend/app/models/analisis.py`

- [ ] **Step 1: Reemplazar contenido completo**

```python
import uuid
from datetime import datetime
from sqlalchemy import String, Numeric, DateTime, JSON, Text
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base

class Analisis(Base):
    __tablename__ = "analisis"
    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    company_id: Mapped[uuid.UUID] = mapped_column()
    licitacion_id: Mapped[uuid.UUID] = mapped_column()
    status: Mapped[str] = mapped_column(String(20), default="procesando")
    viabilidad: Mapped[str | None] = mapped_column(String(30), nullable=True)
    score_viabilidad: Mapped[float | None] = mapped_column(Numeric, nullable=True)
    modelo_evaluacion_detectado: Mapped[str | None] = mapped_column(String(20), nullable=True)
    requisitos_criticos: Mapped[dict] = mapped_column(JSON, default=dict)
    riesgos: Mapped[dict] = mapped_column(JSON, default=dict)
    price_to_win_conservador: Mapped[float | None] = mapped_column(Numeric, nullable=True)
    ptw_optimo: Mapped[float | None] = mapped_column(Numeric, nullable=True)
    ptw_agresivo: Mapped[float | None] = mapped_column(Numeric, nullable=True)
    competidores: Mapped[dict] = mapped_column(JSON, default=dict)
    nivel_complejidad: Mapped[str | None] = mapped_column(String(10), nullable=True)
    matriz_humana: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    matriz_materiales: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    matriz_financiera: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    roi_datos: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
```

- [ ] **Step 2: Verificar import limpio**

```bash
docker exec licit-ai-backend-1 python -c "from app.models.analisis import Analisis; print('OK')"
```

- [ ] **Step 3: Commit**

```bash
git add backend/app/models/analisis.py
git commit -m "feat: add nivel_complejidad, matrices, roi_datos to Analisis model"
```

---

## Task 3: Pipeline de IA — Nuevo prompt Claude con matrices

**Files:**
- Modify: `backend/app/services/analisis_service.py`

Reemplazar el contenido completo del archivo:

- [ ] **Step 1: Escribir el nuevo servicio**

```python
import json
import uuid
from app.core.database import AsyncSessionLocal
from app.core.llm_client import chat
from app.models.analisis import Analisis
from app.models.licitacion import Licitacion, Adjudicacion
from app.models.expediente import Expediente
from sqlalchemy import select, func
import redis.asyncio as aioredis
from app.core.config import settings

ROI_FIJO = {
    "horas_equipo": 72,
    "costo_por_hora_mxn": 350,
    "costo_total_mxn": 25_200,
    "tiempo_licit_ia": "180 segundos",
}

DEPENDENCIAS_ORO = ["IMSS", "ISSSTE", "PEMEX", "CFE", "SEDENA", "SEMAR", "CAPUFE", "FONATUR"]
KEYWORDS_PLATA = ["ESTADO", "GOBIERNO DEL ESTADO", "MUNICIPIO", "SECRETARIA"]


def _clasificar_complejidad(dependencia: str, monto: float | None) -> str:
    dep = (dependencia or "").upper()
    if any(k in dep for k in DEPENDENCIAS_ORO):
        return "oro"
    if monto and monto >= 20_000_000:
        return "oro"
    if monto and monto >= 5_000_000:
        return "plata"
    if any(k in dep for k in KEYWORDS_PLATA):
        return "plata"
    return "bronce"


async def _publish_progress(analisis_id: str, step: str, pct: int):
    r = aioredis.from_url(settings.redis_url)
    try:
        await r.publish(
            f"analisis:{analisis_id}",
            json.dumps({"step": step, "progress": pct}),
        )
    finally:
        await r.aclose()


async def ejecutar_analisis(analisis_id: str, company_id: str, licitacion_id: str):
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(Analisis).where(Analisis.id == uuid.UUID(analisis_id))
        )
        analisis = result.scalar_one()

        lic_result = await db.execute(
            select(Licitacion).where(Licitacion.id == uuid.UUID(licitacion_id))
        )
        licitacion = lic_result.scalar_one()

        await _publish_progress(analisis_id, "Leyendo licitación", 10)

        licitacion_text = (
            f"Título: {licitacion.titulo}\n"
            f"Dependencia: {licitacion.dependencia}\n"
            f"Monto estimado: {licitacion.monto_estimado}\n"
            f"Datos adicionales: {json.dumps(licitacion.raw_json, ensure_ascii=False)[:4000]}"
        )

        await _publish_progress(analisis_id, "Construyendo anatomía con IA", 30)

        analysis_raw = await chat(
            messages=[
                {
                    "role": "system",
                    "content": (
                        "Eres un experto en licitaciones públicas mexicanas con 20 años de experiencia. "
                        "Realizas auditorías forenses de convocatorias gubernamentales. "
                        "Responde SIEMPRE en JSON válido, sin texto adicional."
                    ),
                },
                {
                    "role": "user",
                    "content": (
                        "Analiza esta licitación y devuelve un JSON con exactamente estas claves:\n"
                        "{\n"
                        '  "modelo_evaluacion": "binario" o "puntos",\n'
                        '  "viabilidad": "participar" o "con_condiciones" o "no_participar",\n'
                        '  "score_viabilidad": numero entre 0 y 100,\n'
                        '  "justificacion": "texto breve de 2-3 oraciones",\n'
                        '  "matriz_humana": [\n'
                        '    {"requisito": "descripcion del requisito de personal", "nivel_riesgo": "alto"|"medio"|"bajo"}\n'
                        "  ],\n"
                        '  "matriz_materiales": [\n'
                        '    {"requisito": "descripcion del requisito de equipo o material", "nivel_riesgo": "alto"|"medio"|"bajo"}\n'
                        "  ],\n"
                        '  "matriz_financiera": [\n'
                        '    {"requisito": "descripcion del requisito financiero o documental", "nivel_riesgo": "alto"|"medio"|"bajo"}\n'
                        "  ],\n"
                        '  "requisitos_criticos": ["lista de los 5 requisitos mas importantes"],\n'
                        '  "riesgos_descalificacion": ["lista de hasta 4 causas comunes de descalificacion en este tipo de licitacion"]\n'
                        "}\n\n"
                        "Reglas:\n"
                        "- matriz_humana: perfiles de personal, certificaciones, cantidades de elementos\n"
                        "- matriz_materiales: equipos, insumos, vehículos, tecnología requerida\n"
                        "- matriz_financiera: capital contable, liquidez, estados financieros, fianzas, seguros\n"
                        "- Cada matriz debe tener entre 2 y 5 items\n"
                        "- nivel_riesgo 'alto' = causa frecuente de descalificación\n\n"
                        f"Licitación:\n{licitacion_text}"
                    ),
                },
            ],
            response_format={"type": "json_object"},
        )
        analysis = json.loads(analysis_raw)

        await _publish_progress(analisis_id, "Consultando historial competitivo", 55)

        adj_result = await db.execute(
            select(Adjudicacion)
            .where(Adjudicacion.dependencia == licitacion.dependencia)
            .order_by(func.random())
            .limit(20)
        )
        adjudicaciones = adj_result.scalars().all()

        competidores: dict[str, dict] = {}
        for adj in adjudicaciones:
            name = adj.empresa_ganadora
            if name not in competidores:
                competidores[name] = {"wins": 0, "montos": []}
            competidores[name]["wins"] += 1
            if adj.monto_adjudicado:
                competidores[name]["montos"].append(float(adj.monto_adjudicado))

        top_competidores = sorted(
            competidores.items(), key=lambda x: x[1]["wins"], reverse=True
        )[:5]

        await _publish_progress(analisis_id, "Calculando Price to Win", 70)

        montos = [float(a.monto_adjudicado) for a in adjudicaciones if a.monto_adjudicado]
        monto_base = licitacion.monto_estimado or (sum(montos) / len(montos) if montos else 0)

        ptw_conservador = float(monto_base) * 0.95 if monto_base else None
        ptw_optimo = float(monto_base) * 0.88 if monto_base else None
        ptw_agresivo = float(monto_base) * 0.80 if monto_base else None

        nivel_complejidad = _clasificar_complejidad(
            licitacion.dependencia, float(monto_base) if monto_base else None
        )

        await _publish_progress(analisis_id, "Generando expediente v1", 85)

        propuesta_raw = await chat(
            messages=[
                {
                    "role": "system",
                    "content": "Eres experto en licitaciones públicas mexicanas. Genera propuestas profesionales.",
                },
                {
                    "role": "user",
                    "content": (
                        "Genera un borrador de propuesta técnica en español para esta licitación. "
                        "Incluye: introducción, metodología propuesta, experiencia relevante, equipo propuesto, y conclusión. "
                        "Máximo 800 palabras. Usa formato markdown.\n\n"
                        f"Licitación: {licitacion.titulo}\n"
                        f"Dependencia: {licitacion.dependencia}\n"
                        f"Requisitos críticos: {', '.join(analysis.get('requisitos_criticos', [])[:5])}"
                    ),
                },
            ],
        )

        expediente = Expediente(
            analisis_id=analisis.id,
            company_id=uuid.UUID(company_id),
            propuesta_tecnica_draft=propuesta_raw,
            checklist={"items": analysis.get("requisitos_criticos", [])},
            faltantes={"items": []},
            carpeta_admin={
                "documentos": [
                    "Acta constitutiva",
                    "RFC",
                    "Opinión SAT 32-D",
                    "Poder notarial",
                    "Estado de cuenta bancario",
                ]
            },
            propuesta_economica={
                "monto_propuesto": ptw_optimo,
                "desglose": [],
            },
        )
        db.add(expediente)

        analisis.status = "listo"
        analisis.viabilidad = analysis.get("viabilidad", "con_condiciones")
        analisis.score_viabilidad = analysis.get("score_viabilidad", 50)
        analisis.modelo_evaluacion_detectado = analysis.get("modelo_evaluacion", "binario")
        analisis.requisitos_criticos = {"items": analysis.get("requisitos_criticos", [])}
        analisis.riesgos = {"items": analysis.get("riesgos_descalificacion", [])}
        analisis.price_to_win_conservador = ptw_conservador
        analisis.ptw_optimo = ptw_optimo
        analisis.ptw_agresivo = ptw_agresivo
        analisis.competidores = {
            "top": [{"empresa": k, **v} for k, v in top_competidores]
        }
        analisis.nivel_complejidad = nivel_complejidad
        analisis.matriz_humana = {"items": analysis.get("matriz_humana", [])}
        analisis.matriz_materiales = {"items": analysis.get("matriz_materiales", [])}
        analisis.matriz_financiera = {"items": analysis.get("matriz_financiera", [])}
        analisis.roi_datos = ROI_FIJO

        await db.commit()
        await _publish_progress(analisis_id, "Análisis completo", 100)
```

- [ ] **Step 2: Verificar import en Docker**

```bash
docker exec licit-ai-backend-1 python -c "from app.services.analisis_service import ejecutar_analisis; print('OK')"
```

Salida esperada: `OK`

- [ ] **Step 3: Commit**

```bash
git add backend/app/services/analisis_service.py
git commit -m "feat: restructure analysis pipeline with anatomia matrices, Bronce/Plata/Oro classification, and ROI data"
```

---

## Task 4: Tipos TypeScript — Analisis interface actualizada

**Files:**
- Modify: `frontend/src/types/index.ts`

- [ ] **Step 1: Actualizar la interfaz Analisis**

Reemplazar el contenido completo de `frontend/src/types/index.ts`:

```typescript
export interface Licitacion {
  id: string
  numero_procedimiento: string
  titulo: string
  dependencia: string
  fecha_apertura: string | null
  monto_estimado: number | null
  estado: string
  score_relevancia: number
}

export interface MatrizItem {
  requisito: string
  nivel_riesgo: "alto" | "medio" | "bajo"
}

export interface RoiDatos {
  horas_equipo: number
  costo_por_hora_mxn: number
  costo_total_mxn: number
  tiempo_licit_ia: string
}

export interface Analisis {
  id: string
  licitacion_id: string
  status: "procesando" | "listo" | "error"
  viabilidad: "participar" | "con_condiciones" | "no_participar" | null
  score_viabilidad: number | null
  modelo_evaluacion_detectado: string | null
  requisitos_criticos: { items: string[] }
  riesgos: { items: string[] }
  price_to_win_conservador: number | null
  ptw_optimo: number | null
  ptw_agresivo: number | null
  competidores: { top: Competidor[] }
  nivel_complejidad: "bronce" | "plata" | "oro" | null
  matriz_humana: { items: MatrizItem[] } | null
  matriz_materiales: { items: MatrizItem[] } | null
  matriz_financiera: { items: MatrizItem[] } | null
  roi_datos: RoiDatos | null
  created_at: string
}

export interface Competidor {
  empresa: string
  wins: number
  montos: number[]
}

export interface Expediente {
  id: string
  analisis_id: string
  carpeta_admin: { documentos: string[] }
  propuesta_tecnica_draft: string | null
  propuesta_economica: { monto_propuesto: number | null; desglose: any[] }
  checklist: { items: string[] }
  faltantes: { items: string[] }
  version: number
}
```

- [ ] **Step 2: TypeScript check**

```bash
cd /Users/maramire2001/Desktop/LICIT-AI/frontend && npx tsc --noEmit 2>&1 | head -20
```

Salida esperada: sin errores.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/types/index.ts
git commit -m "feat: add MatrizItem, RoiDatos types and update Analisis interface with anatomia fields"
```

---

## Task 5: PanelDecision — Anatomía visual con matrices, badge y ROI

**Files:**
- Modify: `frontend/src/components/analisis/PanelDecision.tsx`

Reemplazar el contenido completo:

- [ ] **Step 1: Escribir el nuevo PanelDecision**

```tsx
"use client"
import Link from "next/link"
import { useState } from "react"
import type { Analisis, MatrizItem } from "@/types"
import { Semaforo } from "./Semaforo"
import { PriceToWin } from "./PriceToWin"

const COMPLEJIDAD_CONFIG = {
  bronce: { label: "Bronce", color: "text-amber-600 border-amber-600 bg-amber-950" },
  plata: { label: "Plata", color: "text-gray-300 border-gray-500 bg-gray-800" },
  oro: { label: "Oro", color: "text-yellow-400 border-yellow-500 bg-yellow-950" },
}

const RIESGO_COLOR = {
  alto: "text-red-400",
  medio: "text-yellow-400",
  bajo: "text-green-400",
}

function MatrizSection({
  titulo,
  items,
}: {
  titulo: string
  items: MatrizItem[]
}) {
  const [open, setOpen] = useState(false)
  if (!items.length) return null
  return (
    <div className="border-b border-gray-800 last:border-0">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex justify-between items-center py-2.5 text-left"
      >
        <span className="text-gray-300 text-sm font-medium">{titulo}</span>
        <span className="text-gray-500 text-xs">{open ? "▲" : "▼"} {items.length} requisitos</span>
      </button>
      {open && (
        <ul className="pb-3 space-y-2">
          {items.map((item, i) => (
            <li key={i} className="flex gap-2 items-start text-xs">
              <span className={`shrink-0 font-medium mt-0.5 ${RIESGO_COLOR[item.nivel_riesgo]}`}>
                {item.nivel_riesgo.toUpperCase()}
              </span>
              <span className="text-gray-400">{item.requisito}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export function PanelDecision({ analisis }: { analisis: Analisis }) {
  const complejidad = analisis.nivel_complejidad
    ? COMPLEJIDAD_CONFIG[analisis.nivel_complejidad]
    : null

  const tieneMatrices =
    analisis.matriz_humana?.items.length ||
    analisis.matriz_materiales?.items.length ||
    analisis.matriz_financiera?.items.length

  return (
    <div className="space-y-4">
      {/* Badge complejidad + Semaforo */}
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-5">
        {complejidad && (
          <div className="flex justify-end mb-3">
            <span className={`text-xs font-semibold border rounded-full px-3 py-1 ${complejidad.color}`}>
              Nivel {complejidad.label}
            </span>
          </div>
        )}
        <Semaforo
          viabilidad={analisis.viabilidad!}
          score={analisis.score_viabilidad}
        />
        <p className="text-gray-600 text-xs mt-3">
          Modelo de evaluación:{" "}
          <span className="text-gray-400">
            {analisis.modelo_evaluacion_detectado ?? "—"}
          </span>
        </p>
        <p className="text-gray-600 text-xs mt-2">
          Índice estimado basado en datos históricos y perfil declarado. No constituye garantía de adjudicación.
        </p>
      </div>

      {/* Banner ROI */}
      {analisis.roi_datos && (
        <div className="bg-emerald-950 border border-emerald-800 rounded-lg p-4">
          <p className="text-emerald-400 text-xs font-semibold mb-1">Eficiencia operativa</p>
          <p className="text-emerald-300 text-sm">
            Análisis completado en{" "}
            <span className="font-bold">{analisis.roi_datos.tiempo_licit_ia}</span>.
            Su equipo habría tardado{" "}
            <span className="font-bold">{analisis.roi_datos.horas_equipo} horas</span> y costado{" "}
            <span className="font-bold">
              ${analisis.roi_datos.costo_total_mxn.toLocaleString("es-MX")} MXN
            </span>{" "}
            en honorarios profesionales.
          </p>
        </div>
      )}

      {/* Matrices de Anatomía */}
      {tieneMatrices ? (
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-5">
          <h3 className="text-white text-sm font-semibold mb-3">Anatomía de la convocatoria</h3>
          <MatrizSection
            titulo="Matriz Humana — Personal y certificaciones"
            items={analisis.matriz_humana?.items ?? []}
          />
          <MatrizSection
            titulo="Matriz de Materiales — Equipo e insumos"
            items={analisis.matriz_materiales?.items ?? []}
          />
          <MatrizSection
            titulo="Matriz Financiera — Capital y documentos"
            items={analisis.matriz_financiera?.items ?? []}
          />
        </div>
      ) : null}

      {/* Price to Win */}
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-5">
        <h3 className="text-white text-sm font-semibold mb-3">Price to Win</h3>
        <PriceToWin
          conservador={analisis.price_to_win_conservador}
          optimo={analisis.ptw_optimo}
          agresivo={analisis.ptw_agresivo}
        />
      </div>

      {/* Competidores históricos */}
      {analisis.competidores.top?.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-5">
          <h3 className="text-white text-sm font-semibold mb-3">
            Competidores históricos
          </h3>
          <div className="space-y-2">
            {analisis.competidores.top.slice(0, 3).map((c) => (
              <div
                key={c.empresa}
                className="flex justify-between items-center text-sm"
              >
                <span className="text-gray-300 truncate flex-1 mr-2">{c.empresa}</span>
                <span className="text-xs text-gray-500 shrink-0">
                  {c.wins} {c.wins === 1 ? "victoria" : "victorias"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Requisitos críticos */}
      {analisis.requisitos_criticos.items?.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-5">
          <h3 className="text-white text-sm font-semibold mb-3">Requisitos críticos</h3>
          <ul className="space-y-1.5">
            {analisis.requisitos_criticos.items.slice(0, 6).map((req, i) => (
              <li key={i} className="flex gap-2 text-xs text-gray-400">
                <span className="text-blue-400 shrink-0 mt-0.5">•</span>
                {req}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Riesgos */}
      {analisis.riesgos.items?.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-5">
          <h3 className="text-white text-sm font-semibold mb-3">Riesgos de descalificación</h3>
          <ul className="space-y-1.5">
            {analisis.riesgos.items.slice(0, 4).map((r, i) => (
              <li key={i} className="flex gap-2 text-xs text-red-400">
                <span className="shrink-0 mt-0.5">⚠</span>
                {r}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* CTA */}
      <Link
        href={`/expediente/${analisis.id}`}
        className="block w-full text-center bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
      >
        Ver expediente generado →
      </Link>
    </div>
  )
}
```

- [ ] **Step 2: TypeScript check**

```bash
cd /Users/maramire2001/Desktop/LICIT-AI/frontend && npx tsc --noEmit 2>&1 | head -20
```

Salida esperada: sin errores.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/analisis/PanelDecision.tsx
git commit -m "feat: redesign PanelDecision with Bronce/Plata/Oro badge, ROI banner, and anatomia matrices accordion"
```
