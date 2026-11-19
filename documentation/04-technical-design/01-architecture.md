# System Architecture

## 1. Topology

```
┌─────────────────────────┐         HTTPS          ┌──────────────────────────────┐
│  Browser (Officer)      │ ─────────────────────► │  Vercel — React SPA (Vite)    │
│  Desktop / laptop       │ ◄───────────────────── │  Static assets + client routes│
└─────────────────────────┘                        └──────────────┬───────────────┘
                                                                  │ /api/* proxy or
                                                                  │ VITE_API_URL
                                                                  ▼
                                                   ┌──────────────────────────────┐
                                                   │  Render — Express API         │
                                                   │  TypeScript / Node            │
                                                   │  /api/health, /api/v1/...     │
                                                   └──────────────┬───────────────┘
                                                                  │
                                         ┌────────────────────────┼────────────────────────┐
                                         ▼                        ▼                        ▼
                                   Postgres (preferred)     JSON file store          Seed / fixtures
                                   durable cases            fallback when PG         Gut-193 demo etc.
```

## 2. Logical layers

| Layer | Responsibility |
|---|---|
| Presentation | React pages: login, dashboard, cases, valuation workspace, rates, Y.P., audit |
| Application API | Auth, cases, workflow generate/accept/calculate/finalize, rates, Y.P., exports |
| Domain | Measurement draft registry, abstract aggregation, Y.P. depreciation, snapshot freeze |
| Persistence | Postgres store and/or `backend/data` file DB with flush-on-write |

## 3. BUILDING workflow API surface (conceptual)

- Read case bundle: workflow GET  
- Structure layout / construction / openings / members: PUT endpoints under structures  
- Generate measurement suggestions  
- Bind rates / accept drafts / overrides  
- Calculate abstract & depreciation  
- Finalize snapshot (admin)  
- Export PDF / Excel from snapshot id  
- Optional `source-replay` fixture for workbook verification  

Exact paths live under `/api/v1/workflow` (see codebase `backend/src`).

## 4. Frontend routing (representative)

| Path | Screen |
|---|---|
| `/login` | Authentication |
| `/dashboard` | Executive dashboard |
| `/cases` | Cases registry |
| `/cases/:id` | Valuation workspace (BUILDING or LEGACY) |
| `/rates` | CSR rate database |
| `/depreciation-factors` | Y.P. factors table |
| `/audit-logs` | System audit trail |

## 5. Design principles

1. **Facts first** — geometry and construction drive drafts; drafts do not invent missing walls.  
2. **Pinned standards** — case binds a rate schedule version and a Y.P. table version.  
3. **Explicit writes** — quantities change only on generate / decision / calculate / replay.  
4. **Freeze on finalize** — exports read the snapshot, not a live recalculation.  
5. **Dual workflow** — BUILDING for new work; LEGACY for historical cases.
