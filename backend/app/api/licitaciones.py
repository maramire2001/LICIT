from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from app.core.database import get_db
from app.core.auth import get_current_user
from app.models.company import User
from app.models.licitacion import Licitacion, IngestaJob
from app.schemas.licitacion import LicitacionResponse, LicitacionDetalle
import uuid

router = APIRouter()

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

@router.get("/{licitacion_id}", response_model=LicitacionDetalle)
async def get_licitacion(
    licitacion_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Licitacion).where(Licitacion.id == licitacion_id)
    )
    lic = result.scalar_one_or_none()
    if not lic:
        raise HTTPException(404, "Licitacion not found")
    return LicitacionDetalle.model_validate(lic)
