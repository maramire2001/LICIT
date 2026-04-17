import uuid
from datetime import datetime
from sqlalchemy import String, Numeric, DateTime, JSON, Text
from sqlalchemy.orm import Mapped, mapped_column
from pgvector.sqlalchemy import Vector
from app.core.database import Base

class Licitacion(Base):
    __tablename__ = "licitaciones"
    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    numero_procedimiento: Mapped[str] = mapped_column(String(100), unique=True)
    titulo: Mapped[str] = mapped_column(Text)
    dependencia: Mapped[str] = mapped_column(String(255))
    fecha_publicacion: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    fecha_apertura: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    fecha_fallo: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    monto_estimado: Mapped[float | None] = mapped_column(Numeric, nullable=True)
    modelo_evaluacion: Mapped[str] = mapped_column(String(20), default="binario")
    estado: Mapped[str] = mapped_column(String(20), default="activa")
    portal: Mapped[str] = mapped_column(String(50), default="compranet")
    url_fuente: Mapped[str | None] = mapped_column(Text, nullable=True)
    raw_json: Mapped[dict] = mapped_column(JSON, default=dict)
    embedding: Mapped[list | None] = mapped_column(Vector(1536), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

class LicitacionDoc(Base):
    __tablename__ = "licitacion_docs"
    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    licitacion_id: Mapped[uuid.UUID] = mapped_column()
    tipo: Mapped[str] = mapped_column(String(50))
    url: Mapped[str] = mapped_column(Text)
    texto_ocr: Mapped[str | None] = mapped_column(Text, nullable=True)

class Adjudicacion(Base):
    __tablename__ = "adjudicaciones"
    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    licitacion_id: Mapped[uuid.UUID | None] = mapped_column(nullable=True)
    empresa_ganadora: Mapped[str] = mapped_column(String(255))
    monto_adjudicado: Mapped[float | None] = mapped_column(Numeric, nullable=True)
    año: Mapped[int | None] = mapped_column(nullable=True)
    dependencia: Mapped[str] = mapped_column(String(255))
    nivel_confianza: Mapped[str] = mapped_column(String(10), default="medio")

class IngestaJob(Base):
    __tablename__ = "ingesta_jobs"
    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    tipo: Mapped[str] = mapped_column(String(20))
    status: Mapped[str] = mapped_column(String(20), default="pendiente")
    progreso: Mapped[int] = mapped_column(default=0)
    registros_procesados: Mapped[int] = mapped_column(default=0)
    error: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
