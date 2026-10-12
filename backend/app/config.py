import os
from pathlib import Path
from dotenv import load_dotenv

# Search for .env in backend/ or project root
base_dir = Path(__file__).resolve().parent.parent
root_dir = base_dir.parent

env_paths = [root_dir / ".env", base_dir / ".env"]
for env_file in env_paths:
    if env_file.exists():
        load_dotenv(dotenv_path=env_file, override=True)
        if os.getenv("MONGODB_URI") and "paste_your_connection_string_here" not in os.getenv("MONGODB_URI"):
            break


class Config:
    """Application configuration loaded from environment variables."""
    MONGODB_URI = os.getenv("MONGODB_URI", "")
    MONGODB_DB_NAME = os.getenv("MONGODB_DB_NAME", "user_analytics")
    FLASK_ENV = os.getenv("FLASK_ENV", "development")
    FLASK_PORT = int(os.getenv("FLASK_PORT", 5000))
    FLASK_DEBUG = os.getenv("FLASK_DEBUG", "True").lower() in ("true", "1", "yes")
