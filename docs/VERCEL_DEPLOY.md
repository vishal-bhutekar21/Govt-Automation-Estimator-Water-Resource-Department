# Vercel deploy

This app is a **repo-root** deployment (not `frontend/` alone).

## Project settings (required)

In Vercel → Project → Settings → General:

| Setting | Value |
|---|---|
| **Root Directory** | *empty* (repository root). Do **not** set `frontend`. |
| Framework Preset | Other / Vite is fine |
| Build Command | leave empty (uses `vercel.json`) **or** `npm run build --prefix frontend` |
| Output Directory | leave empty (uses `vercel.json`) **or** `frontend/dist` |
| Install Command | leave empty (uses `vercel.json`) |

If Root Directory is `frontend`, the build fails with:

`cd: frontend: No such file or directory`

because the process is already inside `frontend/`.

## Why root is required

- SPA build output: `frontend/dist`
- Serverless API: `api/index.ts` → imports `backend/src`
- Rewrites in root `vercel.json` send `/api/*` to that function

## After changing Root Directory

Redeploy from the latest `main` commit. First deploy after clearing Root Directory may take longer (frontend + backend installs).
