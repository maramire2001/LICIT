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
        requisitos_criticos={},
        riesgos={},
        competidores={},
    )
    db.add(analisis)
    await db.commit()
    await db.refresh(analisis)

    run_analisis.delay(
        str(analisis.id),
        str(current_user.company_id),
        str(payload.licitacion_id),
    )

    return analisis

@router.get("/{analisis_id}", response_model=AnalisisResponse)
async def get_analisis(
    analisis_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Analisis).where(
            Analisis.id == analisis_id,
            Analisis.company_id == current_user.company_id,
        )
    )
    analisis = result.scalar_one_or_none()
    if not analisis:
        raise HTTPException(404, "Análisis no encontrado")
    return analisis
