from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.core.auth import get_current_user
from app.models.company import User
from app.models.vault import VaultDocumento
from app.models.analisis import Analisis
from app.services.ocr import extract_text_from_bytes
from supabase import create_client
from app.core.config import settings
import uuid

router = APIRouter()

KEYWORD_MAP = [
    (["repse"], "repse", "Registro REPSE vigente ante STPS"),
    (["iso 9001", "iso9001"], "iso9001", "Certificación ISO 9001:2015"),
    (["iso 27001", "iso27001"], "iso27001", "Certificación ISO 27001"),
    (["acta constitutiva", "acta"], "acta", "Acta Constitutiva"),
    (["rfc", "constancia fiscal"], "rfc", "Constancia de Situación Fiscal RFC"),
    (["sat", "opinión de cumplimiento", "32-d", "32d"], "sat32d", "Opinión de Cumplimiento SAT 32-D"),
    (["infonavit", "cumplimiento ante infonavit"], "infonavit", "Opinión de Cumplimiento INFONAVIT"),
    (["poder notarial", "representante legal"], "poder", "Poder Notarial del representante"),
    (["estado de cuenta", "cuenta bancaria"], "estado_cuenta", "Estado de cuenta bancario (últimos 3 meses)"),
    (["fianza", "garantía de seriedad"], "fianza", "Póliza de fianza de seriedad"),
    (["seguro", "póliza"], "seguro", "Póliza de seguro de responsabilidad civil"),
]

def _extraer_docs_requeridos(requisitos: list, matrices: list) -> list[dict]:
    textos = [str(r).lower() for r in requisitos]
    for m in matrices:
        if isinstance(m, dict):
            textos.append(str(m.get("requisito", "")).lower())

    encontrados: dict[str, str] = {}
    for keywords, tipo, descripcion in KEYWORD_MAP:
        for texto in textos:
            if any(kw in texto for kw in keywords):
                if tipo not in encontrados:
                    encontrados[tipo] = descripcion
                break

    for tipo, desc in [("acta", "Acta Constitutiva"), ("rfc", "Constancia de Situación Fiscal RFC")]:
        if tipo not in encontrados:
            encontrados[tipo] = desc

    return [{"tipo": k, "descripcion": v} for k, v in encontrados.items()]

def get_supabase():
    return create_client(settings.supabase_url, settings.supabase_service_key)

@router.post("/upload")
async def upload_documento(
    tipo: str = Form(...),
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not current_user.company_id:
        raise HTTPException(400, "Completa el onboarding primero")

    content = await file.read()
    supabase = get_supabase()
    path = f"{current_user.company_id}/{tipo}/{uuid.uuid4()}-{file.filename}"

    supabase.storage.from_("vault").upload(
        path, content, {"content-type": file.content_type or "application/octet-stream"}
    )
    url = supabase.storage.from_("vault").get_public_url(path)

    texto = ""
    if file.content_type == "application/pdf" or (file.filename or "").endswith(".pdf"):
        try:
            texto = extract_text_from_bytes(content)
        except Exception:
            texto = ""

    doc = VaultDocumento(
        company_id=current_user.company_id,
        tipo=tipo,
        archivo_url=url,
        datos_extraidos={"texto_extraido": texto[:2000]},
    )
    db.add(doc)
    await db.commit()
    await db.refresh(doc)
    return {"id": str(doc.id), "url": url, "tipo": tipo}

@router.get("/")
async def list_documentos(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not current_user.company_id:
        return []
    result = await db.execute(
        select(VaultDocumento).where(VaultDocumento.company_id == current_user.company_id)
    )
    docs = result.scalars().all()
    return [
        {"id": str(d.id), "tipo": d.tipo, "url": d.archivo_url, "vigente": d.vigente}
        for d in docs
    ]

@router.get("/requerimiento/{analisis_id}")
async def requerimiento_vault(
    analisis_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Devuelve los documentos requeridos para una licitación y cuáles ya están en el vault."""
    if not current_user.company_id:
        raise HTTPException(400, "Completa el onboarding primero")

    analisis_result = await db.execute(
        select(Analisis).where(
            Analisis.id == analisis_id,
            Analisis.company_id == current_user.company_id,
        )
    )
    analisis = analisis_result.scalar_one_or_none()
    if not analisis:
        raise HTTPException(404, "Análisis no encontrado")

    rc = analisis.requisitos_criticos
    requisitos = rc.get("items", []) if isinstance(rc, dict) else []
    matrices_items = []
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
    vault_docs = vault_result.scalars().all()
    vault_tipos = {d.tipo: str(d.id) for d in vault_docs}

    return [
        {
            "tipo": r["tipo"],
            "descripcion": r["descripcion"],
            "cubierto": r["tipo"] in vault_tipos,
            "vault_doc_id": vault_tipos.get(r["tipo"]),
        }
        for r in requeridos
    ]
