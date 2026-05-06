# LILA Player Journey Visualization Tool

A telemetry visualization platform built for the LILA Games Associate Product Manager assignment. It helps level designers inspect player movement, combat density, loot concentration, death patterns, and behavior trends across multiple maps using production telemetry.

## Current Deployment

- Newer project: [https://lila-apm-assignment.vercel.app/](https://lila-apm-assignment.vercel.app/)

## What The Current Preview Includes

- A unified density heatmap that merges the currently selected event families into one readable surface
- Heatmap source toggles for `Loot`, `Kills`, and `Position`
- Position filtering for `Human Position` and `Bot Position`
- Server-side position downsampling so movement heatmaps stay performant and comparable to loot and kill data
- A cool-toned density gradient with a `Low` to `High` legend, reduced kernel radius, and transparency-preserving hotspot normalization
- Skull-based death markers for normal deaths and storm deaths
- Hover tooltips anchored above death markers for clearer zoomed inspection
- Resizable map filter rail for long labels and controls
- Telemetry pie charts with high-contrast tooltips, larger donut sizing, and inline right-side legends with percentages
- A full-width `Event Distribution` chart that fills its panel cleanly without orphaned labels
- Match replay and player profile views for deeper behavior review

## Core Use Cases

- Compare traversal pressure against loot placement
- Inspect combat hotspots against movement density
- Separate bot behavior from human behavior
- Spot neglected areas of the map by combining multiple event families into one density read
- Review event distributions and match flow at a telemetry-dashboard level

## Tech Stack

### Frontend

- React
- Vite
- TypeScript
- Recharts

### Backend

- FastAPI
- Python
- Pandas
- PyArrow
- Plotly

### Deployment

- Frontend: Vercel
- Backend: Railway currently, with Northflank migration prepared

## Local Development

### 1. Clone The Repository

```bash
git clone https://github.com/Adarsh1313/lila-apm-assignment.git
cd lila-apm-assignment
```

### 2. Install Frontend Dependencies

```bash
npm install
```

### 3. Create And Install The Backend Environment

Windows:

```bash
python -m venv backend/.venv
backend\.venv\Scripts\pip install -r backend/requirements.txt
```

macOS/Linux:

```bash
python -m venv backend/.venv
backend/.venv/bin/pip install -r backend/requirements.txt
```

### 4. Run The Backend

```bash
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8010
```

Backend runs at [http://127.0.0.1:8010](http://127.0.0.1:8010)

### 5. Run The Frontend

```bash
npm run dev -- --host 127.0.0.1 --port 5174
```

Frontend runs at [http://127.0.0.1:5174](http://127.0.0.1:5174)

## Environment Variables

Frontend:

```bash
VITE_API_BASE_URL=http://127.0.0.1:8010
```

Backend:

```bash
DATA_PATH=/path/to/player_data
CORS_ORIGINS=http://127.0.0.1:5174,https://lila-apm-assignment.vercel.app
CORS_ORIGIN_REGEX=^https://lila-apm-assignment.*\.vercel\.app$
```

If you want the same backend to serve both production and preview frontends, keep every allowed Vercel origin in `CORS_ORIGINS` as a comma-separated list, or use `CORS_ORIGIN_REGEX` for Vercel preview URLs.

See [NORTHFLANK_DEPLOYMENT.md](./NORTHFLANK_DEPLOYMENT.md) for the planned Northflank backend deployment checklist.

## Project Structure

```text
lila-apm-assignment/
|-- backend/
|   |-- config.py
|   |-- data_loader.py
|   |-- data_processor.py
|   |-- main.py
|   |-- models.py
|   |-- requirements.txt
|   |-- store.py
|   |-- utils.py
|   `-- visualizations.py
|-- context/
|   |-- Lila APM Written Test.pdf
|   `-- README.md
|-- guidelines/
|   `-- Guidelines.md
|-- src/
|   |-- app/
|   |   |-- components/
|   |   |-- context/
|   |   |-- lib/
|   |   |-- pages/
|   |   |-- App.tsx
|   |   `-- routes.tsx
|   |-- styles/
|   `-- main.tsx
|-- .env.example
|-- index.html
|-- package.json
|-- README.md
|-- vercel.json
`-- vite.config.ts
```
