# Data Model and APIs (high level)

## 1. Core entities

| Entity | Purpose |
|---|---|
| User / Officer | Auth identity, role |
| Project | Irrigation project container |
| Case | Valuation file (workflow BUILDING or LEGACY) |
| Property | Owner, gut/survey, village, LA refs |
| Structure | One building / shed / porch on the case |
| Structure layout | Clear spans, rooms, wall runs |
| Construction | Materials, height, year, useful life, finishes |
| Opening | Door / window / ventilator schedule |
| Member | Columns, beams, timber, GI members |
| Measurement line / draft block | Suggested or accepted quantities |
| Rate schedule version | Pinned CSR catalogue |
| Rate item | Item no., description, unit, rate |
| Y.P. table version | Pinned factor table |
| Y.P. factor row | Years → factor |
| Abstract / calculation result | Present cost aggregates |
| Depreciation result | Depreciated value per structure / case |
| Snapshot | Frozen finalize payload for export |
| Evidence document | Uploaded files |
| Audit log | Action, officer, entity, timestamp |

## 2. Case pinning

Each BUILDING case stores:

- `rateScheduleVersionId` — which CSR extract to search/bind  
- `ypTableVersionId` — which Y.P. rows to use for depreciation  

Changing pins after work is advanced should be treated carefully in operations; the demo case pins **CASE-193-RA-UI-GUIDE** rates and **Gut 193 workbook YP (7 & 10)**.

## 3. API groups (conceptual)

| Group | Examples |
|---|---|
| Auth | Login, register (admin-gated), me |
| Projects / cases | CRUD list, create BUILDING case |
| Workflow | Bundle GET; structure PUTs; generate; accept; calculate; finalize |
| Rates | List / search / create schedule items |
| Y.P. | List / search factors |
| Exports | PDF / Excel blob from snapshot |
| Audit | Query logs |
| Health | `GET /api/health` |

## 4. Security notes for the report

- Authenticated routes expect a bearer / session token.  
- Finalize restricted to ADMIN in current product rules.  
- Public self-registration alone does not create officers.  
- Demo passwords must not be presented as production secrets.

## 5. Persistence behavior

- Prefer **Postgres** in cloud for durability across deploys.  
- If Postgres is unavailable / expired, server may fall back to **file** storage — document this as an ops risk in deployment chapter.  
- Writes that mutate cases should **flush** before the HTTP response completes (implementation detail that fixed “lost cases” class of bugs).
