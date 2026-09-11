from pydantic_settings import BaseSettings
from typing import List

class Settings(BaseSettings):
    PORT: int = 10000
    HOST: str = "0.0.0.0"
    JWT_SECRET: str = "your_super_secret_jwt_key_change_in_production"
    ALLOWED_ORIGINS: str = "http://localhost:3000,https://sovereign-amm.vercel.app"
    DATABASE_PATH: str = "app/db/sovereign.db"
    LOG_LEVEL: str = "INFO"

    @property
    def allowed_origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",") if origin.strip()]

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"

settings = Settings()
