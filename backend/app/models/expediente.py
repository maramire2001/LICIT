import uuid
from datetime import datetime
from sqlalchemy import DateTime, JSON, Text, Integer
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base

class Expediente(Base):
    __tablename__ = "expedientes"
    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    analisis_id: Mapped[uuid.UUID] = mapped_column()
    company_id: Mapped[uuid.UUID] = mapped_column()
    carpeta_admin: Mapped[dict] = mapped_column(JSON, default=dict)
    propuesta_tecnica_draft: Mapped[str | None] = mapped_column(Text, nullable=True)
    propuesta_economica: Mapped[dict] = mapped_column(JSON, default=dict)
    checklist: Mapped[dict] = mapped_column(JSON, default=dict)
    faltantes: Mapped[dict] = mapped_column(JSON, default=dict)
    version: Mapped[int] = mapped_column(Integer, default=1)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
