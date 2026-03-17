# ---- Backend Dockerfile ----
# Runs the FastAPI / Uvicorn server on Railway.
# player_data/ is NOT baked in — upload it manually after first deploy.

FROM python:3.11-slim

WORKDIR /app

# Install system deps (PIL needs libgomp for some Pillow wheels)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies first (cache layer)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the backend source (but not player_data — it's gitignored)
COPY . .

# Railway injects $PORT; default to 8010 for local use
ENV PORT=8010

# DATA_PATH must be set to the persistent disk mount on Railway
# e.g. /data/player_data — set this in Railway env vars after mounting a disk
ENV DATA_PATH=/data/player_data

# CORS_ORIGINS — set this to your Vercel URL in Railway env vars
# e.g. https://your-app.vercel.app
ENV CORS_ORIGINS=http://localhost:5173

EXPOSE $PORT

CMD uvicorn backend.main:app --host 0.0.0.0 --port $PORT
