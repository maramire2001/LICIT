from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, or_
from app.core.database import get_db
from app.core.auth import get_current_user
from app.models.company import User, Company
from app.models.licitacion import Licitacion, IngestaJob
from app.schemas.licitacion import LicitacionResponse, LicitacionDetalle
import uuid

router = APIRouter()

# ---------------------------------------------------------------------------
# Scoring helper
# ---------------------------------------------------------------------------

RANGO_MONTO: dict[str, tuple[float, float | None]] = {
    "<$5M":       (0, 5_000_000),
    "$5M-$20M":   (5_000_000, 20_000_000),
    "$20M-$100M": (20_000_000, 100_000_000),
    "$100M+":     (100_000_000, None),
}


def _score_licitacion(licitacion: Licitacion, company: Company) -> int:
    score = 0

    # +1 if dependencia matches any institution in prioridades_instituciones (case-insensitive substring)
    prioridades = company.prioridades_instituciones or []
    dependencia = (licitacion.dependencia or "").lower()
    if any(inst.lower() in dependencia for inst in prioridades):
        score += 1

    # +1 if monto_estimado falls within rango_financiero range
    rango = company.rango_financiero
    monto = licitacion.monto_estimado
    if rango and monto is not None and rango in RANGO_MONTO:
        low, high = RANGO_MONTO[rango]
        if high is None:
            if monto >= low:
                score += 1
        else:
            if low <= monto < high:
                score += 1

    # +1 if sector keyword appears in titulo (case-insensitive)
    sector = (company.sector or "").lower()
    titulo = (licitacion.titulo or "").lower()
    if sector and sector in titulo:
        score += 1

    return score


# ---------------------------------------------------------------------------
# Endpoints — /radar MUST come before /{licitacion_id}
# ---------------------------------------------------------------------------

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


@router.get("/radar")
async def radar_licitaciones(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not current_user.company_id:
        raise HTTPException(400, "El usuario no tiene una empresa asociada")

    company_result = await db.execute(
        select(Company).where(Company.id == current_user.company_id)
    )
    company = company_result.scalar_one_or_none()
    if not company:
        raise HTTPException(500, "Empresa no encontrada")

    sin_perfil = (
        not (company.prioridades_instituciones or [])
        and not company.rango_financiero
        and not (company.sector or "").strip()
    )

    lics_result = await db.execute(
        select(Licitacion)
        .where(Licitacion.estado == "activa")
        .order_by(desc(Licitacion.created_at))
        .limit(30)
    )
    licitaciones = lics_result.scalars().all()

    scored = []
    for lic in licitaciones:
        s = _score_licitacion(lic, company)
        data = LicitacionResponse.model_validate(lic).model_dump()
        data["score_relevancia"] = s
        data["created_at"] = lic.created_at
        scored.append(data)

    scored.sort(key=lambda x: (
        -x["score_relevancia"],
        -(x["created_at"].timestamp() if x.get("created_at") and hasattr(x.get("created_at"), "timestamp") else 0)
    ))

    return {"sin_perfil": sin_perfil, "resultados": scored}


@router.get("/", response_model=list[LicitacionResponse])
async def list_licitaciones(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, le=100),
    estado: str = Query("activa"),
    q: str | None = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    offset = (page - 1) * page_size
    query = select(Licitacion).where(Licitacion.estado == estado)

    if q:
        query = query.where(
            or_(
                Licitacion.titulo.ilike(f"%{q}%"),
                Licitacion.dependencia.ilike(f"%{q}%"),
            )
        )

    query = query.order_by(desc(Licitacion.created_at)).offset(offset).limit(page_size)
    result = await db.execute(query)
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
