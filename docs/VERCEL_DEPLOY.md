# Vercel deploy (frontend) + Render API

## Architecture

| Layer | Host | URL |
|---|---|---|
| SPA | Vercel | `https://govt-automation-estimator-water-res.vercel.app` |
| API + `db.json` | Render web service | `https://govt-automation-estimator-backend.onrender.com` |

The frontend production build sets `VITE_API_URL` to the Render API (`frontend/.env.production`).  
Root `vercel.json` also **proxies** `/api/*` to Render so same-origin calls never hit an ephemeral Vercel serverless DB.

## Project settings (required)

In Vercel → Project → Settings → General:

| Setting | Value |
|---|---|
| **Root Directory** | *empty* (repository root). Do **not** set `frontend`. |
| Framework Preset | Other / Vite is fine |
| Build / Output / Install | leave empty (uses `vercel.json`) |

If Root Directory is `frontend`, the build fails with `cd: frontend: No such file or directory`.

## Render persistence (Postgres)

The API persists the full valuation store as JSONB in Render Postgres when `DATABASE_URL` is set.

| Env | Purpose |
|---|---|
| `DATABASE_URL` | Internal Postgres URL (preferred on Render) |
| `VALUATION_DB_DIR` | Optional file fallback path |

Without `DATABASE_URL`, free web services lose `db.json` on redeploy/cold start.

Gut-193 rate schedule + YP (`CASE-193-RA-UI-GUIDE`) are seeded on every boot via `workflowSeedCatalog.ts`. New BUILDING cases auto-pin those IDs.

## Login (seed admin)

- Email: `admin@jigaon.gov.in`
- Password: `Admin@12345`
