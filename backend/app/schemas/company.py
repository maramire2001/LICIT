from pydantic import BaseModel
import uuid

class OnboardingRequest(BaseModel):
    rfc: str
    nombre: str
    sector: str
    regiones: list[str] = []
    cucop_codes: list[str] = []
    rango_financiero: str | None = None
    acreditaciones: list[str] = []
    prioridades_instituciones: list[str] = []
    intereses_libres: str | None = None
    # tipo_plan not exposed in wizard: DB default "radar" handles it

class CompanyResponse(BaseModel):
    id: uuid.UUID
    nombre: str
    rfc: str
    sector: str
    regiones: list[str] = []
    rango_financiero: str | None = None
    acreditaciones: list[str] = []
    prioridades_instituciones: list[str] = []
    intereses_libres: str | None = None
    tipo_plan: str = "radar"

    model_config = {"from_attributes": True}
