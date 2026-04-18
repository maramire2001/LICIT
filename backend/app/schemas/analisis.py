from pydantic import BaseModel
from datetime import datetime
import uuid

class AnalisisCreate(BaseModel):
    licitacion_id: uuid.UUID

class AnalisisResponse(BaseModel):
    id: uuid.UUID
    licitacion_id: uuid.UUID
    status: str
    viabilidad: str | None
    score_viabilidad: float | None
    modelo_evaluacion_detectado: str | None
    requisitos_criticos: dict
    riesgos: dict
    price_to_win_conservador: float | None
    ptw_optimo: float | None
    ptw_agresivo: float | None
    competidores: dict
    created_at: datetime

    model_config = {"from_attributes": True}
