# Northflank Backend Deployment

Use this checklist to deploy the FastAPI backend on Northflank Sandbox while keeping the frontend on Vercel.

## Service

- Service type: Combined service
- Repository: `Adarsh1313/lila-apm-assignment`
- Branch: your production branch
- Build type: Dockerfile
- Dockerfile path: `/backend/Dockerfile`
- Build context: `/`
- Port: `8010`
- Public networking: enabled for port `8010`

The Dockerfile already runs Uvicorn on `0.0.0.0` and uses `${PORT:-8010}`, so it will work whether Northflank injects a `PORT` variable or uses the exposed port.

## Runtime Variables

Set these on the Northflank service:

```text
DATA_PATH=/app/backend/player_data
CORS_ORIGINS=https://lila-apm-assignment.vercel.app,http://localhost:5173,http://127.0.0.1:5173,http://localhost:5174,http://127.0.0.1:5174
CORS_ORIGIN_REGEX=^https://lila-apm-assignment.*\.vercel\.app$
```

If your live Vercel URL is different, add it to `CORS_ORIGINS`. Keep the regex if you use Vercel preview deployments for the same project.

## Health Check

Add an HTTP health check:

- Type: readiness probe or liveness probe
- Protocol: HTTP
- Port: `8010`
- Path: `/healthz`
- Initial delay: `30` seconds
- Timeout: `5` seconds

`/healthz` may return `degraded` if `player_data` is missing, but it still returns HTTP 200. For this project, confirm the response detail says the data store is loaded after deployment.

## Vercel Update

After Northflank gives you the public backend URL, update the frontend environment variable in Vercel:

```text
VITE_API_BASE_URL=https://your-backend-service.your-region.northflank.app
```

Then redeploy the Vercel frontend so the new API URL is baked into the Vite build.

## Smoke Test

After both deploys finish, check:

```text
https://your-backend-service.your-region.northflank.app/healthz
https://your-backend-service.your-region.northflank.app/minimaps/AmbroseValley_Minimap.png
```

Then open the Vercel site and verify the overview, map heatmap, match replay, and player profile pages all load without API errors.
