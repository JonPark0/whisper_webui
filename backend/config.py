from pydantic_settings import BaseSettings
from pathlib import Path


class Settings(BaseSettings):
    """Application settings loaded from environment variables"""

    # API Configuration
    gemini_api_key: str

    # Whisper Configuration
    whisper_model: str = "openai/whisper-large-v3-turbo"

    # Server Configuration
    backend_port: int = 8000
    backend_host: str = "0.0.0.0"

    # File Configuration
    max_file_size: str = "500MB"
    upload_dir: Path = Path("/app/uploads")
    output_dir: Path = Path("/app/outputs")

    # Processing Configuration
    default_timeout: int = 3600
    enable_flash_attention: bool = False

    # Database Configuration
    db_path: Path = Path("/app/data/whisper.db")

    class Config:
        env_file = ".env"
        case_sensitive = False

    @property
    def max_file_size_bytes(self) -> int:
        """Convert max_file_size string to bytes"""
        size = self.max_file_size.upper()
        if size.endswith('GB'):
            return int(size[:-2]) * 1024 * 1024 * 1024
        elif size.endswith('MB'):
            return int(size[:-2]) * 1024 * 1024
        elif size.endswith('KB'):
            return int(size[:-2]) * 1024
        else:
            return int(size)


settings = Settings()

# Ensure directories exist
settings.upload_dir.mkdir(parents=True, exist_ok=True)
settings.output_dir.mkdir(parents=True, exist_ok=True)
settings.db_path.parent.mkdir(parents=True, exist_ok=True)
