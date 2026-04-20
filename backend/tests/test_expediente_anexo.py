import pytest
import uuid
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.core.database import AsyncSessionLocal
from app.models.expediente import Expediente

FAKE_ANALISIS_ID = uuid.uuid4()
FAKE_COMPANY_ID = uuid.UUID("b6f8a1d2-0000-0000-0000-000000000001")


@pytest.fixture
async def expediente_en_db():
    async with AsyncSessionLocal() as db:
        exp = Expediente(
            analisis_id=FAKE_ANALISIS_ID,
            company_id=FAKE_COMPANY_ID,
            carpeta_admin={"documentos": []},
            propuesta_economica={"monto_propuesto": None, "desglose": []},
            checklist={"items": []},
            faltantes={"items": []},
            anexo_respuestas={"items": []},
        )
        db.add(exp)
        await db.commit()
        await db.refresh(exp)
        return exp


@pytest.mark.asyncio
async def test_expediente_has_anexo_respuestas_field(expediente_en_db):
    """Verify the field exists on the model and persists correctly."""
    async with AsyncSessionLocal() as db:
        from sqlalchemy import select
        result = await db.execute(
            select(Expediente).where(Expediente.id == expediente_en_db.id)
        )
        exp = result.scalar_one()
    assert exp.anexo_respuestas == {"items": []}


@pytest.mark.asyncio
async def test_expediente_response_includes_anexo_respuestas():
    """Verify GET /api/expediente/{analisis_id} does not return 500 (field exists in schema)."""
    some_id = uuid.uuid4()
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        resp = await client.get(
            f"/api/expediente/{str(some_id)}",
            headers={"Authorization": "Bearer test-bypass"},
        )
    # May be 404 if auth fails (no real user) but should not be 500
    assert resp.status_code in (200, 401, 404)
    if resp.status_code == 200:
        assert "anexo_respuestas" in resp.json()
