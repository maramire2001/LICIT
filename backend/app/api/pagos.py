import os
import uuid
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.core.auth import get_current_user
from app.models.company import User, Company
from app.models.analisis import Analisis
from supabase import create_client
from app.core.config import settings

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

def get_supabase():
    return create_client(settings.supabase_url, settings.supabase_service_key)


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
    if not company:
        raise HTTPException(500, "Perfil de empresa no encontrado")
    tipo_plan = company.tipo_plan

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


@router.post("/comprobante/{analisis_id}")
async def subir_comprobante(
    analisis_id: uuid.UUID,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """El cliente sube el comprobante de transferencia bancaria."""
    if not current_user.company_id:
        raise HTTPException(400, "Completa el onboarding primero")

    result = await db.execute(
        select(Analisis).where(
            Analisis.id == analisis_id,
            Analisis.company_id == current_user.company_id,
        )
    )
    analisis = result.scalar_one_or_none()
    if not analisis:
        raise HTTPException(404, "Análisis no encontrado")
    if analisis.pago_status == "bloqueado":
        raise HTTPException(403, "Acceso bloqueado. Contacta al administrador.")

    content = await file.read()
    ext = (file.filename or "comprobante.pdf").rsplit(".", 1)[-1]
    path = f"comprobantes/{analisis_id}/{analisis_id}.{ext}"

    supabase = get_supabase()
    supabase.storage.from_("vault").upload(
        path, content, {"content-type": file.content_type or "application/octet-stream", "upsert": "true"}
    )
    url = supabase.storage.from_("vault").get_public_url(path)

    analisis.comprobante_url = url
    await db.commit()
    return {"comprobante_url": url}


@router.post("/notificar/{analisis_id}")
async def notificar_transferencia(
    analisis_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """El cliente confirma transferencia. Requiere comprobante previo. Otorga acceso inmediato."""
    result = await db.execute(
        select(Analisis).where(
            Analisis.id == analisis_id,
            Analisis.company_id == current_user.company_id,
        )
    )
    analisis = result.scalar_one_or_none()
    if not analisis:
        raise HTTPException(404, "Análisis no encontrado")
    if analisis.pago_status == "bloqueado":
        raise HTTPException(403, "Acceso bloqueado. Contacta al administrador.")
    if analisis.pago_status == "confirmado":
        return {"status": "confirmado", "monto": int(analisis.pago_monto) if analisis.pago_monto else None}
    if not analisis.comprobante_url:
        raise HTTPException(400, "Sube el comprobante de transferencia antes de confirmar")

    company_result = await db.execute(
        select(Company).where(Company.id == current_user.company_id)
    )
    company = company_result.scalar_one_or_none()
    if not company:
        raise HTTPException(500, "Perfil de empresa no encontrado")
    tipo_plan = company.tipo_plan
    monto = _calcular_monto(analisis.nivel_complejidad, tipo_plan)

    analisis.pago_status = "confirmado"
    analisis.pago_monto = monto
    await db.commit()
    return {"status": "confirmado", "monto": monto}


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


@router.post("/bloquear/{analisis_id}")
async def bloquear_pago(
    analisis_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Admin revoca el acceso cuando el pago no se acredita."""
    if not _is_admin(current_user):
        raise HTTPException(403, "Solo el administrador puede bloquear pagos")

    result = await db.execute(
        select(Analisis).where(Analisis.id == analisis_id)
    )
    analisis = result.scalar_one_or_none()
    if not analisis:
        raise HTTPException(404, "Análisis no encontrado")

    analisis.pago_status = "bloqueado"
    await db.commit()
    return {"status": "bloqueado"}


@router.get("/recientes")
async def listar_recientes(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Admin: lista de análisis con pago confirmado (comprobante subido)."""
    if not _is_admin(current_user):
        raise HTTPException(403, "Solo el administrador puede ver pagos")

    result = await db.execute(
        select(Analisis).where(Analisis.pago_status == "confirmado")
    )
    analisis_list = result.scalars().all()

    return [
        {
            "analisis_id": str(a.id),
            "company_id": str(a.company_id),
            "nivel_complejidad": a.nivel_complejidad,
            "pago_monto": int(a.pago_monto) if a.pago_monto else None,
            "pago_status": a.pago_status,
            "comprobante_url": a.comprobante_url,
            "created_at": a.created_at.isoformat(),
        }
        for a in analisis_list
    ]
