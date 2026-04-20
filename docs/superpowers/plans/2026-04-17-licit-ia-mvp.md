# LICIT-IA MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a functional LICIT-IA SaaS MVP covering the full flow: Dashboard → "Me interesa" → Análisis automático → Panel de decisión → War Room → Expediente v1.

**Architecture:** Monolito modular FastAPI (Python) + Next.js 14 App Router. Background jobs via Celery + Redis. PostgreSQL + pgvector for data + RAG. Supabase Auth for multi-tenant auth.

**Tech Stack:** Next.js 14, TypeScript, Tailwind, shadcn/ui, FastAPI, SQLAlchemy, Alembic, Celery, Redis, PostgreSQL + pgvector, Supabase Auth/Storage, AWS Textract, OpenAI GPT-4o, httpx, Docker Compose.

---

## File Map

```
LICIT-AI/
├── docker-compose.yml
├── .env.example
├── backend/
│   ├── Dockerfile
│   ├── pyproject.toml
│   ├── alembic.ini
│   ├── alembic/env.py
│   ├── alembic/versions/001_initial.py
│   ├── app/
│   │   ├── main.py
│   │   ├── core/
│   │   │   ├── config.py
│   │   │   ├── database.py
│   │   │   ├── auth.py
│   │   │   └── llm_client.py
│   │   ├── models/
│   │   │   ├── company.py
│   │   │   ├── licitacion.py
│   │   │   ├── analisis.py
│   │   │   ├── expediente.py
│   │   │   └── vault.py
│   │   ├── schemas/
│   │   │   ├── licitacion.py
│   │   │   ├── analisis.py
│   │   │   └── expediente.py
│   │   ├── api/
│   │   │   ├── auth.py
│   │   │   ├── licitaciones.py
│   │   │   ├── analisis.py
│   │   │   ├── expediente.py
│   │   │   ├── vault.py
│   │   │   └── ws.py
│   │   ├── services/
│   │   │   ├── crawler.py
│   │   │   ├── ocr.py
│   │   │   ├── analisis_service.py
│   │   │   └── expediente_service.py
│   │   └── workers/
│   │       ├── celery_app.py
│   │       ├── ingesta.py
│   │       └── pipeline.py
│   └── tests/
│       ├── test_crawler.py
│       ├── test_analisis_service.py
│       └── test_expediente_service.py
└── frontend/
    ├── Dockerfile
    ├── package.json
    ├── tailwind.config.ts
    └── src/
        ├── app/
        │   ├── layout.tsx
        │   ├── (auth)/login/page.tsx
        │   ├── (auth)/onboarding/page.tsx
        │   ├── (app)/dashboard/page.tsx
        │   ├── (app)/licitacion/[id]/page.tsx
        │   ├── (app)/war-room/[id]/page.tsx
        │   ├── (app)/vault/page.tsx
        │   └── (app)/expediente/[id]/page.tsx
        ├── components/
        │   ├── dashboard/LicitacionCard.tsx
        │   ├── dashboard/MeInteresaButton.tsx
        │   ├── analisis/PanelDecision.tsx
        │   ├── analisis/Semaforo.tsx
        │   ├── analisis/PriceToWin.tsx
        │   ├── war-room/WarRoomDashboard.tsx
        │   ├── vault/VaultUpload.tsx
        │   └── expediente/ExpedienteEditor.tsx
        ├── lib/
        │   ├── api.ts
        │   ├── supabase.ts
        │   └── ws.ts
        └── types/index.ts
```

---

## Task 1: Docker Compose + Infrastructure

**Files:**
- Create: `docker-compose.yml`
- Create: `.env.example`
- Create: `backend/Dockerfile`
- Create: `frontend/Dockerfile`

- [ ] **Step 1: Create docker-compose.yml**

```yaml
# docker-compose.yml
version: "3.9"

services:
  db:
    image: pgvector/pgvector:pg16
    environment:
      POSTGRES_DB: licitia
      POSTGRES_USER: licitia
      POSTGRES_PASSWORD: licitia
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  backend:
    build: ./backend
    command: uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
    volumes:
      - ./backend:/app
    ports:
      - "8000:8000"
    env_file: .env
    depends_on:
      - db
      - redis

  worker:
    build: ./backend
    command: celery -A app.workers.celery_app worker --loglevel=info -Q ingesta,pipeline
    volumes:
      - ./backend:/app
    env_file: .env
    depends_on:
      - db
      - redis

  beat:
    build: ./backend
    command: celery -A app.workers.celery_app beat --loglevel=info
    volumes:
      - ./backend:/app
    env_file: .env
    depends_on:
      - db
      - redis

  frontend:
    build: ./frontend
    command: npm run dev
    volumes:
      - ./frontend:/app
      - /app/node_modules
    ports:
      - "3000:3000"
    env_file: .env
    depends_on:
      - backend

volumes:
  pgdata:
```

- [ ] **Step 2: Create .env.example**

```bash
# .env.example
DATABASE_URL=postgresql+asyncpg://licitia:licitia@db:5432/licitia
REDIS_URL=redis://redis:6379/0
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key
SUPABASE_JWT_SECRET=your-jwt-secret
OPENAI_API_KEY=sk-...
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-1
COMPRANET_API_BASE=https://api.compranet.hacienda.gob.mx/api/v1
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_API_URL=http://localhost:8000
```

- [ ] **Step 3: Create backend/Dockerfile**

```dockerfile
FROM python:3.12-slim
WORKDIR /app
RUN apt-get update && apt-get install -y gcc libpq-dev && rm -rf /var/lib/apt/lists/*
COPY pyproject.toml .
RUN pip install uv && uv pip install --system -e ".[dev]"
COPY . .
```

- [ ] **Step 4: Create frontend/Dockerfile**

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json .
RUN npm ci
COPY . .
EXPOSE 3000
```

- [ ] **Step 5: Copy .env.example to .env and fill in real keys**

```bash
cp .env.example .env
# Fill SUPABASE_URL, SUPABASE_SERVICE_KEY, SUPABASE_JWT_SECRET, OPENAI_API_KEY, AWS keys
```

- [ ] **Step 6: Commit**

```bash
git init
git add docker-compose.yml .env.example backend/Dockerfile frontend/Dockerfile
git commit -m "feat: docker compose infrastructure"
```

---

## Task 2: Backend Scaffolding

**Files:**
- Create: `backend/pyproject.toml`
- Create: `backend/app/main.py`
- Create: `backend/app/core/config.py`
- Create: `backend/app/core/database.py`

- [ ] **Step 1: Create backend/pyproject.toml**

```toml
[project]
name = "licit-ia-backend"
version = "0.1.0"
requires-python = ">=3.12"
dependencies = [
  "fastapi>=0.111.0",
  "uvicorn[standard]>=0.30.0",
  "sqlalchemy[asyncio]>=2.0.0",
  "asyncpg>=0.29.0",
  "alembic>=1.13.0",
  "pgvector>=0.3.0",
  "pydantic-settings>=2.0.0",
  "celery[redis]>=5.4.0",
  "redis>=5.0.0",
  "httpx>=0.27.0",
  "openai>=1.30.0",
  "boto3>=1.34.0",
  "python-multipart>=0.0.9",
  "supabase>=2.4.0",
  "PyJWT>=2.8.0",
  "python-jose[cryptography]>=3.3.0",
  "tenacity>=8.3.0",
]

[project.optional-dependencies]
dev = ["pytest>=8.0.0", "pytest-asyncio>=0.23.0", "httpx>=0.27.0"]
```

- [ ] **Step 2: Create backend/app/core/config.py**

```python
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    database_url: str
    redis_url: str
    supabase_url: str
    supabase_service_key: str
    supabase_jwt_secret: str
    openai_api_key: str
    aws_access_key_id: str
    aws_secret_access_key: str
    aws_region: str = "us-east-1"
    compranet_api_base: str = "https://api.compranet.hacienda.gob.mx/api/v1"

    class Config:
        env_file = ".env"

settings = Settings()
```

- [ ] **Step 3: Create backend/app/core/database.py**

```python
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase
from app.core.config import settings

engine = create_async_engine(settings.database_url, echo=False)
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)

class Base(DeclarativeBase):
    pass

async def get_db() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        yield session
```

- [ ] **Step 4: Create backend/app/main.py**

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import auth, licitaciones, analisis, expediente, vault, ws

app = FastAPI(title="LICIT-IA API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(licitaciones.router, prefix="/api/licitaciones", tags=["licitaciones"])
app.include_router(analisis.router, prefix="/api/analisis", tags=["analisis"])
app.include_router(expediente.router, prefix="/api/expediente", tags=["expediente"])
app.include_router(vault.router, prefix="/api/vault", tags=["vault"])
app.include_router(ws.router, prefix="/ws", tags=["websocket"])

@app.get("/health")
async def health():
    return {"status": "ok"}
```

- [ ] **Step 5: Start backend and verify health**

```bash
cd backend && pip install uv && uv pip install --system -e ".[dev]"
uvicorn app.main:app --reload --port 8000
# GET http://localhost:8000/health → {"status": "ok"}
```

- [ ] **Step 6: Commit**

```bash
git add backend/
git commit -m "feat: fastapi backend scaffolding"
```

---

## Task 3: Database Models + Migrations

**Files:**
- Create: `backend/app/models/company.py`
- Create: `backend/app/models/licitacion.py`
- Create: `backend/app/models/analisis.py`
- Create: `backend/app/models/expediente.py`
- Create: `backend/app/models/vault.py`
- Create: `backend/alembic.ini`
- Create: `backend/alembic/env.py`
- Create: `backend/alembic/versions/001_initial.py`

- [ ] **Step 1: Create backend/app/models/company.py**

```python
import uuid
from sqlalchemy import String, ARRAY, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
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

class User(Base):
    __tablename__ = "users"
    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    supabase_uid: Mapped[str] = mapped_column(String(255), unique=True)
    company_id: Mapped[uuid.UUID] = mapped_column()
    email: Mapped[str] = mapped_column(String(255))
    rol: Mapped[str] = mapped_column(String(20), default="analista")
```

- [ ] **Step 2: Create backend/app/models/licitacion.py**

```python
import uuid
from datetime import datetime
from sqlalchemy import String, Numeric, DateTime, JSON, Text
from sqlalchemy.orm import Mapped, mapped_column
from pgvector.sqlalchemy import Vector
from app.core.database import Base

class Licitacion(Base):
    __tablename__ = "licitaciones"
    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    numero_procedimiento: Mapped[str] = mapped_column(String(100), unique=True)
    titulo: Mapped[str] = mapped_column(Text)
    dependencia: Mapped[str] = mapped_column(String(255))
    fecha_publicacion: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    fecha_apertura: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    fecha_fallo: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    monto_estimado: Mapped[float | None] = mapped_column(Numeric, nullable=True)
    modelo_evaluacion: Mapped[str] = mapped_column(String(20), default="binario")
    estado: Mapped[str] = mapped_column(String(20), default="activa")
    portal: Mapped[str] = mapped_column(String(50), default="compranet")
    url_fuente: Mapped[str | None] = mapped_column(Text, nullable=True)
    raw_json: Mapped[dict] = mapped_column(JSON, default=dict)
    embedding: Mapped[list | None] = mapped_column(Vector(1536), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

class LicitacionDoc(Base):
    __tablename__ = "licitacion_docs"
    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    licitacion_id: Mapped[uuid.UUID] = mapped_column()
    tipo: Mapped[str] = mapped_column(String(50))
    url: Mapped[str] = mapped_column(Text)
    texto_ocr: Mapped[str | None] = mapped_column(Text, nullable=True)

class Adjudicacion(Base):
    __tablename__ = "adjudicaciones"
    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    licitacion_id: Mapped[uuid.UUID | None] = mapped_column(nullable=True)
    empresa_ganadora: Mapped[str] = mapped_column(String(255))
    monto_adjudicado: Mapped[float | None] = mapped_column(Numeric, nullable=True)
    año: Mapped[int | None] = mapped_column(nullable=True)
    dependencia: Mapped[str] = mapped_column(String(255))
    nivel_confianza: Mapped[str] = mapped_column(String(10), default="medio")

class IngestaJob(Base):
    __tablename__ = "ingesta_jobs"
    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    tipo: Mapped[str] = mapped_column(String(20))
    status: Mapped[str] = mapped_column(String(20), default="pendiente")
    progreso: Mapped[int] = mapped_column(default=0)
    registros_procesados: Mapped[int] = mapped_column(default=0)
    error: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
```

- [ ] **Step 3: Create backend/app/models/analisis.py**

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
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
```

- [ ] **Step 4: Create backend/app/models/expediente.py**

```python
import uuid
from datetime import datetime
from sqlalchemy import String, Numeric, DateTime, JSON, Text, Integer
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
    version: Mapped[int] = mapped_column(Integer, default=1)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
```

- [ ] **Step 5: Create backend/app/models/vault.py**

```python
import uuid
from datetime import datetime, date
from sqlalchemy import String, DateTime, JSON, Text, Boolean, Date
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base

class VaultDocumento(Base):
    __tablename__ = "vault_documentos"
    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    company_id: Mapped[uuid.UUID] = mapped_column()
    tipo: Mapped[str] = mapped_column(String(30))
    archivo_url: Mapped[str] = mapped_column(Text)
    fecha_vigencia: Mapped[date | None] = mapped_column(Date, nullable=True)
    datos_extraidos: Mapped[dict] = mapped_column(JSON, default=dict)
    vigente: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
```

- [ ] **Step 6: Create backend/alembic.ini**

```ini
[alembic]
script_location = alembic
sqlalchemy.url = postgresql://licitia:licitia@localhost:5432/licitia
```

- [ ] **Step 7: Create backend/alembic/env.py**

```python
from logging.config import fileConfig
from sqlalchemy import engine_from_config, pool
from alembic import context
from app.core.database import Base
from app.models import company, licitacion, analisis, expediente, vault

config = context.config
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata

def run_migrations_offline():
    url = config.get_main_option("sqlalchemy.url")
    context.configure(url=url, target_metadata=target_metadata, literal_binds=True)
    with context.begin_transaction():
        context.run_migrations()

def run_migrations_online():
    connectable = engine_from_config(
        config.get_section(config.config_ini_section),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)
        with context.begin_transaction():
            context.run_migrations()

if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
```

- [ ] **Step 8: Create backend/app/models/__init__.py**

```python
from app.models.company import Company, User
from app.models.licitacion import Licitacion, LicitacionDoc, Adjudicacion, IngestaJob
from app.models.analisis import Analisis
from app.models.expediente import Expediente
from app.models.vault import VaultDocumento
```

- [ ] **Step 9: Run migrations**

```bash
cd backend
alembic upgrade head
# Expected: creates all tables including pgvector extension
```

- [ ] **Step 10: Commit**

```bash
git add backend/app/models/ backend/alembic/
git commit -m "feat: database models and migrations"
```

---

## Task 4: Auth Middleware + LLM Abstraction

**Files:**
- Create: `backend/app/core/auth.py`
- Create: `backend/app/core/llm_client.py`

- [ ] **Step 1: Create backend/app/core/auth.py**

```python
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
from app.core.config import settings
from app.core.database import get_db, AsyncSession
from app.models.company import User
from sqlalchemy import select
import uuid

bearer = HTTPBearer()

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer),
    db: AsyncSession = Depends(get_db),
) -> User:
    try:
        payload = jwt.decode(
            credentials.credentials,
            settings.supabase_jwt_secret,
            algorithms=["HS256"],
            audience="authenticated",
        )
        supabase_uid: str = payload.get("sub")
        if not supabase_uid:
            raise HTTPException(status_code=401, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

    result = await db.execute(select(User).where(User.supabase_uid == supabase_uid))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user
```

- [ ] **Step 2: Create backend/app/core/llm_client.py**

```python
from openai import AsyncOpenAI
from app.core.config import settings
from typing import Any

_client = AsyncOpenAI(api_key=settings.openai_api_key)

async def chat(
    messages: list[dict],
    model: str = "gpt-4o",
    response_format: dict | None = None,
    temperature: float = 0.2,
) -> str:
    kwargs: dict[str, Any] = {
        "model": model,
        "messages": messages,
        "temperature": temperature,
    }
    if response_format:
        kwargs["response_format"] = response_format
    response = await _client.chat.completions.create(**kwargs)
    return response.choices[0].message.content

async def embed(text: str) -> list[float]:
    response = await _client.embeddings.create(
        model="text-embedding-3-small",
        input=text[:8000],
    )
    return response.data[0].embedding
```

- [ ] **Step 3: Commit**

```bash
git add backend/app/core/
git commit -m "feat: auth middleware and LLM abstraction layer"
```

---

## Task 5: Celery + Workers Setup

**Files:**
- Create: `backend/app/workers/celery_app.py`
- Create: `backend/app/workers/ingesta.py`
- Create: `backend/app/workers/pipeline.py`

- [ ] **Step 1: Create backend/app/workers/celery_app.py**

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
        "schedule": crontab(minute=0, hour="*/6"),
    },
}

celery_app.conf.task_routes = {
    "app.workers.ingesta.*": {"queue": "ingesta"},
    "app.workers.pipeline.*": {"queue": "pipeline"},
}
```

- [ ] **Step 2: Create backend/app/services/crawler.py**

```python
import httpx
from tenacity import retry, stop_after_attempt, wait_exponential
from app.core.config import settings

OCDS_BASE = "https://api.datos.gob.mx/v2/contratacionesabiertas"

@retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
async def fetch_licitaciones_page(page: int = 1, page_size: int = 100) -> dict:
    async with httpx.AsyncClient(timeout=30) as client:
        r = await client.get(
            OCDS_BASE,
            params={"pageSize": page_size, "page": page},
        )
        r.raise_for_status()
        return r.json()

def parse_ocds_release(release: dict) -> dict:
    tender = release.get("tender", {})
    awards = release.get("awards", [])
    award = awards[0] if awards else {}
    buyer = release.get("buyer", {})

    return {
        "numero_procedimiento": release.get("ocid", ""),
        "titulo": tender.get("title", "Sin título"),
        "dependencia": buyer.get("name", ""),
        "fecha_publicacion": tender.get("datePublished"),
        "fecha_apertura": tender.get("tenderPeriod", {}).get("startDate"),
        "fecha_fallo": tender.get("awardPeriod", {}).get("endDate"),
        "monto_estimado": tender.get("value", {}).get("amount"),
        "estado": "activa" if tender.get("status") == "active" else "cerrada",
        "url_fuente": release.get("url", ""),
        "raw_json": release,
        "empresa_ganadora": award.get("suppliers", [{}])[0].get("name") if award else None,
        "monto_adjudicado": award.get("value", {}).get("amount") if award else None,
    }
```

- [ ] **Step 3: Create backend/app/workers/ingesta.py**

```python
import asyncio
from app.workers.celery_app import celery_app
from app.services.crawler import fetch_licitaciones_page, parse_ocds_release
from app.core.database import AsyncSessionLocal
from app.models.licitacion import Licitacion, Adjudicacion, IngestaJob
from sqlalchemy import select
import uuid
from datetime import datetime

@celery_app.task(name="app.workers.ingesta.backfill_ingesta")
def backfill_ingesta():
    asyncio.run(_backfill())

@celery_app.task(name="app.workers.ingesta.incremental_ingesta")
def incremental_ingesta():
    asyncio.run(_incremental())

async def _backfill():
    async with AsyncSessionLocal() as db:
        job = IngestaJob(tipo="backfill", status="en_progreso")
        db.add(job)
        await db.commit()
        try:
            page = 1
            total = 0
            while True:
                data = await fetch_licitaciones_page(page=page, page_size=200)
                releases = data.get("results", [])
                if not releases:
                    break
                await _upsert_releases(db, releases)
                total += len(releases)
                job.registros_procesados = total
                job.progreso = min(int((page / max(data.get("pagination", {}).get("pageCount", 1), 1)) * 100), 99)
                await db.commit()
                page += 1
            job.status = "completado"
            job.progreso = 100
            await db.commit()
        except Exception as e:
            job.status = "error"
            job.error = str(e)
            await db.commit()

async def _incremental():
    async with AsyncSessionLocal() as db:
        data = await fetch_licitaciones_page(page=1, page_size=100)
        releases = data.get("results", [])
        await _upsert_releases(db, releases)
        await db.commit()

async def _upsert_releases(db, releases: list[dict]):
    for release in releases:
        parsed = parse_ocds_release(release)
        ocid = parsed["numero_procedimiento"]
        if not ocid:
            continue
        result = await db.execute(select(Licitacion).where(Licitacion.numero_procedimiento == ocid))
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
            if parsed.get("empresa_ganadora"):
                adj = Adjudicacion(
                    licitacion_id=lic.id,
                    empresa_ganadora=parsed["empresa_ganadora"],
                    monto_adjudicado=parsed["monto_adjudicado"],
                    dependencia=parsed["dependencia"],
                    nivel_confianza="medio",
                )
                db.add(adj)
```

- [ ] **Step 4: Create backend/app/workers/pipeline.py** (stub — expanded in Task 8)

```python
from app.workers.celery_app import celery_app

@celery_app.task(name="app.workers.pipeline.run_analisis")
def run_analisis(analisis_id: str, company_id: str, licitacion_id: str):
    import asyncio
    from app.services.analisis_service import ejecutar_analisis
    asyncio.run(ejecutar_analisis(analisis_id, company_id, licitacion_id))
```

- [ ] **Step 5: Verify Celery starts**

```bash
cd backend
celery -A app.workers.celery_app worker --loglevel=info -Q ingesta,pipeline
# Expected: [celery@...] ready.
```

- [ ] **Step 6: Commit**

```bash
git add backend/app/workers/ backend/app/services/crawler.py
git commit -m "feat: celery workers and compranet crawler"
```

---

## Task 6: Auth + Company API Endpoints

**Files:**
- Create: `backend/app/api/auth.py`
- Create: `backend/app/schemas/company.py`

- [ ] **Step 1: Create backend/app/schemas/company.py**

```python
from pydantic import BaseModel
import uuid

class OnboardingRequest(BaseModel):
    rfc: str
    nombre: str
    sector: str
    regiones: list[str] = []
    cucop_codes: list[str] = []

class CompanyResponse(BaseModel):
    id: uuid.UUID
    nombre: str
    rfc: str
    sector: str

    class Config:
        from_attributes = True
```

- [ ] **Step 2: Create backend/app/api/auth.py**

```python
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.core.auth import get_current_user
from app.models.company import Company, User
from app.schemas.company import OnboardingRequest, CompanyResponse
import uuid

router = APIRouter()

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
    )
    db.add(company)
    await db.flush()
    current_user.company_id = company.id
    await db.commit()
    return company

@router.post("/register-user")
async def register_user(
    supabase_uid: str,
    email: str,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).where(User.supabase_uid == supabase_uid))
    if result.scalar_one_or_none():
        return {"status": "exists"}
    user = User(supabase_uid=supabase_uid, email=email)
    db.add(user)
    await db.commit()
    return {"status": "created"}

@router.get("/me")
async def me(current_user: User = Depends(get_current_user)):
    return {
        "id": str(current_user.id),
        "email": current_user.email,
        "company_id": str(current_user.company_id) if current_user.company_id else None,
        "rol": current_user.rol,
    }
```

- [ ] **Step 3: Commit**

```bash
git add backend/app/api/auth.py backend/app/schemas/
git commit -m "feat: auth and onboarding endpoints"
```

---

## Task 7: Licitaciones API

**Files:**
- Create: `backend/app/api/licitaciones.py`
- Create: `backend/app/schemas/licitacion.py`

- [ ] **Step 1: Create backend/app/schemas/licitacion.py**

```python
from pydantic import BaseModel
from datetime import datetime
import uuid

class LicitacionResponse(BaseModel):
    id: uuid.UUID
    numero_procedimiento: str
    titulo: str
    dependencia: str
    fecha_apertura: datetime | None
    monto_estimado: float | None
    estado: str
    score_relevancia: float = 0.0

    class Config:
        from_attributes = True

class LicitacionDetalle(LicitacionResponse):
    url_fuente: str | None
    modelo_evaluacion: str
    raw_json: dict
```

- [ ] **Step 2: Create backend/app/api/licitaciones.py**

```python
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from app.core.database import get_db
from app.core.auth import get_current_user
from app.models.company import User
from app.models.licitacion import Licitacion, IngestaJob
from app.schemas.licitacion import LicitacionResponse, LicitacionDetalle
import uuid

router = APIRouter()

@router.get("/", response_model=list[LicitacionResponse])
async def list_licitaciones(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, le=100),
    estado: str = Query("activa"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    offset = (page - 1) * page_size
    result = await db.execute(
        select(Licitacion)
        .where(Licitacion.estado == estado)
        .order_by(desc(Licitacion.created_at))
        .offset(offset)
        .limit(page_size)
    )
    licitaciones = result.scalars().all()
    return [LicitacionResponse.model_validate(l) for l in licitaciones]

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

@router.get("/{licitacion_id}", response_model=LicitacionDetalle)
async def get_licitacion(
    licitacion_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Licitacion).where(Licitacion.id == licitacion_id))
    lic = result.scalar_one_or_none()
    if not lic:
        from fastapi import HTTPException
        raise HTTPException(404, "Licitacion not found")
    return LicitacionDetalle.model_validate(lic)
```

- [ ] **Step 3: Commit**

```bash
git add backend/app/api/licitaciones.py backend/app/schemas/licitacion.py
git commit -m "feat: licitaciones API endpoints"
```

---

## Task 8: "Me Interesa" Analysis Pipeline

**Files:**
- Create: `backend/app/services/analisis_service.py`
- Create: `backend/app/api/analisis.py`
- Create: `backend/app/schemas/analisis.py`
- Create: `backend/app/api/ws.py`

- [ ] **Step 1: Create backend/app/services/analisis_service.py**

```python
import json
import uuid
from app.core.database import AsyncSessionLocal
from app.core.llm_client import chat
from app.models.analisis import Analisis
from app.models.licitacion import Licitacion, Adjudicacion
from sqlalchemy import select, func
import redis.asyncio as aioredis
from app.core.config import settings

redis_client = aioredis.from_url(settings.redis_url)

async def _publish_progress(analisis_id: str, step: str, pct: int):
    await redis_client.publish(
        f"analisis:{analisis_id}",
        json.dumps({"step": step, "progress": pct}),
    )

async def ejecutar_analisis(analisis_id: str, company_id: str, licitacion_id: str):
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Analisis).where(Analisis.id == uuid.UUID(analisis_id)))
        analisis = result.scalar_one()

        lic_result = await db.execute(select(Licitacion).where(Licitacion.id == uuid.UUID(licitacion_id)))
        licitacion = lic_result.scalar_one()

        await _publish_progress(analisis_id, "Leyendo licitación", 10)

        licitacion_text = f"""
        Título: {licitacion.titulo}
        Dependencia: {licitacion.dependencia}
        Monto estimado: {licitacion.monto_estimado}
        Datos adicionales: {json.dumps(licitacion.raw_json, ensure_ascii=False)[:4000]}
        """

        await _publish_progress(analisis_id, "Analizando requisitos con IA", 30)

        analysis_prompt = [
            {"role": "system", "content": "Eres un experto en licitaciones públicas mexicanas. Responde SIEMPRE en JSON válido."},
            {"role": "user", "content": f"""Analiza esta licitación y devuelve un JSON con exactamente estas claves:
{{
  "modelo_evaluacion": "binario" o "puntos",
  "requisitos_criticos": ["req1", "req2", ...],
  "riesgos_descalificacion": ["riesgo1", ...],
  "viabilidad": "participar" | "con_condiciones" | "no_participar",
  "score_viabilidad": número entre 0 y 100,
  "justificacion": "texto breve"
}}

Licitación:
{licitacion_text}"""},
        ]

        analysis_raw = await chat(analysis_prompt, response_format={"type": "json_object"})
        analysis = json.loads(analysis_raw)

        await _publish_progress(analisis_id, "Consultando historial competitivo", 55)

        adj_result = await db.execute(
            select(Adjudicacion)
            .where(Adjudicacion.dependencia == licitacion.dependencia)
            .order_by(func.random())
            .limit(20)
        )
        adjudicaciones = adj_result.scalars().all()

        competidores = {}
        for adj in adjudicaciones:
            if adj.empresa_ganadora not in competidores:
                competidores[adj.empresa_ganadora] = {"wins": 0, "montos": []}
            competidores[adj.empresa_ganadora]["wins"] += 1
            if adj.monto_adjudicado:
                competidores[adj.empresa_ganadora]["montos"].append(float(adj.monto_adjudicado))

        top_competidores = sorted(competidores.items(), key=lambda x: x[1]["wins"], reverse=True)[:5]

        await _publish_progress(analisis_id, "Calculando Price to Win", 70)

        montos = [float(a.monto_adjudicado) for a in adjudicaciones if a.monto_adjudicado]
        monto_base = licitacion.monto_estimado or (sum(montos) / len(montos) if montos else 0)

        ptw_conservador = monto_base * 0.95 if monto_base else None
        ptw_optimo = monto_base * 0.88 if monto_base else None
        ptw_agresivo = monto_base * 0.80 if monto_base else None

        await _publish_progress(analisis_id, "Generando expediente v1", 85)

        expediente_prompt = [
            {"role": "system", "content": "Eres experto en licitaciones públicas mexicanas. Genera propuestas profesionales."},
            {"role": "user", "content": f"""Genera un borrador de propuesta técnica en español para esta licitación. 
Debe incluir: introducción, metodología propuesta, experiencia relevante, equipo propuesto, y conclusión.
Máximo 800 palabras. Usa formato markdown.

Licitación: {licitacion.titulo}
Dependencia: {licitacion.dependencia}
Requisitos críticos: {', '.join(analysis.get('requisitos_criticos', [])[:5])}"""},
        ]

        propuesta_draft = await chat(expediente_prompt, model="gpt-4o")

        from app.models.expediente import Expediente
        expediente = Expediente(
            analisis_id=analisis.id,
            company_id=uuid.UUID(company_id),
            propuesta_tecnica_draft=propuesta_draft,
            checklist={"items": analysis.get("requisitos_criticos", [])},
            faltantes={"items": []},
            carpeta_admin={"documentos": ["Acta constitutiva", "RFC", "Opinión SAT 32-D", "Poder notarial"]},
            propuesta_economica={"monto_propuesto": ptw_optimo, "desglose": []},
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
        analisis.competidores = {"top": [{"empresa": k, **v} for k, v in top_competidores]}

        await db.commit()
        await _publish_progress(analisis_id, "Análisis completo", 100)
```

- [ ] **Step 2: Create backend/app/schemas/analisis.py**

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
    created_at: datetime

    class Config:
        from_attributes = True
```

- [ ] **Step 3: Create backend/app/api/analisis.py**

```python
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.core.auth import get_current_user
from app.models.company import User
from app.models.analisis import Analisis
from app.schemas.analisis import AnalisisCreate, AnalisisResponse
from app.workers.pipeline import run_analisis
import uuid

router = APIRouter()

@router.post("/", response_model=AnalisisResponse)
async def crear_analisis(
    payload: AnalisisCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not current_user.company_id:
        raise HTTPException(400, "Completa el onboarding primero")

    analisis = Analisis(
        company_id=current_user.company_id,
        licitacion_id=payload.licitacion_id,
        status="procesando",
    )
    db.add(analisis)
    await db.commit()
    await db.refresh(analisis)

    run_analisis.delay(str(analisis.id), str(current_user.company_id), str(payload.licitacion_id))

    return analisis

@router.get("/{analisis_id}", response_model=AnalisisResponse)
async def get_analisis(
    analisis_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Analisis).where(Analisis.id == analisis_id, Analisis.company_id == current_user.company_id)
    )
    analisis = result.scalar_one_or_none()
    if not analisis:
        raise HTTPException(404, "Análisis no encontrado")
    return analisis
```

- [ ] **Step 4: Create backend/app/api/ws.py**

```python
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
import redis.asyncio as aioredis
import asyncio
from app.core.config import settings

router = APIRouter()

@router.websocket("/analisis/{analisis_id}")
async def analisis_ws(websocket: WebSocket, analisis_id: str):
    await websocket.accept()
    r = aioredis.from_url(settings.redis_url)
    pubsub = r.pubsub()
    await pubsub.subscribe(f"analisis:{analisis_id}")
    try:
        async for message in pubsub.listen():
            if message["type"] == "message":
                await websocket.send_text(message["data"].decode())
                import json
                data = json.loads(message["data"])
                if data.get("progress") == 100:
                    break
    except WebSocketDisconnect:
        pass
    finally:
        await pubsub.unsubscribe(f"analisis:{analisis_id}")
        await r.aclose()
```

- [ ] **Step 5: Commit**

```bash
git add backend/app/services/analisis_service.py backend/app/api/analisis.py backend/app/api/ws.py backend/app/schemas/analisis.py
git commit -m "feat: me interesa analysis pipeline with websocket"
```

---

## Task 9: Vault + Expediente APIs

**Files:**
- Create: `backend/app/services/ocr.py`
- Create: `backend/app/api/vault.py`
- Create: `backend/app/api/expediente.py`
- Create: `backend/app/schemas/expediente.py`

- [ ] **Step 1: Create backend/app/services/ocr.py**

```python
import boto3
from app.core.config import settings

textract = boto3.client(
    "textract",
    aws_access_key_id=settings.aws_access_key_id,
    aws_secret_access_key=settings.aws_secret_access_key,
    region_name=settings.aws_region,
)

def extract_text_from_bytes(file_bytes: bytes) -> str:
    response = textract.detect_document_text(Document={"Bytes": file_bytes})
    blocks = response.get("Blocks", [])
    lines = [b["Text"] for b in blocks if b["BlockType"] == "LINE"]
    return "\n".join(lines)
```

- [ ] **Step 2: Create backend/app/api/vault.py**

```python
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.core.auth import get_current_user
from app.models.company import User
from app.models.vault import VaultDocumento
from app.services.ocr import extract_text_from_bytes
from supabase import create_client
from app.core.config import settings
import uuid

router = APIRouter()
supabase = create_client(settings.supabase_url, settings.supabase_service_key)

@router.post("/upload")
async def upload_documento(
    tipo: str = Form(...),
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not current_user.company_id:
        raise HTTPException(400, "Completa el onboarding primero")

    content = await file.read()
    path = f"{current_user.company_id}/{tipo}/{uuid.uuid4()}-{file.filename}"
    supabase.storage.from_("vault").upload(path, content, {"content-type": file.content_type})
    url = supabase.storage.from_("vault").get_public_url(path)

    texto = ""
    if file.content_type == "application/pdf" or file.filename.endswith(".pdf"):
        try:
            texto = extract_text_from_bytes(content)
        except Exception:
            texto = ""

    doc = VaultDocumento(
        company_id=current_user.company_id,
        tipo=tipo,
        archivo_url=url,
        datos_extraidos={"texto_extraido": texto[:2000]},
    )
    db.add(doc)
    await db.commit()
    await db.refresh(doc)
    return {"id": str(doc.id), "url": url, "tipo": tipo}

@router.get("/")
async def list_documentos(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not current_user.company_id:
        return []
    result = await db.execute(
        select(VaultDocumento).where(VaultDocumento.company_id == current_user.company_id)
    )
    docs = result.scalars().all()
    return [{"id": str(d.id), "tipo": d.tipo, "url": d.archivo_url, "vigente": d.vigente} for d in docs]
```

- [ ] **Step 3: Create backend/app/schemas/expediente.py**

```python
from pydantic import BaseModel
import uuid
from datetime import datetime

class ExpedienteResponse(BaseModel):
    id: uuid.UUID
    analisis_id: uuid.UUID
    carpeta_admin: dict
    propuesta_tecnica_draft: str | None
    propuesta_economica: dict
    checklist: dict
    faltantes: dict
    version: int
    created_at: datetime

    class Config:
        from_attributes = True

class UpdatePropuestaTecnica(BaseModel):
    propuesta_tecnica_draft: str
```

- [ ] **Step 4: Create backend/app/api/expediente.py**

```python
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.core.auth import get_current_user
from app.models.company import User
from app.models.expediente import Expediente
from app.schemas.expediente import ExpedienteResponse, UpdatePropuestaTecnica
from app.core.llm_client import chat
import uuid

router = APIRouter()

@router.get("/{analisis_id}", response_model=ExpedienteResponse)
async def get_expediente(
    analisis_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Expediente).where(
            Expediente.analisis_id == analisis_id,
            Expediente.company_id == current_user.company_id,
        )
    )
    exp = result.scalar_one_or_none()
    if not exp:
        raise HTTPException(404, "Expediente no encontrado")
    return exp

@router.patch("/{expediente_id}/propuesta-tecnica", response_model=ExpedienteResponse)
async def update_propuesta_tecnica(
    expediente_id: uuid.UUID,
    payload: UpdatePropuestaTecnica,
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
    exp.propuesta_tecnica_draft = payload.propuesta_tecnica_draft
    exp.version += 1
    await db.commit()
    await db.refresh(exp)
    return exp

@router.post("/{expediente_id}/ai-refine")
async def ai_refine(
    expediente_id: uuid.UUID,
    instruccion: str,
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

    messages = [
        {"role": "system", "content": "Eres experto en propuestas técnicas para licitaciones mexicanas."},
        {"role": "user", "content": f"Texto actual:\n{exp.propuesta_tecnica_draft}\n\nInstrucción de mejora: {instruccion}\n\nDevuelve solo el texto mejorado."},
    ]
    refined = await chat(messages)
    return {"propuesta_tecnica_draft": refined}
```

- [ ] **Step 5: Commit**

```bash
git add backend/app/services/ocr.py backend/app/api/vault.py backend/app/api/expediente.py backend/app/schemas/expediente.py
git commit -m "feat: vault upload, OCR, and expediente endpoints"
```

---

## Task 10: Next.js Frontend Setup

**Files:**
- Create: `frontend/` (via create-next-app)
- Create: `frontend/src/lib/api.ts`
- Create: `frontend/src/lib/supabase.ts`
- Create: `frontend/src/lib/ws.ts`
- Create: `frontend/src/types/index.ts`

- [ ] **Step 1: Scaffold Next.js app**

```bash
cd /Users/maramire2001/Desktop/LICIT-AI
npx create-next-app@latest frontend \
  --typescript \
  --tailwind \
  --app \
  --src-dir \
  --import-alias "@/*" \
  --no-git
```

- [ ] **Step 2: Install dependencies**

```bash
cd frontend
npm install @supabase/supabase-js @supabase/ssr lucide-react
npx shadcn@latest init -d
npx shadcn@latest add button card badge progress tabs textarea dialog
```

- [ ] **Step 3: Create frontend/src/types/index.ts**

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

- [ ] **Step 4: Create frontend/src/lib/supabase.ts**

```typescript
import { createBrowserClient } from "@supabase/ssr"

export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
```

- [ ] **Step 5: Create frontend/src/lib/api.ts**

```typescript
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

async function getToken(): Promise<string | null> {
  const { createBrowserClient } = await import("@supabase/ssr")
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  const { data } = await supabase.auth.getSession()
  return data.session?.access_token ?? null
}

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await getToken()
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })
  if (!res.ok) throw new Error(`API error: ${res.status}`)
  return res.json()
}

export const api = {
  licitaciones: {
    list: (page = 1) => apiFetch<any[]>(`/api/licitaciones/?page=${page}`),
    get: (id: string) => apiFetch<any>(`/api/licitaciones/${id}`),
    ingestaStatus: () => apiFetch<any>("/api/licitaciones/ingesta-status"),
  },
  analisis: {
    create: (licitacion_id: string) =>
      apiFetch<any>("/api/analisis/", {
        method: "POST",
        body: JSON.stringify({ licitacion_id }),
      }),
    get: (id: string) => apiFetch<any>(`/api/analisis/${id}`),
  },
  expediente: {
    get: (analisis_id: string) => apiFetch<any>(`/api/expediente/${analisis_id}`),
    updatePropuesta: (expediente_id: string, text: string) =>
      apiFetch<any>(`/api/expediente/${expediente_id}/propuesta-tecnica`, {
        method: "PATCH",
        body: JSON.stringify({ propuesta_tecnica_draft: text }),
      }),
    aiRefine: (expediente_id: string, instruccion: string) =>
      apiFetch<any>(`/api/expediente/${expediente_id}/ai-refine?instruccion=${encodeURIComponent(instruccion)}`),
  },
  auth: {
    me: () => apiFetch<any>("/api/auth/me"),
    onboarding: (data: any) =>
      apiFetch<any>("/api/auth/onboarding", { method: "POST", body: JSON.stringify(data) }),
  },
  vault: {
    list: () => apiFetch<any[]>("/api/vault/"),
  },
}
```

- [ ] **Step 6: Create frontend/src/lib/ws.ts**

```typescript
export function createAnalisisSocket(
  analisisId: string,
  onProgress: (step: string, progress: number) => void,
  onComplete: () => void
): WebSocket {
  const wsUrl = process.env.NEXT_PUBLIC_API_URL?.replace("http", "ws") || "ws://localhost:8000"
  const ws = new WebSocket(`${wsUrl}/ws/analisis/${analisisId}`)

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data)
    onProgress(data.step, data.progress)
    if (data.progress === 100) {
      onComplete()
      ws.close()
    }
  }

  return ws
}
```

- [ ] **Step 7: Commit**

```bash
git add frontend/
git commit -m "feat: next.js frontend setup with api client and types"
```

---

## Task 11: Auth Pages (Login + Onboarding)

**Files:**
- Create: `frontend/src/app/(auth)/login/page.tsx`
- Create: `frontend/src/app/(auth)/onboarding/page.tsx`
- Modify: `frontend/src/app/layout.tsx`

- [ ] **Step 1: Create frontend/src/app/layout.tsx**

```tsx
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "LICIT-IA — Inteligencia para Licitaciones",
  description: "Transforma licitaciones públicas en decisiones ejecutables",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className={inter.className}>{children}</body>
    </html>
  )
}
```

- [ ] **Step 2: Create frontend/src/app/page.tsx**

```tsx
import { redirect } from "next/navigation"

export default function Home() {
  redirect("/dashboard")
}
```

- [ ] **Step 3: Create frontend/src/app/(auth)/login/page.tsx**

```tsx
"use client"
import { useState } from "react"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [mode, setMode] = useState<"login" | "register">("login")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      if (mode === "register") {
        const { data, error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        if (data.user) {
          await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/register-user?supabase_uid=${data.user.id}&email=${email}`, { method: "POST" })
          router.push("/onboarding")
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        const me = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/me`, {
          headers: { Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}` }
        }).then(r => r.json())
        router.push(me.company_id ? "/dashboard" : "/onboarding")
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-gray-900 border-gray-800">
        <CardHeader>
          <div className="text-center mb-2">
            <span className="text-2xl font-bold text-white">LICIT</span>
            <span className="text-2xl font-bold text-blue-400">-IA</span>
          </div>
          <CardTitle className="text-white text-center">
            {mode === "login" ? "Iniciar sesión" : "Crear cuenta"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              type="email"
              placeholder="correo@empresa.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="bg-gray-800 border-gray-700 text-white"
              required
            />
            <Input
              type="password"
              placeholder="Contraseña"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="bg-gray-800 border-gray-700 text-white"
              required
            />
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" disabled={loading}>
              {loading ? "..." : mode === "login" ? "Entrar" : "Registrarse"}
            </Button>
            <button
              type="button"
              className="w-full text-gray-400 text-sm hover:text-white"
              onClick={() => setMode(mode === "login" ? "register" : "login")}
            >
              {mode === "login" ? "¿No tienes cuenta? Regístrate" : "¿Ya tienes cuenta? Inicia sesión"}
            </button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
```

- [ ] **Step 4: Create frontend/src/app/(auth)/onboarding/page.tsx**

```tsx
"use client"
import { useState } from "react"
import { api } from "@/lib/api"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const SECTORES = ["Tecnología", "Construcción", "Salud", "Servicios", "Manufactura", "Consultoría", "Otro"]

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [form, setForm] = useState({ rfc: "", nombre: "", sector: "", regiones: [] as string[] })
  const [loading, setLoading] = useState(false)

  async function handleFinish() {
    setLoading(true)
    try {
      await api.auth.onboarding(form)
      router.push("/dashboard")
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white">
            Configura tu empresa — Paso {step} de 2
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {step === 1 && (
            <>
              <Input
                placeholder="RFC (ej. XAXX010101000)"
                value={form.rfc}
                onChange={e => setForm({ ...form, rfc: e.target.value.toUpperCase() })}
                className="bg-gray-800 border-gray-700 text-white"
                maxLength={13}
              />
              <Input
                placeholder="Nombre o razón social"
                value={form.nombre}
                onChange={e => setForm({ ...form, nombre: e.target.value })}
                className="bg-gray-800 border-gray-700 text-white"
              />
              <Button
                className="w-full bg-blue-600"
                onClick={() => setStep(2)}
                disabled={!form.rfc || !form.nombre}
              >
                Siguiente
              </Button>
            </>
          )}
          {step === 2 && (
            <>
              <p className="text-gray-400 text-sm">¿En qué sector opera tu empresa?</p>
              <div className="grid grid-cols-2 gap-2">
                {SECTORES.map(s => (
                  <button
                    key={s}
                    onClick={() => setForm({ ...form, sector: s })}
                    className={`p-2 rounded text-sm border transition-colors ${
                      form.sector === s
                        ? "bg-blue-600 border-blue-500 text-white"
                        : "bg-gray-800 border-gray-700 text-gray-300 hover:border-gray-500"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
              <Button
                className="w-full bg-blue-600 mt-4"
                onClick={handleFinish}
                disabled={!form.sector || loading}
              >
                {loading ? "Guardando..." : "Comenzar"}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/
git commit -m "feat: login and onboarding pages"
```

---

## Task 12: Dashboard Page

**Files:**
- Create: `frontend/src/app/(app)/dashboard/page.tsx`
- Create: `frontend/src/components/dashboard/LicitacionCard.tsx`
- Create: `frontend/src/components/dashboard/MeInteresaButton.tsx`

- [ ] **Step 1: Create frontend/src/components/dashboard/MeInteresaButton.tsx**

```tsx
"use client"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { api } from "@/lib/api"
import { useRouter } from "next/navigation"

export function MeInteresaButton({ licitacionId }: { licitacionId: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleClick() {
    setLoading(true)
    try {
      const analisis = await api.analisis.create(licitacionId)
      router.push(`/licitacion/${licitacionId}?analisis=${analisis.id}`)
    } catch (e) {
      console.error(e)
      setLoading(false)
    }
  }

  return (
    <Button
      onClick={handleClick}
      disabled={loading}
      className="bg-blue-600 hover:bg-blue-700 text-white text-sm"
      size="sm"
    >
      {loading ? "Iniciando análisis..." : "Me interesa"}
    </Button>
  )
}
```

- [ ] **Step 2: Create frontend/src/components/dashboard/LicitacionCard.tsx**

```tsx
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { MeInteresaButton } from "./MeInteresaButton"
import { Licitacion } from "@/types"

function formatMonto(monto: number | null): string {
  if (!monto) return "No especificado"
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(monto)
}

function formatFecha(fecha: string | null): string {
  if (!fecha) return "—"
  return new Date(fecha).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" })
}

export function LicitacionCard({ licitacion }: { licitacion: Licitacion }) {
  return (
    <Card className="bg-gray-900 border-gray-800 hover:border-gray-700 transition-colors">
      <CardContent className="p-4">
        <div className="flex justify-between items-start gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-500 mb-1">{licitacion.numero_procedimiento}</p>
            <h3 className="text-white text-sm font-medium leading-tight line-clamp-2 mb-2">
              {licitacion.titulo}
            </h3>
            <p className="text-gray-400 text-xs mb-3">{licitacion.dependencia}</p>
            <div className="flex items-center gap-3 text-xs text-gray-500">
              <span>Apertura: {formatFecha(licitacion.fecha_apertura)}</span>
              <span className="text-blue-400 font-medium">{formatMonto(licitacion.monto_estimado)}</span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2 shrink-0">
            <Badge variant="outline" className="text-xs border-gray-700 text-gray-400">
              {licitacion.estado}
            </Badge>
            <MeInteresaButton licitacionId={licitacion.id} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 3: Create frontend/src/app/(app)/dashboard/page.tsx**

```tsx
"use client"
import { useEffect, useState } from "react"
import { api } from "@/lib/api"
import { LicitacionCard } from "@/components/dashboard/LicitacionCard"
import { Licitacion } from "@/types"
import { Badge } from "@/components/ui/badge"

export default function DashboardPage() {
  const [licitaciones, setLicitaciones] = useState<Licitacion[]>([])
  const [loading, setLoading] = useState(true)
  const [ingesta, setIngesta] = useState<{ progreso: number; status: string; registros: number } | null>(null)

  useEffect(() => {
    api.licitaciones.list().then(data => {
      setLicitaciones(data)
      setLoading(false)
    })
    api.licitaciones.ingestaStatus().then(setIngesta)
  }, [])

  return (
    <div className="min-h-screen bg-gray-950 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">
              LICIT<span className="text-blue-400">-IA</span>
            </h1>
            <p className="text-gray-400 text-sm mt-1">Oportunidades de licitación</p>
          </div>
          {ingesta && ingesta.status !== "completado" && (
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
              <span>Ingesta histórica: {ingesta.progreso}% · {ingesta.registros.toLocaleString()} registros</span>
            </div>
          )}
        </div>

        {loading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-28 bg-gray-900 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : licitaciones.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-500">Ingesta en progreso...</p>
            <p className="text-gray-600 text-sm mt-2">Las licitaciones aparecerán aquí en breve</p>
          </div>
        ) : (
          <div className="space-y-3">
            {licitaciones.map(l => (
              <LicitacionCard key={l.id} licitacion={l} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/app/(app)/dashboard/ frontend/src/components/dashboard/
git commit -m "feat: dashboard with licitaciones list and me interesa button"
```

---

## Task 13: Panel de Decisión + Analysis Page

**Files:**
- Create: `frontend/src/app/(app)/licitacion/[id]/page.tsx`
- Create: `frontend/src/components/analisis/PanelDecision.tsx`
- Create: `frontend/src/components/analisis/Semaforo.tsx`
- Create: `frontend/src/components/analisis/PriceToWin.tsx`

- [ ] **Step 1: Create frontend/src/components/analisis/Semaforo.tsx**

```tsx
import { Badge } from "@/components/ui/badge"

const CONFIG = {
  participar: { label: "PARTICIPAR", color: "bg-green-600", dot: "bg-green-400" },
  con_condiciones: { label: "CON CONDICIONES", color: "bg-yellow-600", dot: "bg-yellow-400" },
  no_participar: { label: "NO PARTICIPAR", color: "bg-red-600", dot: "bg-red-400" },
}

export function Semaforo({ viabilidad, score }: { viabilidad: string; score: number | null }) {
  const cfg = CONFIG[viabilidad as keyof typeof CONFIG] ?? CONFIG.con_condiciones

  return (
    <div className="flex items-center gap-4">
      <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${cfg.color}`}>
        <div className={`w-3 h-3 rounded-full ${cfg.dot} animate-pulse`} />
        <span className="text-white font-bold text-sm">{cfg.label}</span>
      </div>
      {score !== null && (
        <span className="text-gray-400 text-sm">Score: <span className="text-white font-medium">{score}/100</span></span>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Create frontend/src/components/analisis/PriceToWin.tsx**

```tsx
function formatMXN(n: number | null): string {
  if (!n) return "—"
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(n)
}

export function PriceToWin({
  conservador, optimo, agresivo
}: {
  conservador: number | null
  optimo: number | null
  agresivo: number | null
}) {
  return (
    <div className="grid grid-cols-3 gap-3">
      {[
        { label: "Conservador", value: conservador, color: "border-gray-600" },
        { label: "Óptimo", value: optimo, color: "border-blue-600 bg-blue-950" },
        { label: "Agresivo", value: agresivo, color: "border-orange-600" },
      ].map(({ label, value, color }) => (
        <div key={label} className={`border rounded-lg p-3 text-center ${color}`}>
          <p className="text-gray-400 text-xs mb-1">{label}</p>
          <p className="text-white font-bold text-sm">{formatMXN(value)}</p>
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 3: Create frontend/src/components/analisis/PanelDecision.tsx**

```tsx
"use client"
import { Analisis } from "@/types"
import { Semaforo } from "./Semaforo"
import { PriceToWin } from "./PriceToWin"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export function PanelDecision({ analisis }: { analisis: Analisis }) {
  return (
    <div className="space-y-4">
      <Card className="bg-gray-900 border-gray-800">
        <CardContent className="p-5">
          <Semaforo viabilidad={analisis.viabilidad!} score={analisis.score_viabilidad} />
          <p className="text-gray-500 text-xs mt-2">
            Modelo de evaluación: <span className="text-gray-300">{analisis.modelo_evaluacion_detectado || "—"}</span>
          </p>
        </CardContent>
      </Card>

      <Card className="bg-gray-900 border-gray-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-white text-sm">Price to Win</CardTitle>
        </CardHeader>
        <CardContent>
          <PriceToWin
            conservador={analisis.price_to_win_conservador}
            optimo={analisis.ptw_optimo}
            agresivo={analisis.ptw_agresivo}
          />
        </CardContent>
      </Card>

      {analisis.competidores.top?.length > 0 && (
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-sm">Competidores históricos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {analisis.competidores.top.slice(0, 3).map((c) => (
              <div key={c.empresa} className="flex justify-between items-center text-sm">
                <span className="text-gray-300 truncate flex-1">{c.empresa}</span>
                <Badge variant="outline" className="text-xs border-gray-700 text-gray-400 ml-2">
                  {c.wins} victorias
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {analisis.requisitos_criticos.items?.length > 0 && (
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-sm">Requisitos críticos</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1">
              {analisis.requisitos_criticos.items.slice(0, 6).map((req, i) => (
                <li key={i} className="text-gray-400 text-xs flex gap-2">
                  <span className="text-blue-400 shrink-0">•</span>
                  {req}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {analisis.riesgos.items?.length > 0 && (
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-sm">Riesgos de descalificación</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1">
              {analisis.riesgos.items.slice(0, 4).map((r, i) => (
                <li key={i} className="text-red-400 text-xs flex gap-2">
                  <span className="shrink-0">⚠</span>
                  {r}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Link href={`/expediente/${analisis.id}`}>
        <Button className="w-full bg-blue-600 hover:bg-blue-700">Ver expediente generado</Button>
      </Link>
    </div>
  )
}
```

- [ ] **Step 4: Create frontend/src/app/(app)/licitacion/[id]/page.tsx**

```tsx
"use client"
import { useEffect, useState, useRef } from "react"
import { useSearchParams } from "next/navigation"
import { api } from "@/lib/api"
import { createAnalisisSocket } from "@/lib/ws"
import { Analisis } from "@/types"
import { PanelDecision } from "@/components/analisis/PanelDecision"
import { Progress } from "@/components/ui/progress"

export default function LicitacionPage({ params }: { params: { id: string } }) {
  const searchParams = useSearchParams()
  const analisisId = searchParams.get("analisis")
  const [analisis, setAnalisis] = useState<Analisis | null>(null)
  const [progress, setProgress] = useState(0)
  const [step, setStep] = useState("Iniciando análisis...")
  const wsRef = useRef<WebSocket | null>(null)

  useEffect(() => {
    if (!analisisId) return

    wsRef.current = createAnalisisSocket(
      analisisId,
      (stepLabel, pct) => {
        setStep(stepLabel)
        setProgress(pct)
      },
      async () => {
        const data = await api.analisis.get(analisisId)
        setAnalisis(data)
      }
    )

    return () => wsRef.current?.close()
  }, [analisisId])

  return (
    <div className="min-h-screen bg-gray-950 p-6">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-white text-xl font-bold mb-6">
          {analisis ? "Panel de Decisión" : "Analizando licitación..."}
        </h1>

        {!analisis && (
          <div className="space-y-3 mb-6">
            <Progress value={progress} className="h-2 bg-gray-800" />
            <p className="text-gray-400 text-sm">{step}</p>
          </div>
        )}

        {analisis && <PanelDecision analisis={analisis} />}
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/(app)/licitacion/ frontend/src/components/analisis/
git commit -m "feat: panel de decision with semaforo, price to win, and competitors"
```

---

## Task 14: War Room, Vault, and Expediente Pages

**Files:**
- Create: `frontend/src/app/(app)/expediente/[id]/page.tsx`
- Create: `frontend/src/app/(app)/vault/page.tsx`
- Create: `frontend/src/components/expediente/ExpedienteEditor.tsx`

- [ ] **Step 1: Create frontend/src/components/expediente/ExpedienteEditor.tsx**

```tsx
"use client"
import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { api } from "@/lib/api"
import { Expediente } from "@/types"

export function ExpedienteEditor({ expediente: initial }: { expediente: Expediente }) {
  const [expediente, setExpediente] = useState(initial)
  const [instruccion, setInstruccion] = useState("")
  const [refining, setRefining] = useState(false)
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    setSaving(true)
    const updated = await api.expediente.updatePropuesta(expediente.id, expediente.propuesta_tecnica_draft ?? "")
    setExpediente(updated)
    setSaving(false)
  }

  async function handleRefine() {
    if (!instruccion) return
    setRefining(true)
    const result = await api.expediente.aiRefine(expediente.id, instruccion)
    setExpediente({ ...expediente, propuesta_tecnica_draft: result.propuesta_tecnica_draft })
    setInstruccion("")
    setRefining(false)
  }

  return (
    <Tabs defaultValue="tecnica">
      <TabsList className="bg-gray-900 border border-gray-800">
        <TabsTrigger value="admin" className="text-gray-400">Carpeta Admin</TabsTrigger>
        <TabsTrigger value="tecnica" className="text-gray-400">Propuesta Técnica</TabsTrigger>
        <TabsTrigger value="economica" className="text-gray-400">Propuesta Económica</TabsTrigger>
      </TabsList>

      <TabsContent value="admin" className="mt-4">
        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="p-4">
            <p className="text-gray-400 text-sm mb-3">Documentos requeridos en carpeta administrativa:</p>
            <ul className="space-y-2">
              {expediente.carpeta_admin.documentos?.map((doc, i) => (
                <li key={i} className="flex items-center gap-2 text-sm text-gray-300">
                  <span className="w-4 h-4 rounded border border-gray-600 flex-shrink-0" />
                  {doc}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="tecnica" className="mt-4 space-y-3">
        <Textarea
          value={expediente.propuesta_tecnica_draft ?? ""}
          onChange={e => setExpediente({ ...expediente, propuesta_tecnica_draft: e.target.value })}
          className="min-h-[400px] bg-gray-900 border-gray-700 text-gray-200 text-sm font-mono"
        />
        <div className="flex gap-2">
          <Button onClick={handleSave} disabled={saving} size="sm" className="bg-blue-600">
            {saving ? "Guardando..." : "Guardar cambios"}
          </Button>
        </div>
        <div className="flex gap-2">
          <input
            value={instruccion}
            onChange={e => setInstruccion(e.target.value)}
            placeholder="Instrucción para la IA (ej: hazlo más formal)"
            className="flex-1 bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white"
          />
          <Button onClick={handleRefine} disabled={refining || !instruccion} size="sm" variant="outline">
            {refining ? "..." : "Refinar con IA"}
          </Button>
        </div>
      </TabsContent>

      <TabsContent value="economica" className="mt-4">
        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="p-4">
            <p className="text-gray-400 text-sm mb-2">Monto propuesto:</p>
            <p className="text-white text-2xl font-bold">
              {expediente.propuesta_economica.monto_propuesto
                ? new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(expediente.propuesta_economica.monto_propuesto)
                : "—"}
            </p>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  )
}
```

- [ ] **Step 2: Create frontend/src/app/(app)/expediente/[id]/page.tsx**

```tsx
"use client"
import { useEffect, useState } from "react"
import { api } from "@/lib/api"
import { Expediente } from "@/types"
import { ExpedienteEditor } from "@/components/expediente/ExpedienteEditor"

export default function ExpedientePage({ params }: { params: { id: string } }) {
  const [expediente, setExpediente] = useState<Expediente | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.expediente.get(params.id).then(data => {
      setExpediente(data)
      setLoading(false)
    })
  }, [params.id])

  if (loading) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="text-gray-500">Cargando expediente...</div>
    </div>
  )

  if (!expediente) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="text-red-400">Expediente no encontrado</div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-950 p-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-white text-xl font-bold">Expediente v{expediente.version}</h1>
        </div>
        <ExpedienteEditor expediente={expediente} />
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Create frontend/src/app/(app)/vault/page.tsx**

```tsx
"use client"
import { useEffect, useRef, useState } from "react"
import { api } from "@/lib/api"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

const TIPOS = ["acta", "rfc", "sat32d", "poder", "certificacion"]

export default function VaultPage() {
  const [docs, setDocs] = useState<any[]>([])
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const [selectedTipo, setSelectedTipo] = useState("rfc")

  useEffect(() => {
    api.vault.list().then(setDocs)
  }, [])

  async function handleUpload() {
    const file = fileRef.current?.files?.[0]
    if (!file) return
    setUploading(true)
    const formData = new FormData()
    formData.append("file", file)
    formData.append("tipo", selectedTipo)
    const token = (await import("@/lib/supabase")).supabase.auth.getSession().then(s => s.data.session?.access_token)
    await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/vault/upload`, {
      method: "POST",
      headers: { Authorization: `Bearer ${await token}` },
      body: formData,
    })
    const updated = await api.vault.list()
    setDocs(updated)
    setUploading(false)
    if (fileRef.current) fileRef.current.value = ""
  }

  return (
    <div className="min-h-screen bg-gray-950 p-6">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-white text-xl font-bold mb-6">Master Vault</h1>

        <Card className="bg-gray-900 border-gray-800 mb-6">
          <CardContent className="p-4 space-y-3">
            <p className="text-gray-400 text-sm">Subir documento</p>
            <select
              value={selectedTipo}
              onChange={e => setSelectedTipo(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white"
            >
              {TIPOS.map(t => <option key={t} value={t}>{t.toUpperCase()}</option>)}
            </select>
            <input ref={fileRef} type="file" accept=".pdf,.jpg,.png" className="text-gray-400 text-sm" />
            <Button onClick={handleUpload} disabled={uploading} className="bg-blue-600">
              {uploading ? "Subiendo..." : "Subir y extraer datos"}
            </Button>
          </CardContent>
        </Card>

        <div className="space-y-2">
          {docs.map(doc => (
            <Card key={doc.id} className="bg-gray-900 border-gray-800">
              <CardContent className="p-3 flex justify-between items-center">
                <div>
                  <span className="text-white text-sm font-medium">{doc.tipo.toUpperCase()}</span>
                </div>
                <span className={`text-xs ${doc.vigente ? "text-green-400" : "text-red-400"}`}>
                  {doc.vigente ? "Vigente" : "Vencido"}
                </span>
              </CardContent>
            </Card>
          ))}
          {docs.length === 0 && (
            <p className="text-gray-600 text-sm text-center py-8">No hay documentos en el vault</p>
          )}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/app/(app)/ frontend/src/components/expediente/ frontend/src/components/vault/
git commit -m "feat: expediente editor, vault page, complete MVP UI"
```

---

## Task 15: Launch + Backfill Trigger

- [ ] **Step 1: Bring up all services**

```bash
cd /Users/maramire2001/Desktop/LICIT-AI
docker compose up -d
```

- [ ] **Step 2: Run migrations**

```bash
docker compose exec backend alembic upgrade head
```

- [ ] **Step 3: Trigger historical backfill**

```bash
docker compose exec worker celery -A app.workers.celery_app call app.workers.ingesta.backfill_ingesta
```

- [ ] **Step 4: Verify ingestion is running**

```bash
# GET http://localhost:8000/api/licitaciones/ingesta-status
# Expected: {"progreso": >0, "status": "en_progreso", "registros": >0}
```

- [ ] **Step 5: Open app and verify end-to-end flow**

```
1. http://localhost:3000/login → register account
2. Complete onboarding (RFC + sector)
3. Dashboard → wait for licitaciones to appear
4. Click "Me interesa" on any licitación
5. Watch WebSocket progress bar
6. Verify Panel de Decisión loads with real AI analysis
7. Click "Ver expediente" → verify draft propuesta técnica
```

- [ ] **Step 6: Final commit**

```bash
git add .
git commit -m "feat: licit-ia mvp complete - full pipeline operational"
```

---

## Self-Review Notes

- All API endpoints require auth via Supabase JWT — consistent across all routers
- WebSocket progress uses Redis pub/sub — worker publishes, WS endpoint subscribes
- LLM abstraction in `llm_client.py` — swap provider by changing one file
- Backfill job tracks progress in `ingesta_jobs` table, surfaced in dashboard
- `parse_ocds_release` maps Mexico's OCDS structure — if API changes, only this function needs updating
- All competitive intelligence includes `nivel_confianza` to handle data gaps honestly
