from pydantic import BaseModel
import uuid
from datetime import datetime

class ExpedienteResponse(BaseModel):
    id: uuid.UUID
    analisis_id: uuid.UUID
    carpeta_admin: dict
    propuesta_tecnica_draft: str | None
    propuesta_economica: dict
    checklist: dict
    faltantes: dict
    version: int
    created_at: datetime

    model_config = {"from_attributes": True}

class UpdatePropuestaTecnica(BaseModel):
    propuesta_tecnica_draft: str
