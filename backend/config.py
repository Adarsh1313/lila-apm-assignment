from __future__ import annotations

import os
from pathlib import Path


BACKEND_DIR = Path(__file__).resolve().parent
DEFAULT_DATA_PATH = BACKEND_DIR / "player_data"


def get_data_path() -> Path:
    raw_value = os.getenv("DATA_PATH")
    return Path(raw_value).resolve() if raw_value else DEFAULT_DATA_PATH.resolve()


def get_allowed_origins() -> list[str]:
    raw_value = os.getenv(
        "CORS_ORIGINS",
        "https://lila-apm-assignment.vercel.app,http://localhost:5173,http://127.0.0.1:5173,http://localhost:5174,http://127.0.0.1:5174",
    )
    return [origin.strip() for origin in raw_value.split(",") if origin.strip()]


def get_allowed_origin_regex() -> str | None:
    raw_value = os.getenv("CORS_ORIGIN_REGEX", r"^https://lila-apm-assignment.*\.vercel\.app$").strip()
    return raw_value or None
