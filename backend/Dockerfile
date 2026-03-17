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

# Railway injects $PORT; default to 8010 for local use
ENV PORT=8010

# DATA_PATH must point to the Railway persistent disk mount
# Set this in Railway → Variables after adding a disk at /data
ENV DATA_PATH=/data/player_data

# CORS_ORIGINS — set this in Railway → Variables to your Vercel URL
ENV CORS_ORIGINS=http://localhost:5173

EXPOSE $PORT

CMD ["sh", "-c", "uvicorn backend.main:app --host 0.0.0.0 --port ${PORT:-8010}"]
