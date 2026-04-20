# Motor 1 — PDF Analysis Real Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the fake analysis (title + 4000 chars of metadata sent to Claude) with real PDF analysis: download the convocatoria PDF from CompraNet on "Me interesa" click, OCR it with PyMuPDF, send full text to Claude, extract numbered Anexo Técnico requirements point-by-point, and store them for Motor 2.

**Architecture:** Lazy PDF fetch on user intent (not pre-emptive). New `pdf_downloader.py` service handles download + OCR caching in `licitacion_docs.texto_ocr`. `analisis_service.py` calls it before sending to Claude. New `requisitos_anexo` array added to Claude prompt output and stored in `analisis.anexo_tecnico_requisitos`. Manual PDF upload endpoint for non-CompraNet sources. Light email notification when crawler finds new licitaciones (3x/day).

**Tech Stack:** FastAPI, SQLAlchemy async, Celery + Redis, PyMuPDF (pymupdf), httpx, Claude Sonnet 4.5 (200k ctx), Python smtplib.

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `backend/app/services/pdf_downloader.py` | Create | Download PDF from OCDS URL, OCR, cache in DB |
| `backend/app/services/notificaciones.py` | Create | Send email alert when new licitaciones found |
| `backend/app/models/analisis.py` | Modify | Add `anexo_tecnico_requisitos` JSON field |
| `backend/alembic/versions/006_anexo_tecnico.py` | Create | DB migration for new field |
| `backend/app/schemas/analisis.py` | Modify | Expose `anexo_tecnico_requisitos` in API response |
| `backend/app/services/analisis_service.py` | Modify | Use real OCR text, new Claude prompt, save requisitos |
| `backend/app/api/licitaciones.py` | Modify | Add `POST /{id}/docs/upload` endpoint |
| `backend/app/workers/ingesta.py` | Modify | Count new records, trigger email notification |
| `backend/app/workers/celery_app.py` | Modify | Beat schedule: 3x/day (6am, 12pm, 6pm MX) |
| `backend/app/core/config.py` | Modify | Add optional email/SMTP config fields |
| `backend/tests/test_pdf_downloader.py` | Create | Unit tests for URL extraction + OCR caching logic |
| `backend/tests/test_notificaciones.py` | Create | Unit test for email message formatting |

---

## Task 1: PDF Downloader Service

**Files:**
- Create: `backend/app/services/pdf_downloader.py`
- Create: `backend/tests/test_pdf_downloader.py`

- [ ] **Step 1: Write the failing tests**

```python
# backend/tests/test_pdf_downloader.py
from unittest.mock import MagicMock
from app.services.pdf_downloader import _find_pdf_url, MAX_OCR_CHARS


def _lic(raw_json=None, url_fuente=None):
    m = MagicMock()
    m.raw_json = raw_json or {}
    m.url_fuente = url_fuente
    return m


def test_find_pdf_url_from_documents_by_format():
    lic = _lic(raw_json={
        "tender": {
            "documents": [
                {"format": "application/pdf", "url": "https://example.com/bases.pdf"},
            ]
        }
    })
    assert _find_pdf_url(lic) == "https://example.com/bases.pdf"


def test_find_pdf_url_from_documents_by_extension():
    lic = _lic(raw_json={
        "tender": {
            "documents": [
                {"format": "text/html", "url": "https://example.com/bases.pdf"},
            ]
        }
    })
    assert _find_pdf_url(lic) == "https://example.com/bases.pdf"


def test_find_pdf_url_fallback_to_url_fuente():
    lic = _lic(raw_json={}, url_fuente="https://example.com/page")
    assert _find_pdf_url(lic) == "https://example.com/page"


def test_find_pdf_url_returns_none_when_nothing():
    lic = _lic()
    assert _find_pdf_url(lic) is None


def test_max_ocr_chars_is_180k():
    assert MAX_OCR_CHARS == 180_000
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd /Users/maramire2001/Desktop/LICIT-AI/backend
python -m pytest tests/test_pdf_downloader.py -v
```

Expected: `ImportError: cannot import name '_find_pdf_url'`

- [ ] **Step 3: Implement the service**

```python
# backend/app/services/pdf_downloader.py
import httpx
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.licitacion import Licitacion, LicitacionDoc
from app.services.ocr import extract_text_from_bytes
import uuid

MAX_OCR_CHARS = 180_000  # ~90k tokens, leaves room for prompt + response in 200k ctx


def _find_pdf_url(licitacion: Licitacion) -> str | None:
    """Find PDF URL from OCDS tender.documents, fall back to url_fuente."""
    docs = (licitacion.raw_json or {}).get("tender", {}).get("documents", [])
    for doc in docs:
        fmt = doc.get("format", "")
        url = doc.get("url", "")
        if "pdf" in fmt.lower() or url.lower().endswith(".pdf"):
            return url
    return licitacion.url_fuente or None


async def download_pdf_bytes(url: str) -> bytes:
    async with httpx.AsyncClient(timeout=60, follow_redirects=True) as client:
        r = await client.get(url)
        r.raise_for_status()
        return r.content


async def get_or_fetch_ocr(db: AsyncSession, licitacion: Licitacion) -> str:
    """Return cached OCR text or download, OCR, and cache the PDF. Returns '' if no PDF found."""
    result = await db.execute(
        select(LicitacionDoc).where(
            LicitacionDoc.licitacion_id == licitacion.id,
            LicitacionDoc.tipo == "convocatoria",
        )
    )
    doc = result.scalar_one_or_none()
    if doc and doc.texto_ocr:
        return doc.texto_ocr[:MAX_OCR_CHARS]

    pdf_url = _find_pdf_url(licitacion)
    if not pdf_url:
        return ""

    try:
        pdf_bytes = await download_pdf_bytes(pdf_url)
    except Exception:
        return ""

    texto = extract_text_from_bytes(pdf_bytes)
    texto_truncado = texto[:MAX_OCR_CHARS]

    if doc:
        doc.texto_ocr = texto_truncado
    else:
        doc = LicitacionDoc(
            licitacion_id=licitacion.id,
            tipo="convocatoria",
            url=pdf_url,
            texto_ocr=texto_truncado,
        )
        db.add(doc)
    # Caller commits after analisis update

    return texto_truncado
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd /Users/maramire2001/Desktop/LICIT-AI/backend
python -m pytest tests/test_pdf_downloader.py -v
```

Expected: 5 tests pass.

- [ ] **Step 5: Commit**

```bash
git add backend/app/services/pdf_downloader.py backend/tests/test_pdf_downloader.py
git commit -m "feat: pdf_downloader service — download, OCR, and cache convocatoria PDFs"
```

---

## Task 2: DB Schema — anexo_tecnico_requisitos

**Files:**
- Modify: `backend/app/models/analisis.py`
- Create: `backend/alembic/versions/006_anexo_tecnico.py`
- Modify: `backend/app/schemas/analisis.py`

- [ ] **Step 1: Add field to the model**

In `backend/app/models/analisis.py`, add after line 26 (after `roi_datos`):

```python
    anexo_tecnico_requisitos: Mapped[dict | None] = mapped_column(JSON, nullable=True)
```

Full model after change (lines 7–31):
```python
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
    anexo_tecnico_requisitos: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    pago_status: Mapped[str] = mapped_column(String(20), default="pendiente")
    pago_monto: Mapped[float | None] = mapped_column(Numeric, nullable=True)
    comprobante_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
```

- [ ] **Step 2: Create migration 006**

```python
# backend/alembic/versions/006_anexo_tecnico.py
"""add anexo_tecnico_requisitos to analisis

Revision ID: 006
Revises: 005
Create Date: 2026-04-19
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "006"
down_revision = "005"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "analisis",
        sa.Column(
            "anexo_tecnico_requisitos",
            postgresql.JSON(astext_type=sa.Text()),
            nullable=True,
        ),
    )


def downgrade():
    op.drop_column("analisis", "anexo_tecnico_requisitos")
```

- [ ] **Step 3: Add field to response schema**

In `backend/app/schemas/analisis.py`, add after `roi_datos`:

```python
    anexo_tecnico_requisitos: dict | None = None
```

Full schema after change:
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
    anexo_tecnico_requisitos: dict | None = None
    pago_status: str = "pendiente"
    comprobante_url: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}
```

- [ ] **Step 4: Apply migration (requires docker compose up)**

```bash
cd /Users/maramire2001/Desktop/LICIT-AI
docker compose exec backend alembic upgrade head
```

Expected output ends with: `Running upgrade 005 -> 006, add anexo_tecnico_requisitos to analisis`

- [ ] **Step 5: Commit**

```bash
git add backend/app/models/analisis.py \
        backend/alembic/versions/006_anexo_tecnico.py \
        backend/app/schemas/analisis.py
git commit -m "feat: add anexo_tecnico_requisitos field to Analisis model + migration 006"
```

---

## Task 3: Rewire analisis_service.py — Real PDF Analysis

**Files:**
- Modify: `backend/app/services/analisis_service.py`

This is the core change. The service must:
1. Call `get_or_fetch_ocr` to get full PDF text before sending to Claude
2. Build a richer `licitacion_text` with the full OCR content
3. Send a new prompt that extracts numbered Anexo Técnico requirements (`requisitos_anexo`)
4. Update progress step messages to reflect what's actually happening
5. Save `analisis.anexo_tecnico_requisitos = {"items": analysis.get("requisitos_anexo", [])}`

- [ ] **Step 1: Write a test for the OCR integration hook**

In `backend/tests/test_pdf_downloader.py`, add at the bottom:

```python
import pytest
from unittest.mock import AsyncMock, patch, MagicMock


@pytest.mark.asyncio
async def test_get_or_fetch_ocr_returns_cached_text():
    from app.services.pdf_downloader import get_or_fetch_ocr

    cached_doc = MagicMock()
    cached_doc.texto_ocr = "Texto del PDF ya cacheado"

    mock_db = AsyncMock()
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = cached_doc
    mock_db.execute = AsyncMock(return_value=mock_result)

    lic = MagicMock()
    lic.id = "test-id"

    result = await get_or_fetch_ocr(mock_db, lic)
    assert result == "Texto del PDF ya cacheado"


@pytest.mark.asyncio
async def test_get_or_fetch_ocr_returns_empty_when_no_url():
    from app.services.pdf_downloader import get_or_fetch_ocr

    mock_db = AsyncMock()
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = None
    mock_db.execute = AsyncMock(return_value=mock_result)

    lic = MagicMock()
    lic.id = "test-id"
    lic.raw_json = {}
    lic.url_fuente = None

    result = await get_or_fetch_ocr(mock_db, lic)
    assert result == ""
```

- [ ] **Step 2: Run new tests to verify they fail (import error expected)**

```bash
cd /Users/maramire2001/Desktop/LICIT-AI/backend
pip install pytest-asyncio
python -m pytest tests/test_pdf_downloader.py -v
```

Expected: The two async tests fail with `get_or_fetch_ocr` not accepting those args, or pass if already implemented — just confirm test setup works.

- [ ] **Step 3: Rewrite analisis_service.py**

Full replacement of `backend/app/services/analisis_service.py`:

```python
import json
import uuid
from app.core.database import AsyncSessionLocal
from app.core.llm_client import chat
from app.models.analisis import Analisis
from app.models.licitacion import Licitacion, Adjudicacion
from app.models.expediente import Expediente
from app.services.pdf_downloader import get_or_fetch_ocr
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

        await _publish_progress(analisis_id, "Descargando bases de licitación (PDF)", 10)

        texto_ocr = await get_or_fetch_ocr(db, licitacion)

        if texto_ocr:
            licitacion_text = (
                f"Título: {licitacion.titulo}\n"
                f"Dependencia: {licitacion.dependencia}\n"
                f"Monto estimado: {licitacion.monto_estimado}\n\n"
                f"--- TEXTO COMPLETO DE LAS BASES (OCR) ---\n{texto_ocr}"
            )
        else:
            licitacion_text = (
                f"Título: {licitacion.titulo}\n"
                f"Dependencia: {licitacion.dependencia}\n"
                f"Monto estimado: {licitacion.monto_estimado}\n"
                f"Datos adicionales: {json.dumps(licitacion.raw_json, ensure_ascii=False)[:4000]}\n"
                f"NOTA: No se pudo descargar el PDF de las bases. Análisis basado solo en metadatos."
            )

        await _publish_progress(analisis_id, "Extrayendo requisitos técnicos con IA", 25)

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
                        '  "riesgos_descalificacion": ["lista de hasta 4 causas comunes de descalificacion en este tipo de licitacion"],\n'
                        '  "requisitos_anexo": [\n'
                        '    {\n'
                        '      "numero": "identificador del punto en las bases, ej: 3.1 o IV.2.a",\n'
                        '      "texto": "texto exacto o parafraseo fiel del requisito tal como aparece en las bases",\n'
                        '      "categoria": "legal" o "tecnico" o "financiero",\n'
                        '      "riesgo": "alto" o "medio" o "bajo",\n'
                        '      "evidencia_requerida": "documento o acreditacion especifica que exige este punto"\n'
                        "    }\n"
                        "  ]\n"
                        "}\n\n"
                        "Reglas para requisitos_anexo:\n"
                        "- Extrae TODOS los requisitos numerados del Anexo Técnico y bases de licitación\n"
                        "- Usa el número/identificador exacto que aparece en el documento\n"
                        "- Si no hay PDF disponible, genera requisitos típicos para este tipo de licitación\n"
                        "- Incluye entre 5 y 30 items\n\n"
                        "Reglas para matrices:\n"
                        "- matriz_humana: perfiles de personal, certificaciones, cantidades de elementos\n"
                        "- matriz_materiales: equipos, insumos, vehículos, tecnología requerida\n"
                        "- matriz_financiera: capital contable, liquidez, estados financieros, fianzas, seguros\n"
                        "- Cada matriz: entre 2 y 5 items\n"
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
        analisis.anexo_tecnico_requisitos = {"items": analysis.get("requisitos_anexo", [])}

        await db.commit()
        await _publish_progress(analisis_id, "Análisis completo", 100)
```

- [ ] **Step 4: Run all tests to confirm nothing broke**

```bash
cd /Users/maramire2001/Desktop/LICIT-AI/backend
python -m pytest tests/ -v
```

Expected: All tests pass (test_pdf_downloader, test_expediente_zip, test_radar).

- [ ] **Step 5: Commit**

```bash
git add backend/app/services/analisis_service.py
git commit -m "feat: analisis_service uses real PDF OCR text and extracts requisitos_anexo"
```

---

## Task 4: Manual PDF Upload Endpoint

**Files:**
- Modify: `backend/app/api/licitaciones.py`

Allows users to upload a PDF for licitaciones not from CompraNet (or to replace the one downloaded automatically).

- [ ] **Step 1: Add the endpoint to licitaciones.py**

Add these imports at the top of `backend/app/api/licitaciones.py`:

```python
from fastapi import UploadFile, File
from app.models.licitacion import LicitacionDoc
from app.services.ocr import extract_text_from_bytes
```

Add this endpoint at the end of the file:

```python
@router.post("/{licitacion_id}/docs/upload")
async def upload_pdf(
    licitacion_id: uuid.UUID,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(400, "Solo se aceptan archivos PDF")

    result = await db.execute(
        select(Licitacion).where(Licitacion.id == licitacion_id)
    )
    lic = result.scalar_one_or_none()
    if not lic:
        raise HTTPException(404, "Licitación no encontrada")

    pdf_bytes = await file.read()
    texto_ocr = extract_text_from_bytes(pdf_bytes)

    existing = await db.execute(
        select(LicitacionDoc).where(
            LicitacionDoc.licitacion_id == licitacion_id,
            LicitacionDoc.tipo == "convocatoria",
        )
    )
    doc = existing.scalar_one_or_none()
    if doc:
        doc.texto_ocr = texto_ocr[:180_000]
        doc.url = f"upload:{file.filename}"
    else:
        doc = LicitacionDoc(
            licitacion_id=licitacion_id,
            tipo="convocatoria",
            url=f"upload:{file.filename}",
            texto_ocr=texto_ocr[:180_000],
        )
        db.add(doc)

    await db.commit()
    return {"mensaje": "PDF subido y procesado", "chars_extraidos": len(texto_ocr)}
```

- [ ] **Step 2: Verify the app starts without errors**

```bash
cd /Users/maramire2001/Desktop/LICIT-AI
docker compose up --build -d
docker compose logs backend --tail=20
```

Expected: No import errors. Server starts on port 8000.

- [ ] **Step 3: Smoke test the endpoint**

```bash
# Replace <TOKEN> with a real JWT and <LIC_ID> with a known licitacion ID
curl -X POST http://localhost:8000/api/licitaciones/<LIC_ID>/docs/upload \
  -H "Authorization: Bearer <TOKEN>" \
  -F "file=@/path/to/test.pdf"
```

Expected: `{"mensaje": "PDF subido y procesado", "chars_extraidos": <N>}`

- [ ] **Step 4: Commit**

```bash
git add backend/app/api/licitaciones.py
git commit -m "feat: add POST /licitaciones/{id}/docs/upload for manual PDF ingestion"
```

---

## Task 5: Email Notifications + 3x/Day Crawler

**Files:**
- Create: `backend/app/services/notificaciones.py`
- Create: `backend/tests/test_notificaciones.py`
- Modify: `backend/app/core/config.py`
- Modify: `backend/app/workers/ingesta.py`
- Modify: `backend/app/workers/celery_app.py`

- [ ] **Step 1: Write the failing test**

```python
# backend/tests/test_notificaciones.py
from app.services.notificaciones import _build_email_body


def test_email_body_singular():
    body = _build_email_body(1)
    assert "1 licitación nueva" in body
    assert "dashboard" in body.lower()


def test_email_body_plural():
    body = _build_email_body(3)
    assert "3 licitaciones nuevas" in body


def test_email_body_zero():
    body = _build_email_body(0)
    assert "0" in body
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd /Users/maramire2001/Desktop/LICIT-AI/backend
python -m pytest tests/test_notificaciones.py -v
```

Expected: `ImportError: cannot import name '_build_email_body'`

- [ ] **Step 3: Add email config to Settings**

Replace contents of `backend/app/core/config.py`:

```python
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str
    redis_url: str
    supabase_url: str
    supabase_service_key: str
    supabase_jwt_secret: str
    anthropic_api_key: str
    aws_access_key_id: str = ""
    aws_secret_access_key: str = ""
    aws_region: str = "us-east-1"
    compranet_api_base: str = "https://api.datos.gob.mx/v2/contratacionesabiertas"
    # Email notifications (all optional — if smtp_host is empty, notifications are skipped)
    notif_emails: str = ""       # comma-separated list: "a@b.com,c@d.com"
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_pass: str = ""

    class Config:
        env_file = ".env"


settings = Settings()
```

- [ ] **Step 4: Create notificaciones service**

```python
# backend/app/services/notificaciones.py
import asyncio
import smtplib
from email.message import EmailMessage
from app.core.config import settings


def _build_email_body(count: int) -> str:
    plural = count != 1
    licitaciones = f"{count} licitaciones nuevas" if plural else "1 licitación nueva"
    return (
        f"Tu radar LICIT-IA encontró {licitaciones} en CompraNet.\n\n"
        "Inicia sesión para ver las oportunidades → https://licit-ia.com/dashboard\n\n"
        "— LICIT-IA"
    )


def _send_sync(count: int) -> None:
    emails = [e.strip() for e in settings.notif_emails.split(",") if e.strip()]
    if not emails:
        return
    plural = count != 1
    licitaciones = f"{count} licitaciones nuevas" if plural else "1 licitación nueva"

    msg = EmailMessage()
    msg["Subject"] = f"LICIT-IA: {licitaciones} en tu radar"
    msg["From"] = settings.smtp_user
    msg["To"] = ", ".join(emails)
    msg.set_content(_build_email_body(count))

    with smtplib.SMTP(settings.smtp_host, settings.smtp_port) as s:
        s.starttls()
        s.login(settings.smtp_user, settings.smtp_pass)
        s.send_message(msg)


async def notificar_nuevas_licitaciones(count: int) -> None:
    """Send email alert. No-op if smtp_host or notif_emails not configured."""
    if not settings.smtp_host or not settings.notif_emails:
        return
    if count == 0:
        return
    try:
        await asyncio.to_thread(_send_sync, count)
    except Exception as exc:
        # Log but don't crash the crawler if email fails
        print(f"[notificaciones] email failed: {exc}")
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
cd /Users/maramire2001/Desktop/LICIT-AI/backend
python -m pytest tests/test_notificaciones.py -v
```

Expected: 3 tests pass.

- [ ] **Step 6: Update ingesta.py to count new records and send notification**

Replace `_incremental()` in `backend/app/workers/ingesta.py`:

```python
async def _incremental():
    Session, engine = _make_session()
    try:
        async with Session() as db:
            data = await fetch_licitaciones_page(page=1, page_size=100)
            releases = data.get("results", [])
            nuevas = await _upsert_releases(db, releases)
            await db.commit()
            if nuevas > 0:
                from app.services.notificaciones import notificar_nuevas_licitaciones
                await notificar_nuevas_licitaciones(nuevas)
    finally:
        await engine.dispose()
```

Update `_upsert_releases` to return count of new records inserted (change return type from `None` to `int`):

```python
async def _upsert_releases(db, releases: list[dict]) -> int:
    nuevas = 0
    for release in releases:
        parsed = parse_ocds_release(release)
        ocid = parsed["numero_procedimiento"]
        if not ocid:
            continue
        result = await db.execute(
            select(Licitacion).where(Licitacion.numero_procedimiento == ocid)
        )
        existing = result.scalar_one_or_none()
        if not existing:
            lic = Licitacion(
                numero_procedimiento=ocid,
                titulo=parsed["titulo"],
                dependencia=parsed["dependencia"],
                monto_estimado=parsed["monto_estimado"],
                estado=parsed["estado"],
                url_fuente=parsed["url_fuente"],
                raw_json=parsed["raw_json"],
            )
            db.add(lic)
            await db.flush()
            nuevas += 1
            if parsed.get("empresa_ganadora"):
                adj = Adjudicacion(
                    licitacion_id=lic.id,
                    empresa_ganadora=parsed["empresa_ganadora"],
                    monto_adjudicado=parsed["monto_adjudicado"],
                    dependencia=parsed["dependencia"],
                    nivel_confianza="medio",
                )
                db.add(adj)
    return nuevas
```

Also update the `_backfill()` call to handle the new return value — replace the `await _upsert_releases(db, releases)` line in `_backfill` with:

```python
                    await _upsert_releases(db, releases)
```

(Backfill doesn't need the count — no change needed there.)

- [ ] **Step 7: Update Celery beat to 3x/day**

In `backend/app/workers/celery_app.py`, change the `ingesta-incremental` schedule:

```python
celery_app.conf.beat_schedule = {
    "ingesta-incremental": {
        "task": "app.workers.ingesta.incremental_ingesta",
        "schedule": crontab(minute=0, hour="6,12,18"),
    },
}
```

Full file after change:

```python
from celery import Celery
from celery.schedules import crontab
from app.core.config import settings

celery_app = Celery(
    "licit_ia",
    broker=settings.redis_url,
    backend=settings.redis_url,
    include=["app.workers.ingesta", "app.workers.pipeline"],
)

celery_app.conf.beat_schedule = {
    "ingesta-incremental": {
        "task": "app.workers.ingesta.incremental_ingesta",
        "schedule": crontab(minute=0, hour="6,12,18"),
    },
}

celery_app.conf.task_routes = {
    "app.workers.ingesta.*": {"queue": "ingesta"},
    "app.workers.pipeline.*": {"queue": "pipeline"},
}

celery_app.conf.timezone = "America/Mexico_City"
```

- [ ] **Step 8: Run all tests**

```bash
cd /Users/maramire2001/Desktop/LICIT-AI/backend
python -m pytest tests/ -v
```

Expected: All tests pass.

- [ ] **Step 9: Rebuild and verify docker compose starts cleanly**

```bash
cd /Users/maramire2001/Desktop/LICIT-AI
docker compose up --build -d
docker compose logs backend --tail=30
docker compose logs celery --tail=30
```

Expected: No errors. Celery logs show beat schedule with `6,12,18`.

- [ ] **Step 10: Commit**

```bash
git add backend/app/services/notificaciones.py \
        backend/tests/test_notificaciones.py \
        backend/app/core/config.py \
        backend/app/workers/ingesta.py \
        backend/app/workers/celery_app.py
git commit -m "feat: email notifications on new licitaciones + 3x/day crawler schedule"
```

---

## Self-Review

**Spec coverage check:**

| Requirement | Task |
|-------------|------|
| Download PDF from CompraNet on "Me interesa" click | Task 1 (pdf_downloader) + Task 3 (analisis_service calls it) |
| OCR with PyMuPDF | Task 1 (calls existing `ocr.py`) |
| Send full OCR text to Claude | Task 3 |
| Extract numbered Anexo Técnico requirements point-by-point | Task 3 (new `requisitos_anexo` in prompt) |
| Store structured requirements for Motor 2 | Task 2 (model field) + Task 3 (saves to DB) |
| Cache OCR — don't re-download same PDF | Task 1 (`get_or_fetch_ocr` checks DB first) |
| Graceful fallback when no PDF found | Task 3 (falls back to metadata with honest note to Claude) |
| Manual PDF upload for non-CompraNet sources | Task 4 |
| Light email alert when crawler finds new licitaciones | Task 5 |
| Crawler 3x/day (6am, 12pm, 6pm MX) | Task 5 |
| `anexo_tecnico_requisitos` in API response | Task 2 (schema update) |

**Placeholder scan:** No TBD or TODO in any code block.

**Type consistency:** `get_or_fetch_ocr(db, licitacion)` → returns `str`. Called in Task 3 as `texto_ocr = await get_or_fetch_ocr(db, licitacion)`. ✓ `_upsert_releases` returns `int`. Called in `_incremental` as `nuevas = await _upsert_releases(...)`. ✓

**Scope check:** This plan does NOT include Motor 2 (the point-by-point editor UI) — correct per design. Motor 2 reads `anexo_tecnico_requisitos` that this plan populates.
