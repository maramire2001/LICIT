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

    refined = await chat(
        messages=[
            {
                "role": "system",
                "content": "Eres experto en propuestas técnicas para licitaciones mexicanas.",
            },
            {
                "role": "user",
                "content": (
                    f"Texto actual:\n{exp.propuesta_tecnica_draft}\n\n"
                    f"Instrucción de mejora: {instruccion}\n\n"
                    "Devuelve solo el texto mejorado."
                ),
            },
        ]
    )
    return {"propuesta_tecnica_draft": refined}
