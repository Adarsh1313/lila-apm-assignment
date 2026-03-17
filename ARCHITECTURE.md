
# Architecture Overview

This project is a web-based telemetry visualization tool that converts raw gameplay telemetry into interactive map visualizations. The goal is to allow **Level Designers to visually explore player behavior** such as movement paths, combat hotspots, and event locations directly on the game minimap.

---

# Tech Stack Choices

| Component | Technology | Why It Was Chosen |
|----------|------------|------------------|
| Frontend | React + Vite | Fast development, responsive UI, and good support for interactive data visualization |
| Visualization | Plotly | Provides built-in support for scatter plots, heatmaps, and timeline updates which fit telemetry visualization well |
| Backend | FastAPI | Lightweight Python API framework with strong performance and simple integration with data processing libraries |
| Data Processing | Pandas + PyArrow | Efficient handling of large parquet telemetry datasets |
| Deployment | Vercel (frontend) + Railway (backend) | Quick deployment with minimal configuration and easy sharing through a public URL |

This stack allowed for rapid development while maintaining clear separation between data processing and visualization.

---

# Data Flow

The system follows a simple pipeline from raw telemetry to visual insights.

Parquet Telemetry Files
1. The backend loads telemetry data stored in parquet format.
2. Pandas processes the data and extracts relevant gameplay events
3. FastAPI Backend (parsing + event extraction)  
4. Processed JSON API responses  
5. React Frontend  
6. Plotly visualizations rendered on minimap

---

# Mapping Game Coordinates to the Minimap

Telemetry events store positions using world coordinates, while the minimap uses pixel coordinates (took reference from the README.md file)

Step 1 — Identify Map Bounds
Step 2 — Normalize Coordinates
Step 3 — Convert to Pixel Coordinates

The y-axis is inverted because image coordinate systems originate at the top-left corner, whereas world coordinates typically originate at the bottom-left. This transformation ensures player paths align accurately with the minimap image.

---

# Assumptions Made

| Assumption | Reason |
|-----------|-------|
| High traffic areas inferred from loot interactions and kill events | The dataset did not contain a direct "traffic" or player density metric. Loot pickups and kill events were used as proxies for areas where players frequently converge. |
| Dataset represents a subset of full match telemetry | The number of matches and player counts suggested that the data was likely sampled or truncated. In a live production environment with bots and humans, we would expect more matches or higher player counts across five days. |
| A player whose last recorded event is a position update survived/extracted | The telemetry did not explicitly include an “extraction” event. If a player’s final event was a position update and no death event occurred afterward, it was assumed the player survived and extracted successfully. |

These assumptions were validated by visually inspecting player paths, event distributions, and match timelines to ensure the resulting visualizations aligned with gameplay patterns after analyzing the Lila BLACK: Weekly Mon CEO DEV TEST (https://www.youtube.com/watch?v=KayjnN13VDg).

---

# Major Tradeoffs

| Decision | Considered Alternative | Why This Approach |
|--------|----------------------|------------------|
| Pandas for telemetry processing | DuckDB | Pandas was simpler to integrate with the Python backend and easier for quick data transformations. DuckDB could be more efficient for very large datasets but added extra setup complexity. |
| React frontend | Streamlit / simple HTML dashboard | React provides more flexibility for building interactive UI elements like filters, timeline playback, and overlays. Streamlit would have been faster to prototype but less customizable for UI interactions. |
| FastAPI backend with API endpoints | Static data files loaded directly in frontend | Using API endpoints keeps the frontend lightweight and allows the backend to handle heavy data processing and coordinate transformations. |
| Plotly for visualization | Custom WebGL renderer or Map libraries | Plotly enabled fast development of interactive visualizations like paths and heatmaps without building a custom rendering system. |

---

# What I Would Improve With More Time
- Understand the randomization of the spawn points and increase spawn in low traffic areas
- Path clustering to detect common player routes
- Implement DuckDB instead of Pandas for data ingestion
- Match comparison tools
- Caching layer to improve performance when loading large matches
