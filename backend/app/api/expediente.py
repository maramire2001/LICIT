from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.core.auth import get_current_user
from app.models.company import User, Company
from app.models.expediente import Expediente
from app.schemas.expediente import ExpedienteResponse, UpdatePropuestaTecnica
from app.core.llm_client import chat
from app.models.analisis import Analisis
from app.models.vault import VaultDocumento
from app.api.vault import _extraer_docs_requeridos
import uuid
import io
import zipfile
from datetime import datetime


DISCLAIMER = (
    "\n---\n"
    "AVISO LEGAL\n"
    "Este expediente es una guía preparada con inteligencia artificial como herramienta de apoyo.\n"
    "LICIT-IA no garantiza adjudicación ni se responsabiliza por el resultado del proceso licitatorio.\n"
    "El contenido debe ser revisado y validado por el área jurídica y directiva de su empresa\n"
    "antes de presentarse ante la dependencia. La responsabilidad de la presentación recae\n"
    "exclusivamente en el participante.\n"
)


def _fmt_mxn(n) -> str:
    if n is None:
        return "—"
    return f"${float(n):,.0f} MXN"


def _generar_portada(company_nombre: str, company_rfc: str, version: int, analisis_id_short: str) -> str:
    fecha = datetime.utcnow().strftime("%d/%m/%Y %H:%M UTC")
    return (
        f"EXPEDIENTE LICIT-IA\n"
        f"{'='*40}\n"
        f"Empresa:  {company_nombre}\n"
        f"RFC:      {company_rfc}\n"
        f"Análisis: {analisis_id_short}\n"
        f"Versión:  v{version}\n"
        f"Generado: {fecha}\n"
        f"{DISCLAIMER}"
    )


def _flag_doc(doc: dict, riesgos_items: list[str]) -> str | None:
    """Devuelve el texto del riesgo si el doc está flaggeado, None si no."""
    palabras = [w for w in doc["descripcion"].lower().split() if len(w) > 2]
    for riesgo in riesgos_items:
        riesgo_lower = riesgo.lower()
        if doc["tipo"].lower() in riesgo_lower or any(w in riesgo_lower for w in palabras):
            return riesgo
    return None


def _generar_checklist(docs_requeridos: list[dict], riesgos_items: list[str], analisis_id_short: str = "") -> str:
    cubiertos = [d for d in docs_requeridos if d["cubierto"]]
    faltantes = [d for d in docs_requeridos if not d["cubierto"]]

    flagged = [(d, _flag_doc(d, riesgos_items)) for d in cubiertos]
    ok = [d for d, f in flagged if f is None]
    con_flag = [(d, f) for d, f in flagged if f is not None]

    n_total = len(docs_requeridos)
    n_cubiertos = len(cubiertos)
    n_flagged = len(con_flag)
    n_faltantes = len(faltantes)

    lines = [
        "CHECKLIST DE CUMPLIMIENTO",
        "=" * 40,
        f"Licitación: {analisis_id_short}",
        f"Total requeridos: {n_total}  |  Cubiertos: {n_cubiertos}  |  Requieren revisión: {n_flagged}  |  Faltantes: {n_faltantes}",
        "",
    ]
    if ok:
        lines.append("✓ DOCUMENTOS CUBIERTOS")
        for d in ok:
            lines.append(f"  ✓ {d['descripcion']}")
        lines.append("")
    if con_flag:
        lines.append("⚑ REQUIEREN REVISIÓN ANTES DE ENVIAR")
        for d, f in con_flag:
            lines.append(f"  ⚑ {d['descripcion']}")
            lines.append(f"    → {f}")
        lines.append("")
    if faltantes:
        lines.append("✗ DOCUMENTOS FALTANTES")
        for d in faltantes:
            lines.append(f"  ✗ {d['descripcion']}")
    return "\n".join(lines)


def _generar_economica(propuesta_economica: dict, ptw_conservador, ptw_optimo, ptw_agresivo) -> str:
    monto = propuesta_economica.get("monto_propuesto")
    desglose = propuesta_economica.get("desglose", [])
    lines = [
        "PROPUESTA ECONÓMICA",
        "=" * 40,
        f"Monto propuesto (óptimo): {_fmt_mxn(monto)}",
        "",
        f"Price to Win conservador: {_fmt_mxn(ptw_conservador)}",
        f"Price to Win óptimo:      {_fmt_mxn(ptw_optimo)}",
        f"Price to Win agresivo:    {_fmt_mxn(ptw_agresivo)}",
        "",
    ]
    if desglose:
        lines.append("Desglose:")
        for item in desglose:
            lines.append(f"  - {item}")
        lines.append("")
    lines.append("Basado en análisis de adjudicaciones históricas para esta dependencia.")
    return "\n".join(lines)


def _generar_pendientes(docs_requeridos: list[dict], riesgos_items: list[str]) -> str:
    flagged_lines = []
    faltantes_lines = []
    for d in docs_requeridos:
        if not d["cubierto"]:
            faltantes_lines.append(f"[✗ FALTA]   {d['descripcion']}")
        else:
            f = _flag_doc(d, riesgos_items)
            if f:
                flagged_lines.append(f"[⚑ REVISAR] {d['descripcion']}\n           → {f}")

    if not flagged_lines and not faltantes_lines:
        return "Todo en orden — expediente al 100% de cobertura documental."

    lines = ["ACCIONES PENDIENTES ANTES DE ENVIAR", "=" * 40, ""]
    lines.extend(flagged_lines)
    if flagged_lines and faltantes_lines:
        lines.append("")
    lines.extend(faltantes_lines)
    return "\n".join(lines)


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


@router.get("/{analisis_id}/zip")
async def descargar_zip(
    analisis_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    exp_result = await db.execute(
        select(Expediente).where(
            Expediente.analisis_id == analisis_id,
            Expediente.company_id == current_user.company_id,
        )
    )
    exp = exp_result.scalar_one_or_none()
    if not exp:
        raise HTTPException(404, "Expediente no encontrado")

    analisis_result = await db.execute(
        select(Analisis).where(Analisis.id == analisis_id)
    )
    analisis = analisis_result.scalar_one_or_none()
    if not analisis:
        raise HTTPException(404, "Análisis no encontrado")

    company_result = await db.execute(
        select(Company).where(Company.id == current_user.company_id)
    )
    company = company_result.scalar_one_or_none()
    if not company:
        raise HTTPException(500, "Error al generar el expediente")

    rc = analisis.requisitos_criticos or {}
    requisitos = rc.get("items", []) if isinstance(rc, dict) else []
    matrices_items: list = []
    for campo in [analisis.matriz_humana, analisis.matriz_materiales, analisis.matriz_financiera]:
        if isinstance(campo, dict):
            matrices_items.extend(campo.get("items", []))
    requeridos = _extraer_docs_requeridos(requisitos, matrices_items)

    vault_result = await db.execute(
        select(VaultDocumento).where(
            VaultDocumento.company_id == current_user.company_id,
            VaultDocumento.vigente == True,
        )
    )
    vault_tipos = {d.tipo for d in vault_result.scalars().all()}

    docs_requeridos = [
        {"tipo": r["tipo"], "descripcion": r["descripcion"], "cubierto": r["tipo"] in vault_tipos}
        for r in requeridos
    ]
    riesgos_items: list[str] = (analisis.riesgos or {}).get("items", [])
    rc_items: list[str] = (analisis.requisitos_criticos or {}).get("items", [])
    flag_items: list[str] = riesgos_items + rc_items
    analisis_id_short = str(analisis_id)[:8].upper()

    portada = _generar_portada(company.nombre, company.rfc, exp.version, analisis_id_short)
    checklist = _generar_checklist(docs_requeridos, flag_items, analisis_id_short)
    tecnica = exp.propuesta_tecnica_draft or (
        "[Propuesta técnica no generada — regresa al expediente y usa el editor IA]"
    )
    economica = _generar_economica(
        exp.propuesta_economica or {},
        analisis.price_to_win_conservador,
        analisis.ptw_optimo,
        analisis.ptw_agresivo,
    )
    pendientes = _generar_pendientes(docs_requeridos, flag_items)

    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("portada.txt", portada)
        zf.writestr("01_checklist_cumplimiento.txt", checklist)
        zf.writestr("02_propuesta_tecnica.txt", tecnica)
        zf.writestr("03_propuesta_economica.txt", economica)
        zf.writestr("04_pendientes.txt", pendientes)
    buf.seek(0)

    filename = f"expediente_{analisis_id_short}.zip"
    return StreamingResponse(
        iter([buf.read()]),
        media_type="application/zip",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
