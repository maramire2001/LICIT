from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import auth
from app.api import licitaciones

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

@app.get("/health")
async def health():
    return {"status": "ok"}
