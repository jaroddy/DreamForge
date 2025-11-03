from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    # API Keys
    MESHY_API_KEY: str = ""
    SLANT3D_API_KEY: str = ""
    STRIPE_SECRET_KEY: str = ""
    STRIPE_PUBLISHABLE_KEY: str = ""
    
    # Application
    FRONTEND_URL: str = "http://localhost:3000"
    BACKEND_PORT: int = 8000
    
    # Rate Limiting
    RATE_LIMIT_PER_MINUTE: int = 100
    RATE_LIMIT_WINDOW_MINUTES: int = 15
    SESSION_TIMEOUT_MINUTES: int = 30
    
    # Database
    DATABASE_URL: str = "sqlite+aiosqlite:///./dreamforge.db"
    
    # Meshy API
    MESHY_API_BASE_URL: str = "https://api.meshy.ai/openapi/v2"
    
    # SLANT3D API
    SLANT3D_API_BASE_URL: str = "https://www.slant3dapi.com/api"
    
    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
