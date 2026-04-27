from fastapi import APIRouter, Depends, Query, HTTPException, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, or_
from app.core.database import get_db
from app.core.auth import get_current_user
from app.models.company import User, Company
from app.models.licitacion import Licitacion, IngestaJob, LicitacionDoc
from app.schemas.licitacion import LicitacionResponse, LicitacionDetalle
from app.services.ocr import extract_text_from_bytes
import os
import uuid

router = APIRouter()


def _is_admin(user: User) -> bool:
    admin_email = os.getenv("ADMIN_EMAIL", "")
    return bool(admin_email) and user.email == admin_email


@router.post("/backfill")
async def trigger_backfill(
    current_user: User = Depends(get_current_user),
):
    """Admin: lanza el backfill del crawler de CompraNet."""
    if not _is_admin(current_user):
        raise HTTPException(403, "Solo el administrador puede iniciar el backfill")
    from app.workers.ingesta import backfill_ingesta
    backfill_ingesta.delay()
    return {"status": "iniciado", "mensaje": "Backfill en cola — revisa /ingesta-status para el progreso"}

# ---------------------------------------------------------------------------
# Scoring helper
# ---------------------------------------------------------------------------

RANGO_MONTO: dict[str, tuple[float, float | None]] = {
    "<$5M":       (0, 5_000_000),
    "$5M-$20M":   (5_000_000, 20_000_000),
    "$20M-$100M": (20_000_000, 100_000_000),
    "$100M+":     (100_000_000, None),
}

RADAR_CANDIDATE_LIMIT = 30


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

    # +1 if any sector keyword (word >3 chars) appears in titulo (case-insensitive)
    if company.sector and licitacion.titulo:
        titulo_lower = licitacion.titulo.lower()
        sector_words = [w for w in company.sector.lower().split() if len(w) > 3]
        if sector_words and any(w in titulo_lower for w in sector_words):
            score += 1

    return score


# ---------------------------------------------------------------------------
# Endpoints — /radar MUST come before /{licitacion_id}
# ---------------------------------------------------------------------------

@router.get("/ingesta-status")
async def ingesta_status(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
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
        .limit(RADAR_CANDIDATE_LIMIT)
    )
    licitaciones = lics_result.scalars().all()

    scored_pairs = sorted(
        [(l, _score_licitacion(l, company)) for l in licitaciones],
        key=lambda pair: (-pair[1], -(pair[0].created_at.timestamp() if pair[0].created_at else 0))
    )
    resultados = []
    for l, score in scored_pairs:
        d = LicitacionResponse.model_validate(l).model_dump()
        d["score_relevancia"] = score
        resultados.append(d)

    return {"sin_perfil": sin_perfil, "resultados": resultados}


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


@router.post("/{licitacion_id}/docs/upload")
async def upload_pdf(
    licitacion_id: uuid.UUID,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(400, "Solo se aceptan archivos PDF")

    result = await db.execute(
        select(Licitacion).where(Licitacion.id == licitacion_id)
    )
    lic = result.scalar_one_or_none()
    if not lic:
        raise HTTPException(404, "Licitación no encontrada")

    pdf_bytes = await file.read()
    texto_ocr = extract_text_from_bytes(pdf_bytes)

    existing = await db.execute(
        select(LicitacionDoc).where(
            LicitacionDoc.licitacion_id == licitacion_id,
            LicitacionDoc.tipo == "convocatoria",
        )
    )
    doc = existing.scalar_one_or_none()
    if doc:
        doc.texto_ocr = texto_ocr[:180_000]
        doc.url = f"upload:{file.filename}"
    else:
        doc = LicitacionDoc(
            licitacion_id=licitacion_id,
            tipo="convocatoria",
            url=f"upload:{file.filename}",
            texto_ocr=texto_ocr[:180_000],
        )
        db.add(doc)

    await db.commit()
    return {"mensaje": "PDF subido y procesado", "chars_extraidos": len(texto_ocr)}
