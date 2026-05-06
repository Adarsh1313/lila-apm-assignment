# LILA BLACK Handoff

## Project
LILA BLACK Player Journey Visualization Tool

## Current Workspace
`D:\Downloads\LILA BLACK Web Application`

## Architecture
- Frontend: React + Vite
- Backend: FastAPI
- Frontend deployed on Vercel
- Backend currently deployed on Railway, with Northflank migration prepared
- Backend data served from processed telemetry files and minimap assets

## Live Deployment
- Frontend production:
  - <https://lila-apm-assignment.vercel.app>
- Backend production:
  - <https://lila-apm-assignment-production.up.railway.app>
- Planned Northflank backend:
  - Set after creating the Northflank service from `NORTHFLANK_DEPLOYMENT.md`

## Deployment Environment Variables

### Frontend on Vercel
```text
VITE_API_BASE_URL=https://lila-apm-assignment-production.up.railway.app
```

### Backend Runtime
```text
CORS_ORIGINS=https://lila-apm-assignment.vercel.app
CORS_ORIGIN_REGEX=^https://lila-apm-assignment.*\.vercel\.app$
```

## Backend Health
- Health endpoint:
  - <https://lila-apm-assignment-production.up.railway.app/healthz>
- Expected response:
```json
{"status":"ok","rows":88161,"matches":796}
```

## Important Backend Details
- `df_clean` is loaded once at startup.
- `/minimaps/...` is mounted from the backend data path.
- Backend supports both a stable CORS origin and a preview URL regex.
- Relevant backend files:
  - `backend/main.py`
  - `backend/config.py`
  - `backend/visualizations.py`
  - `backend/Dockerfile`

## Frontend Data Wiring
- Frontend data access lives in `src/app/lib/data.ts`.
- The current default API fallback in code is local development. Production should set `VITE_API_BASE_URL` in Vercel.
- Minimap image URLs are backend-served via `/minimaps/...`.

## Recent UI and Behavior Work
- Landing page restored and logo click returns to landing page.
- Branding updated toward the LILA BLACK visual identity.
- Reusable map pages implemented.
- Stats sidebar fixed for overflow.
- Average duration fixed from backend seconds.
- Map filters and match filters wired.

### Player Profiles
- Minimap switches correctly by selected match map.
- Legend enlarged and cleaned up.
- Path arrows reduced.
- All paths kept bright.
- No-data state added.
- Match duration shown in sidebar rows.
- Survived/died logic corrected.

### Match Replay
- Limited to richer matches with 10+ tracked players.

### Telemetry
- Spawn Zones tab removed from the frontend telemetry page.

### Loot Heatmap
- Adjusted to reduce clutter while keeping heatmap style.
- Heatmap opacity control applies to the heatmap layer, not the map layer.

## Known Important Code Review Findings
1. Time normalization is handled in more than one place and should eventually be centralized.
2. `MapAnalysisPage.tsx` is carrying too much fetch and render logic.
3. Heatmap rendering logic is partly duplicated client-side instead of being fully centralized in backend visualization logic.
4. Repo structure works, but could still use a cleanup and restructure pass for long-term maintainability.

## Git and Repo Status
- GitHub repo:
  - <https://github.com/Adarsh1313/lila-apm-assignment>
- A previous local commit existed:
  - `9a9c4e5a0c1a8ca141b3a7bd0a470c0287b4a0f2`
- Later deployment-related and CORS-related changes were made after that point.
- The most recent visible branch state previously showed `master` tracking `origin/master`.

## Starter Prompt for the New Workspace
```text
Continue the LILA BLACK project from the previous workspace.

Current production:
Frontend: https://lila-apm-assignment.vercel.app
Backend: https://lila-apm-assignment-production.up.railway.app
Planned backend migration: Northflank, using NORTHFLANK_DEPLOYMENT.md

Important env vars:
Vercel: VITE_API_BASE_URL=https://lila-apm-assignment-production.up.railway.app
Railway: CORS_ORIGINS=https://lila-apm-assignment.vercel.app
Railway: CORS_ORIGIN_REGEX=^https://lila-apm-assignment.*\\.vercel\\.app$
Northflank: use the same backend runtime variables once the service is created

Please first audit the current repo state, compare it to the deployment-critical changes, and continue from there.
```
