
# LILA Player Journey Visualization Tool

A web-based telemetry visualization tool built for the **LILA Games Associate Product Manager assignment**. The tool allows level designers to visually explore how players navigate maps, where combat occurs, and how gameplay events unfold over time using production telemetry data.

Live Demo:
https://lila-apm-assignment-vw6f.vercel.app/

---

# Features

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

---

# Tech Stack

## Frontend
- React
- Vite
- Plotly.js
- TypeScript

## Backend
- FastAPI
- Python
- Pandas
- PyArrow

## Deployment
- Frontend: Vercel
- Backend: Railway
---

# Project Structure

lila-apm-assignment
│
├── backend
│   ├── main.py
│   ├── data_processing
│   └── requirements.txt
│
├── src
│   ├── components
│   ├── pages
│   └── visualizations
│
├── public
│   └── minimaps
│
├── ARCHITECTURE.md
├── INSIGHTS.md
└── README.md
---

# Running the Project Locally

## 1. Clone the Repository

git clone https://github.com/Adarsh1313/lila-apm-assignment.git
cd lila-apm-assignment

---

# Backend Setup

Create Python virtual environment:

python -m venv backend/.venv

Activate:

Mac/Linux
source backend/.venv/bin/activate

Windows
backend\.venv\Scripts\activate

Install dependencies:

pip install -r backend/requirements.txt

Run backend server:

uvicorn backend.main:app --host 127.0.0.1 --port 8010

Backend runs at:
http://127.0.0.1:8010

---

# Frontend Setup

Install dependencies:

npm install

Run development server:

npm run dev

Frontend runs at:
http://127.0.0.1:5174
---

# Environment Variables
Example `.env` file:
VITE_API_BASE_URL=http://127.0.0.1:8010

---

# Data Setup

Telemetry data should be placed in:
backend/player_data

Expected structure:
player_data
 ├── February_10
 ├── February_11
 ├── February_12
 ├── February_13
 ├── February_14
 └── minimaps

Each folder contains match telemetry files in **parquet format**.

---

# Future Improvements
- Player route clustering
- Loot interaction heatmaps
- Squad behavior analysis
- Real-time telemetry ingestion
- Match comparison dashboards

---

# Author
Adarsh Bharathwaj
