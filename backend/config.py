"""
Configuration settings for JobBless backend.
"""

import os
from pathlib import Path
from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # Application
    APP_NAME: str = "JobBless"
    ENVIRONMENT: str = "development"
    PORT: int = 8000
    LOG_LEVEL: str = "INFO"

    # Google Cloud
    GOOGLE_CLOUD_PROJECT: str = ""
    GOOGLE_APPLICATION_CREDENTIALS: str = ""
    GOOGLE_API_KEY: Optional[str] = None

    # Gemini Models (override any of these via .env or environment)
    # Live/voice: must use a model that supports BOTH bidiGenerateContent AND generateContent (for tools).
    # Native-audio models only support bidiGenerateContent (no tools) → 1008 error.
    # gemini-2.0-flash-exp-image-generation is the only model supporting both.
    GEMINI_LIVE_MODEL: str = "gemini-2.0-flash-exp-image-generation"
    GEMINI_EVAL_MODEL: str = "gemini-2.5-flash"  # used for evaluation/feedback
    GEMINI_RESUME_MODEL: str = "gemini-2.5-flash"  # used for resume analysis

    # Firebase
    FIREBASE_CREDENTIALS: str = ""
    FIREBASE_STORAGE_BUCKET: str = ""

    # CORS
    CORS_ORIGINS: list[str] = [
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        "http://127.0.0.1:3000",
    ]

    # Interview Settings
    DEFAULT_QUESTION_COUNT: int = 5
    MAX_QUESTION_COUNT: int = 10
    EVALUATION_TIMEOUT: int = 120  # seconds

    # Agent Settings
    AGENT_MAX_RETRIES: int = 2
    AGENT_TIMEOUT: int = 60

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()


def validate_settings():
    """Validate required settings are present."""
    required = ["GOOGLE_CLOUD_PROJECT"]
    missing = [f for f in required if not getattr(settings, f)]
    if missing:
        raise ValueError(f"Missing required env vars: {', '.join(missing)}")


def get_settings() -> Settings:
    return settings
