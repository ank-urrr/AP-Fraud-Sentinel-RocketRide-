"""
Application configuration via environment variables.
Never commit real secrets — use .env.example as the template.
"""
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import field_validator
from typing import Literal, List


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # App
    APP_NAME: str = "AP Payment Fraud Sentinel"
    APP_ENV: str = "development"
    DEBUG: bool = True

    # Database
    DATABASE_URL: str = "sqlite:///./sentinel.db"

    # RocketRide
    ROCKETRIDE_URI: str = "ws://localhost:8765"
    ROCKETRIDE_APIKEY: str = "mock-key"

    # Calling
    CALLING_MODE: Literal["mock", "live"] = "mock"
    BLAND_API_KEY: str = ""

    # Fraud thresholds
    HOLD_THRESHOLD_SCORE: int = 60        # ≥60 → HELD
    AI_ANALYSIS_THRESHOLD_SCORE: int = 30 # ≥30 → send to AI agent

    # CORS
    CORS_ORIGINS: List[str] = ["http://localhost:5173", "http://localhost:3000"]


settings = Settings()
