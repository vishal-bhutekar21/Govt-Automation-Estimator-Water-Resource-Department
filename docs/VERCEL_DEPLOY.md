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

## Render persistence

Render **free** web services have **no persistent disk**. Cases written to `backend/data/db.json` survive while the instance is up, but a **redeploy or cold new instance resets** to seed data.

To keep cases across restarts:

1. Upgrade the web service to a paid plan that supports disks.
2. Attach a disk mounted at `/var/data` (or similar).
3. Set env `VALUATION_DB_DIR=/var/data` on the Render service.
4. Redeploy.

Gut-193 rate schedule + YP (`CASE-193-RA-UI-GUIDE`) are seeded on every boot via `workflowSeedCatalog.ts`. New BUILDING cases auto-pin those IDs.

## Login (seed admin)

- Email: `admin@jigaon.gov.in`
- Password: `Admin@12345`
