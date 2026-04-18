import uuid
from sqlalchemy import String, ARRAY, JSON, Text
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base

class Company(Base):
    __tablename__ = "companies"
    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    nombre: Mapped[str] = mapped_column(String(255))
    rfc: Mapped[str] = mapped_column(String(13), unique=True)
    sector: Mapped[str] = mapped_column(String(100))
    regiones: Mapped[list] = mapped_column(ARRAY(String), default=list)
    cucop_codes: Mapped[list] = mapped_column(ARRAY(String), default=list)
    perfil_semantico: Mapped[dict] = mapped_column(JSON, default=dict)
    rango_financiero: Mapped[str | None] = mapped_column(String(20), nullable=True)
    acreditaciones: Mapped[list] = mapped_column(ARRAY(String), default=list, nullable=True)
    prioridades_instituciones: Mapped[list] = mapped_column(ARRAY(String), default=list, nullable=True)
    intereses_libres: Mapped[str | None] = mapped_column(Text, nullable=True)
    tipo_plan: Mapped[str] = mapped_column(String(20), default="radar")

class User(Base):
    __tablename__ = "users"
    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    supabase_uid: Mapped[str] = mapped_column(String(255), unique=True)
    company_id: Mapped[uuid.UUID | None] = mapped_column(nullable=True)
    email: Mapped[str] = mapped_column(String(255))
    rol: Mapped[str] = mapped_column(String(20), default="analista")
