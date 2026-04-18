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
    requisitos_criticos: dict | None = None
    riesgos: dict | None = None
    price_to_win_conservador: float | None = None
    ptw_optimo: float | None = None
    ptw_agresivo: float | None = None
    competidores: dict | None = None
    nivel_complejidad: str | None = None
    matriz_humana: dict | None = None
    matriz_materiales: dict | None = None
    matriz_financiera: dict | None = None
    roi_datos: dict | None = None
    pago_status: str = "pendiente"
    comprobante_url: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}
