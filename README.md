# LILA Player Journey Visualization Tool

A web-based telemetry visualization platform built for the LILA Games Associate Product Manager assignment. The project helps level designers and product stakeholders inspect player movement, combat density, loot activity, match flow, and player behavior patterns across multiple maps using production telemetry data.

## Live Demo

[https://lila-apm-assignment.vercel.app/](https://lila-apm-assignment.vercel.app/)

## Features

### Player Journey Visualization

### Human vs Bot Distinction

### Event Markers

The tool displays gameplay events including:

- Kills
- Deaths
- Loot interactions
- Storm deaths

### Timeline Playback

### Heatmaps

Heatmap overlays highlight:

- High loot areas
- Combat hotspots
- Death clusters

### Filtering

Matches can be filtered by:

- Map
- Date
- Match ID

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
- Backend: Railway

## Project Structure

```text
lila-apm-assignment/
├── backend/
│   ├── config.py
│   ├── data_loader.py
│   ├── data_processor.py
│   ├── main.py
│   ├── models.py
│   ├── requirements.txt
│   ├── store.py
│   ├── utils.py
│   └── visualizations.py
├── context/
│   ├── Lila APM Written Test.pdf
│   └── README.md
├── guidelines/
│   └── Guidelines.md
├── src/
│   ├── app/
│   │   ├── components/
│   │   ├── context/
│   │   ├── lib/
│   │   ├── pages/
│   │   ├── App.tsx
│   │   └── routes.tsx
│   ├── styles/
│   └── main.tsx
├── .env.example
├── .gitignore
├── index.html
├── package.json
├── README.md
├── vercel.json
└── vite.config.ts
```

## Running the Project Locally

### 1. Clone the Repository

```bash
git clone https://github.com/Adarsh1313/lila-apm-assignment.git
cd lila-apm-assignment
```

### 2. Install Frontend Dependencies

```bash
npm install
```

### 3. Create the Backend Virtual Environment

```bash
python -m venv backend/.venv
```

### 4. Install Backend Dependencies

Windows:

```bash
backend\.venv\Scripts\pip install -r backend/requirements.txt
```

macOS/Linux:

```bash
backend/.venv/bin/pip install -r backend/requirements.txt
```

## Backend Setup

Create Python virtual environment:

```bash
python -m venv backend/.venv
```

Activate:

macOS/Linux:

```bash
source backend/.venv/bin/activate
```

Windows:

```bash
backend\.venv\Scripts\activate
```

Install dependencies:

```bash
pip install -r backend/requirements.txt
```

Run backend server:

```bash
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8010
```

Backend runs at:

[http://127.0.0.1:8010](http://127.0.0.1:8010)

## Frontend Setup

Install dependencies:

```bash
npm install
```

Run development server:

```bash
npm run dev -- --host 127.0.0.1 --port 5174
```

Frontend runs at:

[http://127.0.0.1:5174](http://127.0.0.1:5174)

## Environment Variables

Example `.env` file:

```bash
VITE_API_BASE_URL=http://127.0.0.1:8010
```

For backend deployment, the following variables are also relevant:

```bash
DATA_PATH=/path/to/player_data
CORS_ORIGINS=https://your-frontend-domain.vercel.app
```

## Data Setup

Telemetry data should be placed in:

```text
backend/player_data
```

Expected structure:

```text
player_data/
├── February_10/
├── February_11/
├── February_12/
├── February_13/
├── February_14/
└── minimaps/
```

Each day folder contains match telemetry files in parquet format using the `.nakama-0` suffix. The `minimaps/` folder must contain the three map images required by the backend and frontend.

## Deployment Notes

### Railway

Recommended backend deploy settings:

- Install command: `pip install -r backend/requirements.txt`
- Start command: `python -m uvicorn backend.main:app --host 0.0.0.0 --port $PORT`

### Vercel

Recommended frontend deploy settings:

- Framework preset: `Vite`
- Build command: `npm run build`
- Output directory: `dist`

Set:

```bash
VITE_API_BASE_URL=https://your-backend-url.up.railway.app
```

## Future Improvements

- Player route clustering
- Loot interaction heatmaps
- Squad behavior analysis
- Real-time telemetry ingestion
- Match comparison dashboards

## Author

Adarsh Bharathwaj
