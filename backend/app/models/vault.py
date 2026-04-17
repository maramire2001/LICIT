import uuid
from datetime import datetime, date
from sqlalchemy import String, DateTime, JSON, Text, Boolean, Date
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base

class VaultDocumento(Base):
    __tablename__ = "vault_documentos"
    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    company_id: Mapped[uuid.UUID] = mapped_column()
    tipo: Mapped[str] = mapped_column(String(30))
    archivo_url: Mapped[str] = mapped_column(Text)
    fecha_vigencia: Mapped[date | None] = mapped_column(Date, nullable=True)
    datos_extraidos: Mapped[dict] = mapped_column(JSON, default=dict)
    vigente: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
