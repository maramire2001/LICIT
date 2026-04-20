import uuid
from datetime import datetime
from sqlalchemy import String, Numeric, DateTime, JSON, Text
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base

class Analisis(Base):
    __tablename__ = "analisis"
    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    company_id: Mapped[uuid.UUID] = mapped_column()
    licitacion_id: Mapped[uuid.UUID] = mapped_column()
    status: Mapped[str] = mapped_column(String(20), default="procesando")
    viabilidad: Mapped[str | None] = mapped_column(String(30), nullable=True)
    score_viabilidad: Mapped[float | None] = mapped_column(Numeric, nullable=True)
    modelo_evaluacion_detectado: Mapped[str | None] = mapped_column(String(20), nullable=True)
    requisitos_criticos: Mapped[dict] = mapped_column(JSON, default=dict)
    riesgos: Mapped[dict] = mapped_column(JSON, default=dict)
    price_to_win_conservador: Mapped[float | None] = mapped_column(Numeric, nullable=True)
    ptw_optimo: Mapped[float | None] = mapped_column(Numeric, nullable=True)
    ptw_agresivo: Mapped[float | None] = mapped_column(Numeric, nullable=True)
    competidores: Mapped[dict] = mapped_column(JSON, default=dict)
    nivel_complejidad: Mapped[str | None] = mapped_column(String(10), nullable=True)
    matriz_humana: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    matriz_materiales: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    matriz_financiera: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    roi_datos: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    anexo_tecnico_requisitos: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    pago_status: Mapped[str] = mapped_column(String(20), default="pendiente")
    pago_monto: Mapped[float | None] = mapped_column(Numeric, nullable=True)
    comprobante_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
