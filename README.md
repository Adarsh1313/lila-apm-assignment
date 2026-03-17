# LILA BLACK APM Assignment

Frontend and backend for the LILA BLACK telemetry and player journey visualization tool.

## Project Structure

- `src/`
  - React + Vite frontend
- `backend/`
  - FastAPI backend
- `context/`
  - Project context and reference material
- `guidelines/`
  - Project guidelines

## Frontend

Install dependencies:

```bash
npm install
```

Run the dev server:

```bash
npm run dev -- --host 127.0.0.1 --port 5174
```

The frontend expects the backend at `http://127.0.0.1:8010` by default. Override with `VITE_API_BASE_URL` if needed.

## Backend

Create a virtual environment and install dependencies:

```bash
python -m venv backend/.venv
backend/.venv/Scripts/pip install -r backend/requirements.txt
```

Run the API:

```bash
backend/.venv/Scripts/python -m uvicorn backend.main:app --host 127.0.0.1 --port 8010
```

## Backend Data

The backend reads telemetry data from `DATA_PATH`.

- Default: `backend/player_data`
- Required contents:
  - day folders such as `February_10` through `February_14`
  - `minimaps/` with the three map images

Example:

```bash
set DATA_PATH=D:\path\to\player_data
```

## Notes

- Build output, virtual environments, logs, and local datasets are intentionally gitignored.
- Plotly figures are served as JSON from FastAPI for frontend rendering.
