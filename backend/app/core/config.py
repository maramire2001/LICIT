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

    class Config:
        env_file = ".env"


settings = Settings()
