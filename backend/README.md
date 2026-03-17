# LILA BLACK Backend

FastAPI backend for the LILA BLACK telemetry visualization tool.

## Environment

- `DATA_PATH`
  - Optional
  - Defaults to `backend/player_data`
  - Should point at a folder containing:
    - `February_10` to `February_14`
    - `minimaps/`
- `CORS_ORIGINS`
  - Optional comma-separated allowlist
  - Defaults to local Vite development origins

## Run

```bash
pip install -r backend/requirements.txt
uvicorn backend.main:app --reload
```

## Notes

- The parquet source files use the `.nakama-0` suffix but are read as parquet.
- Data is loaded once at startup via FastAPI lifespan.
- Plotly figures are returned as JSON payloads for frontend rendering.
- Local datasets, logs, and virtual environments are not intended to be committed to Git.
