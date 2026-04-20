import httpx
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.licitacion import Licitacion, LicitacionDoc
from app.services.ocr import extract_text_from_bytes

MAX_OCR_CHARS = 180_000  # ~90k tokens, leaves room for prompt + response in 200k ctx


def _find_pdf_url(licitacion: Licitacion) -> str | None:
    """Find PDF URL from OCDS tender.documents, fall back to url_fuente."""
    docs = (licitacion.raw_json or {}).get("tender", {}).get("documents", [])
    for doc in docs:
        fmt = doc.get("format", "")
        url = doc.get("url", "")
        if "pdf" in fmt.lower() or url.lower().endswith(".pdf"):
            return url
    return licitacion.url_fuente or None


async def download_pdf_bytes(url: str) -> bytes:
    async with httpx.AsyncClient(timeout=60, follow_redirects=True) as client:
        r = await client.get(url)
        r.raise_for_status()
        return r.content


async def get_or_fetch_ocr(db: AsyncSession, licitacion: Licitacion) -> str:
    """Return cached OCR text or download, OCR, and cache the PDF. Returns '' if no PDF found."""
    result = await db.execute(
        select(LicitacionDoc).where(
            LicitacionDoc.licitacion_id == licitacion.id,
            LicitacionDoc.tipo == "convocatoria",
        )
    )
    doc = result.scalar_one_or_none()
    if doc and doc.texto_ocr:
        return doc.texto_ocr[:MAX_OCR_CHARS]

    pdf_url = _find_pdf_url(licitacion)
    if not pdf_url:
        return ""

    try:
        pdf_bytes = await download_pdf_bytes(pdf_url)
    except Exception:
        return ""

    texto = extract_text_from_bytes(pdf_bytes)
    texto_truncado = texto[:MAX_OCR_CHARS]

    if doc:
        doc.texto_ocr = texto_truncado
    else:
        doc = LicitacionDoc(
            licitacion_id=licitacion.id,
            tipo="convocatoria",
            url=pdf_url,
            texto_ocr=texto_truncado,
        )
        db.add(doc)
    # Caller commits after analisis update

    return texto_truncado
