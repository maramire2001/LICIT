# LICIT-IA — Design Spec
**Date:** 2026-04-17  
**MVP Target:** 2026-04-21 (lunes)  
**Status:** Approved

---

## 1. Product Definition

LICIT-IA is a SaaS platform that transforms Mexican public procurement tenders (licitaciones) into executable decisions and complete bid packages ready for submission.

**Core principle:** "La IA procesa. El usuario autoriza."

**Two integrated engines:**
- 🧠 **Inteligencia de Mercado** — detects opportunities, analyzes competition, estimates viability, recommends strategy
- ⚙️ **Motor de Ejecución** — converts a tender into a complete expediente ready for review, signature, and delivery

---

## 2. MVP Scope (Non-Negotiable)

**Core flow:**
```
Dashboard → "Me interesa" → Análisis automático → Panel de decisión → War Room → Draft v1 expediente
```

**In scope for MVP:**
- Dashboard with real licitaciones from CompraNet OCDS API
- "Me interesa" async pipeline (WebSocket progress updates)
- Panel de decisión with AI analysis
- War Room with real historical adjudication data
- Master Vault with OCR document extraction
- Expediente generator (admin folder + technical proposal draft + economic base)
- Onboarding from scratch (RFC → company data → capabilities → Vault upload)
- Automated background ingestion (every 6h incremental + historical backfill on launch)

**Out of scope for MVP:**
- State/municipal portal crawlers (CompraNet only)
- Juntas de aclaraciones module
- e.firma integration
- Billing/subscription management

---

## 3. Architecture

### Stack
| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 (App Router) + TypeScript + Tailwind + shadcn/ui |
| Backend | FastAPI (Python) — monolito modular |
| Database | PostgreSQL + pgvector |
| Cache + Queue | Redis + Celery + Celery Beat |
| OCR | AWS Textract |
| LLM | GPT-4o via abstraction layer (provider-agnostic) |
| Auth | Supabase Auth |
| Storage | Supabase Storage (documents + PDFs) |
| Crawler | Playwright + httpx (Python) |

### Architecture Diagram
```
Next.js 14 Frontend
  └── REST + WebSockets
        └── FastAPI Backend (modular monolith)
              ├── PostgreSQL + pgvector
              ├── Redis (cache + queue)
              ├── Supabase Storage
              └── Celery Workers
                    ├── Crawler (CompraNet OCDS API, 6h)
                    ├── Historical backfill (startup, background)
                    ├── OCR + PDF chunking pipeline
                    ├── "Me interesa" analysis pipeline
                    └── Expediente generator
                          └── GPT-4o (abstraction layer)
```

### Backend Modules
```
app/
  api/          → FastAPI routers (auth, licitaciones, analisis, expediente, vault, ingesta)
  workers/      → Celery tasks
  services/     → Business logic (llm, ocr, crawler, expediente_generator)
  models/       → SQLAlchemy ORM models
  schemas/      → Pydantic schemas
  core/         → Config, auth, database, llm_client (agnostic)
```

---

## 4. Data Model

```sql
companies       (id, nombre, rfc, sector, regiones[], cucop_codes[], perfil_semantico jsonb)
users           (id, company_id, email, rol: admin|analista|firmante)

licitaciones    (id, numero_procedimiento, titulo, dependencia,
                 fecha_publicacion, fecha_apertura, fecha_fallo,
                 monto_estimado, modelo_evaluacion: binario|puntos,
                 estado: activa|cerrada|adjudicada,
                 portal, url_fuente, raw_json jsonb, embedding vector(1536))

licitacion_docs (id, licitacion_id, tipo, url, texto_ocr, chunks_vectores)

adjudicaciones  (id, licitacion_id, empresa_ganadora, monto_adjudicado,
                 año, dependencia, nivel_confianza: alto|medio|bajo)

vault_documentos (id, company_id, tipo: acta|rfc|sat32d|poder|certificacion,
                  archivo_url, fecha_vigencia, datos_extraidos jsonb, vigente bool)

analisis        (id, company_id, licitacion_id, status: procesando|listo|error,
                 viabilidad: participar|con_condiciones|no_participar,
                 score_viabilidad, modelo_evaluacion_detectado,
                 requisitos_criticos jsonb, riesgos jsonb,
                 price_to_win_conservador, ptw_optimo, ptw_agresivo,
                 competidores jsonb, created_at)

expedientes     (id, analisis_id, company_id,
                 carpeta_admin jsonb, propuesta_tecnica_draft text,
                 propuesta_economica jsonb, checklist jsonb,
                 faltantes jsonb, version, created_at)

ingesta_jobs    (id, tipo: backfill|incremental, status, progreso 0-100,
                 registros_procesados, error, created_at)
```

---

## 5. Key Flows

### "Me interesa" Pipeline (Celery async)
1. Download and process bases, anexos, actas from licitacion_docs
2. OCR via AWS Textract → extract text → chunk → embed → store in pgvector
3. GPT-4o: detect evaluation model (binario vs puntos), extract critical requirements, calendar, disqualification risks
4. Query adjudicaciones table: build competitive intelligence (top winners, price ranges, frequency)
5. GPT-4o: calculate Price to Win (conservative / optimal / aggressive)
6. GPT-4o: emit viability decision with confidence level
7. Generate expediente v1: map vault docs to requirements, draft technical proposal, structure economic proposal
8. WebSocket pushes status updates throughout; final notification when complete

### Automated Data Ingestion
- `celery beat` every 6h → CompraNet OCDS API → ingest new licitaciones + adjudicaciones
- Historical backfill job: runs on app startup, ingests all available historical data in background
- `ingesta_jobs` table tracks progress and coverage percentage shown in War Room

---

## 6. UI — 5 Main Screens

### Dashboard
Ranked list of licitaciones by relevance to company profile. Shows: title, dependencia, amount, deadline, relevance score, "Me interesa" button.

### Panel de Decisión
Opens automatically when analysis finishes (~3 min). Contains:
- Traffic light: PARTICIPAR / CON CONDICIONES / NO PARTICIPAR
- Viability score
- Detected evaluation model
- Price to Win (3 scenarios)
- Top 3 historical competitors with amounts and confidence level
- Critical requirements + disqualification risks

### War Room
Competitive dashboard for a tender: who wins, how often, in what price ranges, in what dependencias. Historical data coverage indicator.

### Master Vault
Company document repository. File upload → OCR extracts data automatically → detects expiration dates → alerts when documents expire.

### Expediente Editor
3-tab view: Carpeta Administrativa / Propuesta Técnica / Propuesta Económica. Inline editing with contextual AI chat sidebar for adjustments.

### Onboarding (first-time only)
RFC → company data → sector/capabilities → upload documents to Vault → ready.

---

## 7. AI Strategy

- **LLM abstraction layer** in `app/core/llm_client.py` — swap providers without touching business logic
- **Default:** OpenAI GPT-4o
- **Lightweight models** (classification, metadata extraction): GPT-4o-mini
- **Heavy models** (analysis, strategy, proposal drafting): GPT-4o
- **RAG:** pgvector similarity search on licitacion_docs chunks, injected into prompts
- **Uncertainty:** explicit confidence levels (alto/medio/bajo) on all competitive intelligence outputs

---

## 8. Roadmap

### MVP (by 2026-04-21)
- [x] Architecture setup (Next.js + FastAPI + PostgreSQL + Redis + Celery)
- [x] Supabase Auth + multi-tenant companies/users
- [x] CompraNet OCDS crawler + automated ingestion
- [x] Historical backfill job
- [x] Dashboard with real licitaciones
- [x] "Me interesa" pipeline (OCR → analysis → expediente)
- [x] Panel de decisión
- [x] War Room (real data, coverage indicator)
- [x] Master Vault (upload + OCR)
- [x] Expediente editor

### V1 (post-client feedback)
- State/municipal portal crawlers
- Juntas de aclaraciones module
- Billing/subscription tiers
- e.firma integration
- Refined competitive intelligence from more data

### V2
- Mobile app
- Multi-user collaboration on expedientes
- Automated alerts (new matching licitaciones)
- API for enterprise integrations

---

## 9. Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| CompraNet API changes structure | Monitor API response schema, alert on parse failures |
| GPT-4o latency on analysis pipeline | WebSocket progress updates so user sees live status |
| OCR quality on scanned PDFs | AWS Textract + confidence threshold; flag low-quality extractions |
| Historical data gaps | Show coverage % in War Room; use confidence levels on all outputs |
| LLM provider outage | Abstraction layer; fallback to Claude or Gemini without code changes |
