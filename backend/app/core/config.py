from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str
    redis_url: str
    supabase_url: str
    supabase_service_key: str
    supabase_jwt_secret: str
    anthropic_api_key: str
    aws_access_key_id: str = ""
    aws_secret_access_key: str = ""
    aws_region: str = "us-east-1"
    compranet_api_base: str = "https://api.datos.gob.mx/v2/contratacionesabiertas"
    notif_emails: str = ""
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_pass: str = ""
    allowed_origins: str = "http://localhost:3000"
    admin_email: str = ""
    bank_clabe: str = ""
    bank_nombre: str = ""
    bank_titular: str = ""

    @property
    def async_database_url(self) -> str:
        url = self.database_url
        if url.startswith("postgresql://"):
            url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
        elif url.startswith("postgres://"):
            url = url.replace("postgres://", "postgresql+asyncpg://", 1)
        return url

    class Config:
        env_file = ".env"


settings = Settings()
