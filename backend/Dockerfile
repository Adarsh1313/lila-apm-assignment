# ---- Backend Dockerfile ----
# Build context is the REPO ROOT (set by railway.json dockerfilePath).
# All COPY paths are relative to the repo root.

FROM python:3.11-slim

WORKDIR /app

# Install system deps (Pillow needs libgomp on some wheels)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies first (cache layer)
COPY backend/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend source only (player_data excluded via .dockerignore)
COPY backend/ ./backend/

# DATA_PATH — points to where player_data was copied in this image.
# Override in your host's runtime variables if using external storage instead.
ENV DATA_PATH=/app/backend/player_data

# CORS_ORIGINS can be overridden in runtime variables if needed.
ENV CORS_ORIGINS=https://lila-apm-assignment.vercel.app,http://localhost:5173,http://127.0.0.1:5173,http://localhost:5174,http://127.0.0.1:5174
ENV CORS_ORIGIN_REGEX=^https://lila-apm-assignment.*\\.vercel\\.app$

EXPOSE 8010

CMD ["sh", "-c", "python -m uvicorn backend.main:app --host 0.0.0.0 --port ${PORT:-8010}"]
