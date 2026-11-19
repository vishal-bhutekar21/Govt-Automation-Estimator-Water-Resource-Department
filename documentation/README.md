# Project Documentation Pack

**Product:** Automated Building Valuation & Estimation Platform  
**Client context:** Government of Maharashtra — Water Resources Department  
**Pilot office:** Jigaon Major Irrigation Project, Sub-Division No. 2, Nandura (Dist. Buldhana)  
**Purpose of this folder:** Source material for drafting a final academic / delivery **project report**. Another author should be able to write the report **only** from these files plus the screenshots.

---

## How to use this pack

1. Start with [`00-PROJECT-REPORT-OUTLINE.md`](./00-PROJECT-REPORT-OUTLINE.md) — chapter map that matches a standard project report.
2. Fill each chapter using the numbered folders below (copy/adapt wording; do not invent features not listed).
3. Insert figures from [`screenshots/`](./screenshots/) where captions are suggested.
4. Use [`08-appendices/`](./08-appendices/) for formulas, glossary, credentials (demo only), and URLs.

---

## Folder map

| Folder | Contents |
|---|---|
| `01-introduction/` | Problem, objectives, scope, stakeholders |
| `02-system-overview/` | Purpose, solution summary, users, dual workflows |
| `03-features-modules/` | Feature catalogue by module |
| `04-technical-design/` | Architecture, stack, data, APIs, security |
| `05-workflows/` | End-to-end BUILDING + LEGACY flows; MS, abstract, depreciation |
| `06-deployment/` | Vercel + Render + Postgres hosting |
| `07-testing-evidence/` | Tests, demo case results, verification notes |
| `08-appendices/` | Glossary, formulas, sample numbers, report checklist |
| `screenshots/` | UI captures for the report figures |

---

## Live system (as of documentation date)

| Layer | URL |
|---|---|
| Frontend (Vercel) | https://govt-automation-estimator-water-res.vercel.app |
| Backend API (Render) | https://govt-automation-estimator-backend.onrender.com |
| Health | https://govt-automation-estimator-backend.onrender.com/api/health |
| Prefill demo case | `/cases/case-eknath-gut193-demo` (`CASE-193-EKNATH-DEMO`) |

**Demo login (seed):** `admin@jigaon.gov.in` / `Admin@12345`

---

## Repository pointers (for developers)

- Frontend: `frontend/`
- Backend API: `backend/`
- Building workflow guide: `docs/BUILDING_WORKFLOW.md`
- Rate / YP import notes: `docs/RATE_IMPORT.md`
- Deploy notes: `docs/VERCEL_DEPLOY.md`

---

## Document control

| Item | Value |
|---|---|
| Pack version | 1.0 |
| Related app commit (example) | `ab1a9bd` — Eknath prefill demo + prior Postgres / decimal fixes |
| Intended audience | Report writer, reviewer, new developer onboarding |
