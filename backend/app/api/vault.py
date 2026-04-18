from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.core.auth import get_current_user
from app.models.company import User
from app.models.vault import VaultDocumento
from app.services.ocr import extract_text_from_bytes
from supabase import create_client
from app.core.config import settings
import uuid

router = APIRouter()

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
