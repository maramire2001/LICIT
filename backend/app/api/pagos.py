import os
import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.core.auth import get_current_user
from app.models.company import User, Company
from app.models.analisis import Analisis

router = APIRouter()

PRECIOS = {
    "bronce": {"radar": 20_000, "directo": 40_000},
    "plata":  {"radar": 30_000, "directo": 50_000},
    "oro":    {"radar": 40_000, "directo": 60_000},
}

def _calcular_monto(nivel: str, tipo_plan: str) -> int:
    nivel_key = (nivel or "bronce").lower()
    plan_key = tipo_plan if tipo_plan in ("radar", "directo") else "directo"
    return PRECIOS.get(nivel_key, PRECIOS["bronce"])[plan_key]

def _is_admin(user: User) -> bool:
    admin_email = os.getenv("ADMIN_EMAIL", "")
    return user.email == admin_email


@router.get("/info/{analisis_id}")
async def info_pago(
    analisis_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Devuelve monto, datos bancarios y estado de pago para un análisis."""
    result = await db.execute(
        select(Analisis).where(
            Analisis.id == analisis_id,
            Analisis.company_id == current_user.company_id,
        )
    )
    analisis = result.scalar_one_or_none()
    if not analisis:
        raise HTTPException(404, "Análisis no encontrado")

    company_result = await db.execute(
        select(Company).where(Company.id == current_user.company_id)
    )
    company = company_result.scalar_one_or_none()
    tipo_plan = company.tipo_plan if company else "directo"

    monto = _calcular_monto(analisis.nivel_complejidad, tipo_plan)

    return {
        "analisis_id": str(analisis_id),
        "nivel_complejidad": analisis.nivel_complejidad or "bronce",
        "tipo_plan": tipo_plan,
        "monto": monto,
        "pago_status": analisis.pago_status,
        "referencia": str(analisis_id)[:8].upper(),
        "banco": os.getenv("BANK_NOMBRE", "Banorte"),
        "clabe": os.getenv("BANK_CLABE", ""),
        "titular": os.getenv("BANK_TITULAR", ""),
    }


@router.post("/notificar/{analisis_id}")
async def notificar_transferencia(
    analisis_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """El cliente confirma que ya realizó la transferencia."""
    result = await db.execute(
        select(Analisis).where(
            Analisis.id == analisis_id,
            Analisis.company_id == current_user.company_id,
        )
    )
    analisis = result.scalar_one_or_none()
    if not analisis:
        raise HTTPException(404, "Análisis no encontrado")
    if analisis.pago_status == "confirmado":
        return {"status": "confirmado"}

    company_result = await db.execute(
        select(Company).where(Company.id == current_user.company_id)
    )
    company = company_result.scalar_one_or_none()
    tipo_plan = company.tipo_plan if company else "directo"
    monto = _calcular_monto(analisis.nivel_complejidad, tipo_plan)

    analisis.pago_status = "en_revision"
    analisis.pago_monto = monto
    await db.commit()
    return {"status": "en_revision", "monto": monto}


@router.post("/confirmar/{analisis_id}")
async def confirmar_pago(
    analisis_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Admin confirma el pago y desbloquea el expediente."""
    if not _is_admin(current_user):
        raise HTTPException(403, "Solo el administrador puede confirmar pagos")

    result = await db.execute(
        select(Analisis).where(Analisis.id == analisis_id)
    )
    analisis = result.scalar_one_or_none()
    if not analisis:
        raise HTTPException(404, "Análisis no encontrado")

    analisis.pago_status = "confirmado"
    await db.commit()
    return {"status": "confirmado"}


@router.get("/pendientes")
async def listar_pendientes(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Admin: lista de análisis con pago en revisión."""
    if not _is_admin(current_user):
        raise HTTPException(403, "Solo el administrador puede ver pagos pendientes")

    result = await db.execute(
        select(Analisis).where(Analisis.pago_status == "en_revision")
    )
    analisis_list = result.scalars().all()

    return [
        {
            "analisis_id": str(a.id),
            "company_id": str(a.company_id),
            "nivel_complejidad": a.nivel_complejidad,
            "pago_monto": float(a.pago_monto) if a.pago_monto else None,
            "pago_status": a.pago_status,
            "created_at": a.created_at.isoformat(),
        }
        for a in analisis_list
    ]
