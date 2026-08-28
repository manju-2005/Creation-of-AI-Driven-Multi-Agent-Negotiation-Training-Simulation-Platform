import os
from dotenv import load_dotenv
from pydantic_settings import BaseSettings, SettingsConfigDict

load_dotenv(dotenv_path=".env")
load_dotenv(dotenv_path="backend/.env")

class Settings(BaseSettings):
    PROJECT_NAME: str = "AI Multi-Agent Negotiation Simulator"
    API_V1_STR: str = "/api"
    
    # MongoDB Config 
    MONGODB_URL: str = "mongodb://localhost:27017"
    DATABASE_NAME: str = "negotiation_db"
    
    # LLM Provider Configuration (Google Gemini)
    GEMINI_API_KEY: str = ""
    DEFAULT_MODEL: str = "gemini-3.5-flash"

    GEMINI_MIN_INTERVAL_SECONDS: float = 15.0

    def get_effective_gemini_key(self) -> str:
        key = self.GEMINI_API_KEY or os.getenv("GEMINI_API_KEY", "") or os.getenv("GOOGLE_API_KEY", "")
        return key.strip()

    # Secondary/fallback LLM Provider Configuration (Groq)
    GROQ_API_KEY: str = ""
    GROQ_MODEL: str = "llama-3.3-70b-versatile"

    def get_effective_groq_key(self) -> str:
        key = self.GROQ_API_KEY or os.getenv("GROQ_API_KEY", "")
        return key.strip()
    
    # System Constraints
    MAX_ROUND_LIMIT: int = 15
    MAX_VALIDATION_ATTEMPTS: int = 2
    DEADLOCK_THRESHOLD: float = 0.01  
    DEADLOCK_ROUNDS: int = 3
    MAX_CONTEXT_WINDOW: int = 4096

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

settings = Settings()
