from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import auth
from app.api import licitaciones
from app.api import analisis, ws
from app.api import vault, expediente
from app.api import pagos

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
app.include_router(ws.router, prefix="/ws", tags=["websocket"])
app.include_router(vault.router, prefix="/api/vault", tags=["vault"])
app.include_router(expediente.router, prefix="/api/expediente", tags=["expediente"])
app.include_router(pagos.router, prefix="/api/pagos", tags=["pagos"])

@app.get("/health")
async def health():
    return {"status": "ok"}
