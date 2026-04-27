from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api import auth
from app.api import licitaciones
from app.api import analisis, ws
from app.api import vault, expediente
from app.api import pagos


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Si la DB está vacía, lanza el backfill automáticamente al arrancar
    try:
        from sqlalchemy import select, func
        from app.core.database import AsyncSessionLocal
        from app.models.licitacion import Licitacion
        async with AsyncSessionLocal() as db:
            result = await db.execute(select(func.count()).select_from(Licitacion))
            count = result.scalar() or 0
        if count == 0:
            from app.workers.ingesta import backfill_ingesta
            backfill_ingesta.delay()
    except Exception:
        pass  # No bloquear el arranque si Celery/Redis no están listos aún
    yield


app = FastAPI(title="LICIT-IA API", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in settings.allowed_origins.split(",")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(licitaciones.router, prefix="/api/licitaciones", tags=["licitaciones"])
app.include_router(analisis.router, prefix="/api/analisis", tags=["analisis"])
app.include_router(ws.router, prefix="/ws", tags=["websocket"])
app.include_router(vault.router, prefix="/api/vault", tags=["vault"])
app.include_router(expediente.router, prefix="/api/expediente", tags=["expediente"])
app.include_router(pagos.router, prefix="/api/pagos", tags=["pagos"])

@app.get("/health")
async def health():
    return {"status": "ok"}
