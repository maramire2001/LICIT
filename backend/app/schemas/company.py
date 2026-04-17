from pydantic import BaseModel
import uuid

class OnboardingRequest(BaseModel):
    rfc: str
    nombre: str
    sector: str
    regiones: list[str] = []
    cucop_codes: list[str] = []

class CompanyResponse(BaseModel):
    id: uuid.UUID
    nombre: str
    rfc: str
    sector: str

    model_config = {"from_attributes": True}
