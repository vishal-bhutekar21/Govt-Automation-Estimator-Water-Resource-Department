# Feature Catalogue (by module)

Use this list as the authoritative feature set for the report. Do not claim features not listed here.

---

## A. Authentication & access

| Feature | Description |
|---|---|
| Officer login | Email + password sign-in |
| Role-aware UI | ADMIN / ESTIMATOR (and related seed roles) |
| Sign out | Clears client session |
| Admin-gated registration | New officer accounts require admin token |
| Demo presets | Fast login helpers on login page (seed users) |

---

## B. Executive dashboard

| Feature | Description |
|---|---|
| Aggregate stats | Projects, cases, sanctioned / workflow counts (as implemented) |
| Recent cases | Quick open of latest valuation files |
| Shortcuts | Manage projects, new case, view all cases |

**Screenshot:** `screenshots/01-dashboard.png`

---

## C. Projects registry

| Feature | Description |
|---|---|
| Irrigation project records | e.g. Jigaon Major Irrigation Project |
| Link cases to projects | Organizational container for valuations |

---

## D. Valuation cases registry

| Feature | Description |
|---|---|
| Case list | Case number, owner, location |
| Search / filter | By case no., owner, status |
| Initialize new case | Starts BUILDING workflow |
| Open existing case | BUILDING or LEGACY UI by workflow flag |

**Screenshot:** `screenshots/02-cases-registry.png`

---

## E. BUILDING workflow — Screen 1: Case and structures

| Feature | Description |
|---|---|
| Case identity | Owner, gut/survey, village/taluka/district, LA case no., dates |
| Pin rate schedule | Select schedule version for the case |
| Pin Y.P. table | Select Y.P. table version (e.g. Gut 193 7 & 10) |
| Structure list | Add main house, shed, porch, store, other |
| Evidence attach | Field drawing, sketch, photo, workbook, etc. |
| Progress checklist | Shows what is still incomplete |

**Screenshot:** `screenshots/03-screen1-case-structures.png`

---

## F. BUILDING workflow — Screen 2: Building definition

| Feature | Description |
|---|---|
| Plan grid | Overall clear size; columns × rows; equal or unequal spans |
| 2D check sketch | SVG preview of rooms / walls (not survey drawing) |
| Construction facts | Type, wall material/thickness, height, year, useful life, floor, roof, foundation depths |
| Walls | Measured wall runs (engineer-confirmed) |
| Openings | Doors / windows / ventilators with counts & sizes |
| Members | Columns, beams, rafters, GI pipes, etc. |
| Structure kinds | Main house / store use room grid; sheds/porches use simple plan |

**Screenshot:** `screenshots/04-screen2-building-definition.png`

---

## G. BUILDING workflow — Screen 3: Generated measurement

| Feature | Description |
|---|---|
| Generate measurement sheet | Writes draft blocks from saved facts |
| Item previews | Qty + unit per draft line (e.g. cum, sqm, qtl) |
| Fact-driven drafts | Ordinary `draft.*` pack; Gut-193 profile uses `eknath.*` source drafts when plan matches |
| Draft status | Suggestions marked DRAFT until accepted |
| Gap navigation | Missing facts link back to building definition |

**Screenshot:** `screenshots/05-screen3-measurement.png`

---

## H. BUILDING workflow — Screen 4: Review, rates, abstract

| Feature | Description |
|---|---|
| Bind rates | Search pinned catalogue; select row (unit + rate from catalogue) |
| Accept drafts | Accept lines with unique catalogue rate |
| Override / exclude / reset | Engineer control of quantities |
| Manual measured item | Add catalogue item with measured qty when needed |
| Prepare abstract | Aggregate to present cost |

**Screenshot:** `screenshots/06-screen4-review-abstract.png`

---

## I. BUILDING workflow — Screen 5: Depreciation and finalize

| Feature | Description |
|---|---|
| Y.P. depreciation | `ROUND(present × YP(future life) / YP(useful life), 0)` per structure |
| Recalculate | Refresh depreciation from pinned table |
| Accept depreciation | Engineer acknowledgement step |
| Finalize | ADMIN freezes snapshot (not updated in place) |
| Block on missing Y.P. | Missing factor prevents depreciation |

**Screenshot:** `screenshots/07-screen5-depreciation.png`

---

## J. BUILDING workflow — Screen 6: Documents

| Feature | Description |
|---|---|
| Download PDF | Compiled report sections from snapshot (COVER / FS / DEP / ABSTRACT / MS) |
| Download Excel | Text dump of same snapshot |
| Source replay fixture | Advanced workbook replay (labelled SOURCE_REPLAY) for Gut-193 verification |
| Evidence list | Attached files on the case |

**Screenshot:** `screenshots/08-screen6-documents.png`

---

## K. Standards & auditing

| Feature | Description |
|---|---|
| PWD CSR rate database | Search / browse / add CSR items |
| 7% Y.P. factors table | Search factors by years / value; formula shown on page |
| System audit trail | Material actions for accountability |

**Screenshots:** `09-rates-database.png`, `10-yp-factors-table.png`, `11-audit-trail.png`

---

## L. Cross-cutting non-functional features

| Feature | Description |
|---|---|
| Decimal precision | High-precision arithmetic (Decimal.js / decimal fields in UI) |
| Durable persistence | Postgres when configured; file fallback |
| Cloud SPA + API | Vercel frontend, Render backend |
| API health endpoint | `/api/health` |
| Version badge | UI shows CSR year + app version (e.g. v2.4.0) |

---

## M. Explicitly not claimed

- Fully validated production quantity rules for every CSR item  
- Automatic statutory LA award / payment  
- Native mobile apps  
- GIS parcel mapping  
- Marathi-first UI (future)
