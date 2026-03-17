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
# Override in Railway Variables if using an external volume instead.
ENV DATA_PATH=/app/backend/player_data

# CORS_ORIGINS — set this in Railway → Variables to your Vercel URL
ENV CORS_ORIGINS=http://localhost:5173

EXPOSE 8010

CMD ["python", "-m", "uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8010"]
