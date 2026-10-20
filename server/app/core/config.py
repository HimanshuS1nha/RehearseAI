from pydantic import SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    jwt_secret: SecretStr
    database_url: SecretStr
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 15
    refresh_token_expire_days: int = 7
    cookie_secure: bool = True
    frontend_url: str = "http://localhost:3000"
    google_api_key: SecretStr
    gemini_model: str = "gemini-3.5-flash"
    smtp_host: str = "smtp.gmail.com"
    smtp_port: int = 587
    smtp_username: str
    smtp_password: SecretStr
    email_from_name: str = "Rehearse"
    otp_expire_minutes: int = 10
    otp_max_attempts: int = 5
    otp_resend_cooldown_seconds: int = 60
    stripe_secret_key: SecretStr
    stripe_webhook_secret: SecretStr


settings = Settings()
