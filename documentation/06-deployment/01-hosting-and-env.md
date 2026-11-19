# Deployment, Hosting, and Environment

## 1. Live endpoints (documentation date)

| Layer | URL |
|---|---|
| Frontend | https://govt-automation-estimator-water-res.vercel.app |
| Backend API | https://govt-automation-estimator-backend.onrender.com |
| Health check | https://govt-automation-estimator-backend.onrender.com/api/health |

## 2. Recommended topology

1. **Vercel** hosts the Vite-built React SPA.  
2. **Render** hosts the Express API as a web service.  
3. **Postgres** on Render (or compatible) stores cases durably.  
4. Optional: `vercel.json` rewrites `/api/*` to the Render origin so the browser can call same-origin `/api` if desired.  
5. Alternatively, set `VITE_API_URL` at build time to the absolute Render API base.

## 3. Environment variables (conceptual)

### Frontend

| Variable | Purpose |
|---|---|
| `VITE_API_URL` | Absolute API base when not using same-origin proxy |

See `frontend/.env.example` and `frontend/.env.production` (do not commit real secrets beyond public URLs).

### Backend

| Variable | Purpose |
|---|---|
| `PORT` | Listen port (Render provides) |
| `DATABASE_URL` / Postgres URL | Durable store |
| JWT / session secret | Auth signing |
| CORS origin | Allow Vercel frontend origin |

Exact names: follow `backend` env examples / Render dashboard (report writer should copy from ops notes, not invent).

## 4. Operational risks to mention in the report

| Risk | Mitigation observed / recommended |
|---|---|
| Free Postgres expiry | Re-provision DB; restore seed; prefer paid durable tier for pilots |
| Ephemeral disk on PaaS | Do not rely on local file DB alone in production |
| Cold starts on free Render | Health check before demos; expect first-request latency |
| Wrong API URL in frontend build | Verify `VITE_API_URL` / proxy after each deploy |

## 5. Deploy references in repo

- `docs/VERCEL_DEPLOY.md`  
- Root / `vercel.json`  
- Backend Render service configuration (dashboard)

## 6. Verification after deploy

1. Open frontend URL → login page loads.  
2. `GET /api/health` returns OK.  
3. Sign in with demo admin.  
4. Open `CASE-193-EKNATH-DEMO` and confirm screens 1–6 still populated.  
5. Confirm present / depreciated totals if recalculated with pinned tables.
