from pydantic import BaseModel
from datetime import datetime
import uuid

class LicitacionResponse(BaseModel):
    id: uuid.UUID
    numero_procedimiento: str
    titulo: str
    dependencia: str
    fecha_apertura: datetime | None
    monto_estimado: float | None
    estado: str
    score_relevancia: float = 0.0

    model_config = {"from_attributes": True}

class LicitacionDetalle(LicitacionResponse):
    url_fuente: str | None
    modelo_evaluacion: str
    raw_json: dict
