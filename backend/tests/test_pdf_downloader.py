from unittest.mock import MagicMock
from app.services.pdf_downloader import _find_pdf_url, MAX_OCR_CHARS


def _lic(raw_json=None, url_fuente=None):
    m = MagicMock()
    m.raw_json = raw_json or {}
    m.url_fuente = url_fuente
    return m


def test_find_pdf_url_from_documents_by_format():
    lic = _lic(raw_json={
        "tender": {
            "documents": [
                {"format": "application/pdf", "url": "https://example.com/bases.pdf"},
            ]
        }
    })
    assert _find_pdf_url(lic) == "https://example.com/bases.pdf"


def test_find_pdf_url_from_documents_by_extension():
    lic = _lic(raw_json={
        "tender": {
            "documents": [
                {"format": "text/html", "url": "https://example.com/bases.pdf"},
            ]
        }
    })
    assert _find_pdf_url(lic) == "https://example.com/bases.pdf"


def test_find_pdf_url_fallback_to_url_fuente():
    lic = _lic(raw_json={}, url_fuente="https://example.com/page")
    assert _find_pdf_url(lic) == "https://example.com/page"


def test_find_pdf_url_returns_none_when_nothing():
    lic = _lic()
    assert _find_pdf_url(lic) is None


def test_max_ocr_chars_is_180k():
    assert MAX_OCR_CHARS == 180_000


import pytest
from unittest.mock import AsyncMock, patch


@pytest.mark.asyncio
async def test_get_or_fetch_ocr_returns_cached_text():
    from app.services.pdf_downloader import get_or_fetch_ocr

    cached_doc = MagicMock()
    cached_doc.texto_ocr = "Texto del PDF ya cacheado"

    mock_db = AsyncMock()
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = cached_doc
    mock_db.execute = AsyncMock(return_value=mock_result)

    lic = MagicMock()
    lic.id = "test-id"

    result = await get_or_fetch_ocr(mock_db, lic)
    assert result == "Texto del PDF ya cacheado"


@pytest.mark.asyncio
async def test_get_or_fetch_ocr_returns_empty_when_no_url():
    from app.services.pdf_downloader import get_or_fetch_ocr

    mock_db = AsyncMock()
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = None
    mock_db.execute = AsyncMock(return_value=mock_result)

    lic = MagicMock()
    lic.id = "test-id"
    lic.raw_json = {}
    lic.url_fuente = None

    result = await get_or_fetch_ocr(mock_db, lic)
    assert result == ""
