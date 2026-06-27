"""
Configuration management for the GTM Lead Discovery Backend.
Loads environment variables and provides typed access to all config values.
"""

import os
from pydantic_settings import BaseSettings
from dotenv import load_dotenv

load_dotenv()


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # API Keys
    GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")
    SERPAPI_KEY: str = os.getenv("SERPAPI_KEY", "")
    GOOGLE_MAPS_API_KEY: str = os.getenv("GOOGLE_MAPS_API_KEY", "")
    APOLLO_API_KEY: str = os.getenv("APOLLO_API_KEY", "")
    MONGODB_URI: str = os.getenv("MONGODB_URI", "")
    LINKEDIN_CLIENT_ID: str = os.getenv("LINKEDIN_CLIENT_ID", "YOUR_CLIENT_ID")
    LINKEDIN_CLIENT_SECRET: str = os.getenv("LINKEDIN_CLIENT_SECRET", "YOUR_CLIENT_SECRET")
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:5173")
    HF_TOKEN: str = os.getenv("HF_TOKEN", "")
    
    # Server Config
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", "8000"))
    DEBUG: bool = os.getenv("DEBUG", "true").lower() == "true"

    # Auth Config
    JWT_SECRET_KEY: str = os.getenv("JWT_SECRET_KEY", "gtm_super_secret_key_for_local_dev_12345")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "15"))
    REFRESH_TOKEN_EXPIRE_DAYS: int = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "7"))
    RESET_TOKEN_EXPIRE_HOURS: int = int(os.getenv("RESET_TOKEN_EXPIRE_HOURS", "1"))
    GOOGLE_CLIENT_ID: str = os.getenv("GOOGLE_CLIENT_ID", "")
    GOOGLE_CLIENT_SECRET: str = os.getenv("GOOGLE_CLIENT_SECRET", "")

    # Scraping Config
    MAX_CONCURRENT_REQUESTS: int = 10
    REQUEST_TIMEOUT: int = 15
    MAX_RETRIES: int = 3
    SCRAPE_DELAY_MIN: float = 0.5
    SCRAPE_DELAY_MAX: float = 2.0

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
