# Objectives, Scope, and Stakeholders

## 1. Primary objectives

1. Digitize end-to-end **building valuation** for WRD irrigation / LA support work.
2. Enforce a clear workflow from **case → structure facts → MS → rates → abstract → depreciation → documents**.
3. Use **PWD CSR-style rate catalogues** and **Y.P. factor tables** as first-class data, not embedded spreadsheet cells.
4. Produce **present cost** and **depreciated value** with reproducible arithmetic.
5. Export official-style **PDF** (and Excel dump) from a **frozen finalized snapshot**.
6. Support role-based access (estimator / admin) and an **audit trail**.
7. Deploy a usable cloud instance (frontend + API + durable storage) for demonstration and pilot use.

## 2. Secondary objectives

- Preserve a **LEGACY** path so older cases (e.g. `CASE/2008-09/165`) remain openable.
- Provide a **seeded demo case** (Gut 193 / Eknath) that matches a known workbook result for training and verification.
- Allow import / maintenance of rate schedules and Y.P. tables.
- Support evidence attachments (field drawings, photos, workbooks) on the case.

## 3. Scope (in)

| In scope | Description |
|---|---|
| Web SPA + REST API | Officer-facing application |
| Projects & cases registry | Create / search / open valuation cases |
| BUILDING workflow (6 screens) | New cases |
| LEGACY wizard | Existing non-BUILDING cases |
| Rate DB & Y.P. tables | Browse / use pinned versions |
| MS generation (draft suggestions) | Fact-driven; engineer accept / override |
| Abstract & depreciation | Present cost + Y.P. formula |
| Finalize & export | PDF / Excel from snapshot |
| Auth & audit | Login, roles, activity trail |
| Cloud deploy | Vercel frontend, Render API, Postgres when available |

## 4. Scope (out)

| Out of scope (current release) | Note |
|---|---|
| Fully validated production quantity rule set for all CSR items | Drafts are marked `DRAFT`; not all items are `VALIDATED_RULE` |
| Replacing statutory LA authority / court valuation | Departmental estimate support only |
| Mobile native apps | Responsive web only |
| GIS cadastral mapping | Gut / survey number is textual metadata |
| Automatic payment disbursement | Not part of the platform |
| Multi-language UI (Marathi-first) | English UI; Marathi can be future work |

## 5. Stakeholders

| Stakeholder | Interest |
|---|---|
| Assistant Engineer / Estimator | Enter measurements, bind rates, prepare estimate |
| Executive Engineer / Admin | Review, finalize, administer officers & standards |
| Checker / Section Officer (roles available in seed model) | Review workflow status |
| Sub-Division office (Nandura) | Pilot operational user |
| Report / academic reviewer | Clarity of problem, design, results |
| Developer / maintainer | Architecture, APIs, deployment |

## 6. Success criteria (for the report)

- Live system reachable (frontend + API health).
- Demo case completes screens 1–6 with documented totals.
- Screenshots and formulas included in the documentation pack.
- Dual workflow (BUILDING vs LEGACY) clearly explained.
