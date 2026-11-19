# Technology Stack

## Frontend

| Technology | Role |
|---|---|
| React 19 | UI components and pages |
| TypeScript | Typed client code |
| Vite 6 | Dev server and production build |
| React Router | Client-side navigation |
| Tailwind CSS (project styling) | Government-themed layout |
| Axios / fetch wrapper (`services/api.ts`) | API client + auth header |
| Decimal-aware inputs (`DecimalField`) | Avoid float truncation while typing |

## Backend

| Technology | Role |
|---|---|
| Node.js | Runtime |
| Express.js | HTTP API |
| TypeScript | Server source |
| Decimal.js (high scale) | Money / quantity arithmetic |
| PDFKit | Multi-section PDF export |
| JWT / session auth | Officer authentication |
| Postgres (optional / preferred in cloud) | Durable persistence |
| JSON file DB (`backend/data`) | Local / fallback store |

## Hosting & ops

| Service | Role |
|---|---|
| Vercel | Frontend SPA hosting; optional `/api` rewrite to Render |
| Render | Backend web service |
| Render / external Postgres | Durable DB when provisioned |
| GitHub | Source control |

## Testing

| Area | Notes |
|---|---|
| Automated suite | Repository documents a passing test suite (see root README badge / `07-testing-evidence`) |
| Demo verification | Gut-193 Eknath case targets present ₹10,73,836 / depreciated ₹8,23,876 |

## Key libraries (conceptual, for report)

- **decimal.js** — avoid IEEE float drift in estimates  
- **pdfkit** — COVER / FS / DEP / ABSTRACT / MS PDF compilation  
- **express** middleware — CORS, JSON, auth guards
