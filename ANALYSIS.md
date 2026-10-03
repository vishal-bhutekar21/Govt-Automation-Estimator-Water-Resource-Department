# Current Platform Reverse-Engineering Report

**System:** Automated House Valuation & Estimation Management System  
**Repository:** `Govt-Automation-Estimator-Water-Resource-Department`  
**Scope:** What the current code actually does. No redesign, no proposed workflow, no fixes.  
**Method:** Traced TypeScript frontend, Express API, JSON datastore, seed data, and tests. README text is cited only where it disagrees with code.

This platform values **one residential (or similarly labeled) structure** using PWD-style construction items, a 7% Year’s Purchase factor table, and a salvage deduction. It stores land-acquisition identifiers (owner, village, gat/survey number, LA case number). It does **not** calculate land area, land rate, solatium, trees, crops, wells, or a separate land compensation component.

---

## 1. Project structure

### Layout

```
Estimation Platfrom/
  frontend/          React 19 + Vite + TypeScript SPA
  backend/           Express 4 + TypeScript calculation API
  backend/data/      db.json  (JSON file used as the database)
  backend/src/       routes, controllers, models, seed, decimal math
  backend/test/      node:test suites for measurement, depreciation, PDF
  api/index.ts       re-exports the Express app for Vercel
  vercel.json        static frontend + /api rewrite
  output/            usage guide markdown (documentation, not runtime)
  package.json       root scripts that delegate to frontend/backend
```

There is one frontend application and one backend process. There are no workers, queues, cron jobs, or separate microservices.

### Architecture (as implemented)

```
Browser (React SPA, port 5173 in dev)
    |  axios baseURL = VITE_API_URL or "/api"
    |  JWT in localStorage key gov_valuation_token
    v
Vite proxy /api -> http://localhost:5000     (dev)
Vercel rewrite /api/* -> api/index.ts        (deploy)
    v
Express app  backend/src/index.ts
    routes under /api/v1/*
    v
DatabaseManager  backend/src/database/db.ts
    in-memory arrays, flushed to backend/data/db.json
    v
Controllers perform validation + Decimal.js arithmetic
    and write the same arrays
```

### Components

| Component | Purpose | Important files | Consumes | Produces | Talks to |
|---|---|---|---|---|---|
| Frontend SPA | Officer UI: login, projects, 10-step case wizard, rate table, YP table, audit list | `frontend/src/App.tsx`, `pages/**`, `services/api.ts`, `context/AuthContext.tsx` | JWT user, REST JSON | Form posts, PDF blob download, client-side print, hardcoded JSON export | Backend `/api/v1` |
| Auth | Login, open registration, user list/delete, JWT | `authController.ts`, `middleware/auth.ts`, `authRoutes.ts` | email, password, role | JWT (24h), user object without password hash | `db.users`, `db.auditLogs` |
| Projects | Irrigation project registry | `projectController.ts`, `ProjectListView.tsx` | project fields | project row; case count and summed final valuations | `db.projects`, `db.cases`, `db.finalValuations` |
| Cases | Valuation file: identity, property, structure, status | `caseController.ts`, `CaseListView.tsx`, `CaseCreationModal.tsx`, `CaseWizardView.tsx` | case + owner + structure fields | `cases`, `properties`, `structures`, audit rows | other case-scoped controllers via `caseId` |
| Measurements | Line dimensions and opening deductions | `measurementController.ts`, `MeasurementStep.tsx`, `utils/decimal.ts` | count, L, B, D, calc type | gross, deduction, net, group total; may update a linked estimate quantity in memory | `db.measurementGroups`, `db.estimateItems` |
| Rates | PWD CSR item master | `rateController.ts`, `seedData.ts` `seedRateItems`, `RateManagementView.tsx` | search filters; ADMIN create/update body | rate rows | copied onto estimate items only when a rate is linked |
| Abstract estimate | Quantity × rate | `estimateController.ts`, `AbstractEstimateStep.tsx` | measurement totals + stored rates | `estimateItems.amount`, grand total | depreciation present cost is also overwritten on recalculate |
| Depreciation | 7% YP ratio | `depreciationController.ts`, `DepreciationStep.tsx` | structure year, valuation date, useful life, estimate items, YP table | `depreciationCalculations` | called again by salvage |
| Salvage + final | Second valuation and net payable | `salvageController.ts`, `SalvageStep.tsx`, `FinalValuationStep.tsx` | salvage flags, adjustment %, YP factors | `salvageEstimates`, `finalValuations`, Indian-currency words | reads estimate items and depreciation |
| Panchanama | Witnesses, remarks, photo URLs | `panchanamaController.ts`, `EvidencePanchanamaStep.tsx` | names, remarks, photo URL | `panchanamaRecords`, `evidencePhotos` | PDF page 4–5; **not** used in money formulas |
| PDF | 5-page server PDF | `pdfReportController.ts`, `PdfReportStep.tsx` | full case graph | `application/pdf` stream | recalculates depreciation and salvage while generating |
| Dashboard | Counts and recent cases | `dashboardController.ts`, `DashboardView.tsx` | all cases and final valuations | aggregate JSON | read-only |
| Audit | Append-only log list | `auditController.ts`, `AuditLogView.tsx` | filters none (returns all, newest first) | JSON list | written by case/project/register only |
| Decimal engine | Shared rounding | `backend/src/utils/decimal.ts` | numbers | Decimal results | used by measurement, estimate, depreciation, salvage, dashboard |
| Seed / JSON DB | Golden sample + persistence | `database/db.ts`, `database/seedData.ts`, `data/db.json` | file if present | in-memory schema | every controller |
| Vercel entry | Serverless host of the same Express app | `api/index.ts`, `vercel.json` | HTTP | same API | `db.save()` failures are swallowed |

### What is not present

- No SQL, Prisma, ORM, or migrations.
- No background workers.
- No Excel export implementation (`multer` and no `xlsx` usage in source). `multer` is a root dependency and is not imported by any controller.
- No external government rate API. Rates are seed data plus optional ADMIN inserts.
- `documents` and `calculationVersions` arrays exist on the schema and stay empty. Nothing writes them.
- `DocumentRecord` is modeled and never created by a controller.

### CONFIRM / INFER / UNKNOWN — section 1

**Confirmed from code**

- Single React app + single Express app + JSON file database.
- `api/index.ts` only re-exports the Express app.
- Persistence is `backend/data/db.json`. `db.save()` catches errors and continues (comment: serverless / read-only disk).
- If `db.json` exists and `cases.length > 0`, that file replaces the in-memory seed on `init()`.

**Inferred**

- On Vercel, a failed disk write means the request sees in-memory data only for that instance lifetime. The code comment says this; runtime hosting behavior was not executed in this analysis.

**Unknown / needs domain validation**

- Whether production is expected to be the Vercel deployment or a long-running Node process with `db.json`.

---

## 2. Actual user roles

The role enum is exactly:

`ADMIN | ESTIMATOR | CHECKER | VIEWER`

Defined in `backend/src/models/types.ts` and `frontend/src/types/index.ts`.

Seeded accounts (labels in code, not a separate permission system):

| Stored role | UI label on register / super-admin screens | Seeded login present? |
|---|---|---|
| `ADMIN` | Executive Engineer / Super Admin | Yes. Plus a hardcoded login bypass in `authController.ts` that always issues an `ADMIN` token for one email, even if the user row is missing. |
| `ESTIMATOR` | Assistant Engineer (estimator) | Yes, one seed user. |
| `CHECKER` | Technical checker / AE Grade-II | No seed user. Can be created via open register. |
| `VIEWER` | Revenue inspector / section officer | No seed user. Can be created via open register. |

There is no fifth role named “Super Admin”. The super-admin screens assign `role: 'ADMIN'`.

### What the backend actually enforces

`authenticateJWT` (`middleware/auth.ts`): Bearer JWT, 24-hour expiry, secret `process.env.JWT_SECRET` or a hardcoded fallback string. User must still exist in `db.users`, except the login bypass path which signs a fixed id.

`requireRole` is applied only here:

| Route | Roles allowed |
|---|---|
| `POST /api/v1/projects` | `ADMIN` |
| `POST /api/v1/rates` | `ADMIN` |
| `PUT /api/v1/rates/:id` | `ADMIN` |

`requireRole` is imported in `auditRoutes.ts` and **not used**. `GET /api/v1/audit` only requires a valid JWT.

These routes require any logged-in role (`ADMIN`, `ESTIMATOR`, `CHECKER`, or `VIEWER`): cases, measurements, estimates, depreciation, salvage, final valuation, panchanama, PDF, dashboard, rate **read**, project **read**.

These routes require **no token**:

| Route | Effect |
|---|---|
| `POST /api/v1/auth/login` | Issues JWT |
| `POST /api/v1/auth/register` | Creates any role, including `ADMIN`, and returns a JWT. No caller check. |
| `GET /api/v1/auth/users` | Lists every officer (no password hash). |
| `DELETE /api/v1/auth/users/:id` | Deletes any user by id. |
| `GET /api/health` | Health JSON |

`isActive` exists on the user type and is set `true` on register. Login does not read `isActive`.

### What the frontend actually enforces

`ProtectedRoute` checks only that a token and user object exist in React state (hydrated from `localStorage`). It does not check role.

`isAdmin` (`user.role === 'ADMIN'`) hides:

- “Create project” on `ProjectListView`
- create/edit rate controls on `RateManagementView`

`isEstimator` is computed (`ESTIMATOR` or `ADMIN`) and is **not read by any page**.

Sidebar links (dashboard, projects, cases, rates, YP table, audit) render for every authenticated user. Case create, measurement edit, estimate edit, salvage toggles, adjustment slider, panchanama edits, and PDF download have no role check in the UI.

`CHECKER` has no checker-only screen and no backend action that only a checker can perform. `VIEWER` is not read-only.

Approval fields `preparedBy`, `checkedBy`, `approvedBy` are strings. On case create they are set to:

- `preparedBy` = current user’s name, or `"Assigned Estimator"`
- `checkedBy` = `"Assistant Engineer (A.E. Gr-I)"`
- `approvedBy` = `"Executive Engineer (E.E.)"`

Nothing later requires a checker or admin to change case status to approved. `PUT /api/v1/cases/:id/status` accepts any string and is not called by the frontend.

### CONFIRM / INFER / UNKNOWN — section 2

**Confirmed from code**

- Four role strings exist.
- Backend role gate is only project create and rate create/update.
- Registration, user list, and user delete are unauthenticated.
- Frontend `isAdmin` only gates project create and rate editing UI.
- `CHECKER` and `VIEWER` have no distinct permissions.

**Inferred**

- UI labels (Executive Engineer, Assistant Engineer, Revenue Inspector) are display names for those four strings. They are not separate authorization objects.

**Unknown**

- Whether the department intends checker and viewer to be real workflow actors. The code does not implement that.

---

## 3. Complete estimation workflow

The unit of work is a **valuation case** under a **project**. One case has one property record and one structure record. Money is produced from measurement groups and estimate lines, not from land area.

Wizard steps are client state in `CaseWizardView`. The stepper allows jumping to any step. Steps are not locked by status.

```
Login
  -> Dashboard (optional)
  -> Projects (optional; ADMIN can add a project)
  -> Cases list
  -> Modal: create case          [this is the only Step 1 data entry]
  -> Wizard opens at Step 2
       1 Case setup          read-only confirmation
       2 Property particulars
       3 Structure specs + life years
       4 Measurements
       5 Abstract estimate (qty x rate)
       6 Depreciation (YP ratio on full abstract)
       7 Salvage item selection
       8 Final net = depreciated cost - adjustment
       9 Panchanama + photo URLs
      10 On-screen certificate + server PDF download
```

### Step 0 — Sign in

1. User enters email and password on `/login`.
2. Screen: `LoginView.tsx`.
3. API: `POST /api/v1/auth/login`.
4. Handler: `login` in `authController.ts`.
5. DB: reads `users`. Does not write, except `ensureSuperAdmin()` may insert one admin row.
6. Validation: both fields required; unknown user or bad password returns 401. The hardcoded bypass returns 200 before the database password check.
7. No valuation calculation.
8. Token and user JSON stored in `localStorage`.
9. Navigate to `/dashboard`.

### Step 1 — Create the case (before the wizard)

Screen: `CaseCreationModal.tsx`, opened from `CaseListView`.

**User enters**

| Field | UI required | Backend required | Default |
|---|---|---|---|
| Project | yes (`required` select) | yes | first project in the list |
| Case number | yes | yes, unique case-insensitive | `CASE/2008-09/` + random 100–999 |
| Owner name | yes | yes | empty |
| House number | yes in the modal | no (stored as `''` if omitted) | empty |
| Village | no | no | `"Dadulgaon"` |
| Taluka | no | no | `"Nandura"` |
| District | no | no | `"Buldhana"` |
| LA case number | no | no | empty |
| Survey / gat number | no | no | empty |
| Date of inspection | no | no | today `YYYY-MM-DD` |
| Valuation date | no | no | today |

API: `POST /api/v1/cases` → `createCase`.

**Records created**

- `cases`: status `DRAFT`; `preparedBy` / `checkedBy` / `approvedBy` as in section 2; `createdBy` = JWT user id.
- `properties`: contact, address, notes empty; `submergenceType` hardcoded to `"Full Submergence (Reservoir Area)"` regardless of the modal (the modal does not send submergence).
- `structures`: hardcoded defaults, not entered in the modal:
  - structure type `Residential Dwelling`
  - construction `B.B.M. Wall + C.G.I. Sheet Roof (Class-B)`
  - year = current calendar year minus 4
  - total life 45, present life 4, future life 41
  - roof / wall / floor strings as in `createCase`
  - rooms 3, built-up 60.00 sqm, plinth 68.00 sqm
- Audit log action `CASE_CREATED`.

**Not created for a new case:** measurement groups, estimate items, depreciation row, salvage row, final valuation, panchanama. Those appear only when later APIs run, or they already exist for the seeded case `case-jigaon-165`.

Wizard Step 1 (`currentStep === 1`) does not edit the case. It shows the case number and a button to go to step 2. The wizard’s initial step is 2, so Step 1 is only reached if the user clicks the stepper.

Case number, inspection date, and valuation date cannot be changed after create. No update-case endpoint exists besides status, property, and structure.

### Step 2 — Property particulars

Screen: `PropertyDetailsStep.tsx`.  
API: `PUT /api/v1/cases/:id/property` → `updateProperty`.

**User can edit:** owner name, contact, address, village, taluka, district, LA case number, house number, survey/gat number, submergence type, additional notes.

Submergence options (labels only; no formula uses them):

- Full Submergence (Reservoir Area)
- Partial Submergence (Buffer Margin)
- Canal Alignment Encroachment
- Backwater Flood Margin

Frontend requires owner name and house number. Backend does not re-validate those fields. Backend copies `req.body` onto the property object (`...updates`), so any extra JSON keys sent by a client are stored.

If case status is `DRAFT`, this save sets status to `MEASUREMENT_IN_PROGRESS`. No other status is set by this step. Audit action `PROPERTY_DETAILS_UPDATED` stores full old and new JSON.

Save Draft stays on the step. Save & Continue goes to step 3. The user can also jump ahead without saving.

### Step 3 — Structure specifications

Screen: `StructureDetailsStep.tsx`.  
API: `PUT /api/v1/cases/:id/structure` → `updateStructure`.

**User enters / system shows**

| Field | How it is set | Used later in money math? |
|---|---|---|
| Structure purpose | dropdown | No. Printed on reports as text. |
| Construction classification | free text | No. Report text. |
| Year of construction | number | Yes. Depreciation age. |
| Total useful life | number, default 45 | Yes. Depreciation. |
| Present life | display only, computed in the browser | Stored if the save body includes it. Depreciation **recomputes** age and does not read this stored field. |
| Future life | display only, computed | Same as present life. |
| Plinth area sqm | number | No. PDF converts to sq ft for display (`× 10.7639`). |
| Built-up area sqm | number | No. Same display-only conversion. |
| Number of rooms | number | No. |
| Roof, wall, floor text | free text | No. PDF text. Some PDF lines ignore these and print fixed foundation/door sentences. |
| Additional notes | state exists; the visible form section read does not show a notes box in the rendered fields inspected | Stored if sent. |

Browser life math (`handleLifecycleChange`):

```
valuationYear = year of case.valuationDate, or 2016 if missing
presentLife   = max(0, valuationYear - yearOfConstruction)
futureLife    = max(0, totalUsefulLife - presentLife)
```

Backend save rules:

- Rejects year of construction greater than the **server’s current calendar year** (`INVALID_YEAR`).
- If `presentLife` is in the body, it is stored as sent. Otherwise present life = current calendar year − construction year (not the valuation year).
- Future life: body value if sent, else `totalLife - presentLife`.
- Rejects future life &lt; 0 (`INVALID_LIFE`).
- `Number(builtUpArea) || previous` means `0` is treated as missing and the old value is kept. Same for rooms and plinth.

Structure purpose options (labels; none change rates or formulas):

- Residential Dwelling
- Commercial / Shop
- Cattle Shed / Agricultural Store
- Community / Religious Structure
- Compound Wall & Open Shed

Audit action `STRUCTURE_DETAILS_UPDATED`. Case status is not changed here.

### Step 4 — Measurements

Screen: `MeasurementStep.tsx`.  
Load: `GET /api/v1/cases/:id/measurements` → `getMeasurements`, which runs `recalculateItemAndGroup` in memory and does **not** call `db.save()`.

For the seeded case, 18 groups already exist (section 4). For a new case, the list is empty until the user creates groups.

**User can**

- Add a group: title (required by API), unit (UI default `Cum`). Optional `itemNumber` and `rateItemId` exist on the API and are not sent by the UI. Item number becomes count of groups + 1.
- Add a line: description, calculation type (`VOLUME` default), number, length, breadth, depth/height.
- Delete a line.
- Add a deduction on a line: code (UI default `D1`), description (default `Door Opening`), number, L, B, H (UI defaults 1 × 0.90 × 0.23 × 2.10).
- Delete a deduction.
- Open a formula modal. The modal displays quantities already returned by the server. It does not calculate a second result.

**User cannot in the UI:** edit an existing line’s dimensions. `PUT /api/v1/cases/measurements/items/:itemId` exists and is unused by the frontend. Deleting a group exists as `DELETE /api/v1/cases/measurements/groups/:groupId` and is not called by `MeasurementStep`.

**Quantity formulas** (`DecimalMath.calculateGrossQuantity`):

| Type | Formula | Notes |
|---|---|---|
| `VOLUME` | `number × length × breadth × depth` | |
| `AREA` | `number × length × (depth if depth ≠ 0, else breadth if breadth ≠ 0, else 1)` | If both breadth and depth are non-zero, **breadth is ignored**. |
| `RUNNING_LENGTH` | `number × length` | |
| `COUNT` | `number` | |
| anything else | `number × length × (breadth or 1) × (depth or 1)` | |

Deductions always use the **VOLUME** formula, even when the parent line is AREA, length, or count.

Then, per line, rounded with `Decimal.round` half-up to **2 decimal places**:

```
grossQuantity     = round2(gross)
deductionQuantity = round2(sum of round2(each deduction))
netQuantity       = round2(max(0, grossQuantity - deductionQuantity))
group.totalQuantity = round2(sum of line net quantities)
```

`DecimalMath.roundQuantity` (4 decimal places) exists and is **not** used on this path.

If an estimate item already matches `measurementGroupId` or the same `caseId` + `itemNumber`, its `quantity` and `amount = roundMoney(quantity × rate)` are updated in memory. A new group has no estimate item until a rate is linked later. Adding measurements alone does not create estimate rows.

`numberCount` uses `Number(x) || 1`, so `0` becomes `1`.

No unit conversion (metre, foot, guntha, hectare, acre). UI labels dimensions as metres in the explanation modal. The stored unit string is whatever the group says (`Cum`, `Sqm`, `Rmt`, `No.` in the seed).

### Step 5 — Abstract estimate

Screen: `AbstractEstimateStep.tsx`.

Load: `GET /api/v1/cases/:id/estimate` → `getEstimate`.

This GET **recomputes displayed amount** as `roundMoney(quantity × rate)` and a grand total. It does **not** write amounts back, and it does **not** pull fresh quantities from measurements.

Recalculate button: `POST /api/v1/cases/:id/estimate/recalculate` → `recalculateEstimate`:

1. Recalculate every measurement group for the case.
2. For each existing estimate item, if a group matches `measurementGroupId` or `itemNumber`, copy `group.totalQuantity` onto `item.quantity`.
3. `amount = roundMoney(quantity × rate)` (2 decimal places, half up).
4. Grand total = sum of those amounts (Decimal add, then `roundMoney`).
5. If a depreciation row already exists, set `presentEstimatedCost = roundMoney(grandTotal)` and, if `totalLifeYpFactor > 0`,  
   `depreciatedValue = roundMoney(presentCost × futureYp / totalYp)`.  
   This path does **not** use `Math.round` to a whole rupee. The depreciation endpoint does (section 7). They can disagree by paise vs rupees.
6. `db.save()`.

Rate link (from an existing estimate row):

- If the row has `measurementGroupId`: `POST /api/v1/cases/measurements/groups/:groupId/link-rate` with `{ rateItemId }`.
- Else: `PUT /api/v1/cases/estimate/items/:itemId` with the rate number and description only (reference text is not updated on this branch).

`linkGroupRate` copies `rate`, `unit`, `description`, and `rateReference = "{scheduleYear} {itemNumber}"` onto the estimate row, or creates one if none matches the group id or item number. New rows start with `isSalvageEligible: false`. Amount uses the estimate row’s current quantity, not always `group.totalQuantity`, on the update branch.

Salvage checkbox: `PUT .../estimate/items/:itemId` with `isSalvageEligible`. Does not recompute salvage totals until step 7 or 8 is loaded.

**New-case gap (confirmed):** the abstract screen only lists `estimateItems`. The measurement screen never calls link-rate. A case with only new measurement groups and no estimate rows shows an empty abstract, and the rate picker is opened from an estimate row. The API can create an estimate row via link-rate, but the wizard does not call that API for a group that has no estimate row yet. The seeded case works because `seedEstimateItems` already has 18 rows.

Initial React state before the GET returns hardcodes grand total `261669` and the string `₹ 2,61,669.00`. After a successful GET, those are replaced.

### Step 6 — Depreciation

Screen: `DepreciationStep.tsx`.  
Load **and** the Recalculate button both run the same function `calculateCaseDepreciation` (`GET .../depreciation` and `POST .../depreciation/calculate`).

There is no separate user input on this screen. It displays the stored/recomputed result and the YP table (`GET /api/v1/cases/rates/yp-factors`).

Formula and edge cases: section 7. Opening this step **writes** the depreciation row (`db.save()` inside the calculator).

### Step 7 — Salvage

Screen: `SalvageStep.tsx`.

1. `GET .../estimate` for the item list.
2. `GET .../salvage` → `calculateCaseSalvageAndFinal(caseId)` with **no** percentage override.

That GET recomputes salvage and final valuation and **forces the adjustment percentage to 10** whenever the override argument is omitted (section 7 and 9).

Toggling a checkbox immediately `POST .../salvage/update` with the full selected id list and the percentage currently held in React state (default 10 if missing).

Seeded salvage-eligible items (flags on estimate rows, not a separate asset master): items 6, 10, 13, 14, 17, 18 — teak roof frame, CGI sheets, GI pipes, MS grill, teak frames, teak shutters.

### Step 8 — Final valuation

Screen: `FinalValuationStep.tsx`.  
Load: `GET .../final-valuation` → again `calculateCaseSalvageAndFinal(id)` with default **10%**, plus `numberToIndianWords`.

Slider: integer 0 to 25 inclusive. Each change:

1. `POST .../salvage/update` with `{ adjustmentPercentage }` and **without** `selectedItemIds` (existing `isSalvageEligible` flags are kept).
2. `GET .../final-valuation` only to refresh words.

The second GET recalculates with the hardcoded 10% default and **saves that 10% over the value just posted**. The React summary object is updated from the POST, so the screen can show the slider value while the database is put back to 10%. The next full load of step 7, step 8, or PDF generation uses 10% again.

Sign-off cards display `preparedBy`, `checkedBy`, `approvedBy`. They are not editable here and are not an approval action.

### Step 9 — Panchanama

Screen: `EvidencePanchanamaStep.tsx`.

- `GET .../panchanama` creates a record if missing, with **Dadulgaon / 2016-04-12 / two named panchas** defaults inside `getCasePanchanama`, including for a brand-new case. That is hardcoded sample text, not blank fields.
- User can add/remove panchas (name, address; signature stored as `isSigned: true` with no signature capture).
- User can edit inspection date, structural condition, general remarks, then save.
- User can add a photo by title, category, description, and **URL string**. Empty URL is replaced by a fixed Unsplash URL. No file is uploaded.
- Structural condition is not an input to compensation.
- Seeded case `case-jigaon-165` with zero photos receives four Unsplash URLs.

`structuralCondition` values used by the frontend type: `EXCELLENT | GOOD | FAIR | DILAPIDATED`. Backend stores whatever string is posted. The create-default is `'GOOD'`.

### Step 10 — Report

Screen: `PdfReportStep.tsx`.

- On-screen pages (cover, FC, abstract, recapitulation, photos) contain **hardcoded rupee figures** of the golden sample (`₹ 2,61,669.00`, `₹ 2,57,592.00`, `₹ 1,92,040.00`, `₹ 1,89,048.00`, `- ₹ 18,904.80`, `₹ 2,38,687.20`). They are not loaded from the API.
- “Edit Notes” changes React state (title, department header, remarks, three officer names) for that on-screen preview. “Save & Lock” sets `isEditMode` to false. **No API is called.** The server PDF ignores these edits.
- “Share” copies `{origin}/cases/{id}`. That URL still requires login.
- “Export JSON” (in the share UI) downloads a JSON file whose money fields are the same hardcoded golden-sample numbers, not the open case.
- “Print” calls `window.print()` on the on-screen preview.
- “Download PDF” calls `GET /api/v1/cases/:id/report/download`, which rebuilds depreciation and salvage (10% default) from the database and streams a PDFKit file.

### What is passed from step to step

The wizard does not pass calculation payloads between steps. Each step refetches by `caseId`. Shared parent state is only the case, property, and structure objects from `GET /api/v1/cases/:id`.

### CONFIRM / INFER / UNKNOWN — section 3

**Confirmed from code**

- The working money path is project → case → property text → structure life → measurement lines → estimate lines → YP depreciation of the whole abstract → salvage subset → percentage deduction → PDF.
- New cases do not receive the 18 seeded measurement/estimate rows.
- Several GET handlers recompute and save.
- On-screen step 10 amounts are literals.

**Inferred**

- An engineer using only the UI on a **new** case cannot attach CSR rates to new groups, because the rate picker is bound to existing estimate rows. This follows from which buttons call which routes. It was not executed in a browser in this pass.

**Unknown**

- Whether operators are expected to duplicate the seed case in `db.json` rather than use “Initialize New Case”.

---

## 4. Property and asset categories the platform can estimate

There is no land-type master and no asset-type master separate from **free-text structure labels** plus **CSR work items**.

### A. Structure purpose labels (not priced)

Stored on `structures.structureType`. Dropdown in section 3. No rate table is selected from this value.

### B. Construction text (not priced by class)

`constructionType`, `roofType`, `wallType`, `floorType` are strings. The seed and the create-case default describe Class-B burnt-brick masonry and CGI roof. Changing the words does not change item rates.

### C. The 18 seeded work items (these are what get priced)

Only the golden-sample case has them prebuilt. They are ordinary measurement groups, not a locked catalog. A user can add more groups with any title.

| # | Seed title | Unit | Seed qty | Seed rate (INR) | Salvage flag in seed | Rate id |
|---|---|---|---|---|---|---|
| 1 | Excavation for foundation in earth/soils | Cum | 12.20 | 120.00 | no | rate-01 |
| 2 | Dry rubble filling under floors | Cum | 4.88 | 905.00 | no | rate-02 |
| 3 | Cement concrete 1:4:8 foundation and bedding | Cum | 2.44 | 3476.10 | no | rate-03 |
| 4 | UCR masonry in CM 1:6 in plinth | Cum | 3.59 | 1797.35 | no | rate-04 |
| 5 | Burnt brick masonry in superstructure, with door/window deductions | Cum | 7.94 | 2585.20 | no | rate-05 |
| 6 | Country teak wood rafters and roof truss | Cum | 0.89 | 86131.60 | yes | rate-06 |
| 7 | Internal cement plaster 12 mm CM 1:4 | Sqm | 32.41 | 150.75 | no | rate-07 |
| 8 | Colour wash two coats | Sqm | 32.41 | 15.00 | no | rate-08 |
| 9 | External sand-faced plaster | Sqm | 15.60 | 362.15 | no | rate-09 |
| 10 | CGI sheet roofing 0.63 mm | Sqm | 73.01 | 650.05 | yes | rate-10 |
| 11 | CC flooring 40 mm 1:2:4 | Sqm | 19.32 | 313.60 | no | rate-11 |
| 12 | Jingle / jungle wood ballies | Rmt | 50.60 | 110.00 | no | rate-12 |
| 13 | GI pipe 50 mm columns / verandah posts | Rmt | 19.80 | 320.65 | yes | rate-13 |
| 14 | MS grill gate / ornamental iron | Sqm | 1.95 | 1903.40 | yes | rate-14 |
| 15 | Kud wall / bamboo matting / thatch partition | Sqm | 37.84 | 73.25 | no | rate-15 |
| 16 | Point wiring (light, fan, bell, 5A socket) | No. | 7.00 | 410.00 | no | rate-16 |
| 17 | Country teak door and window frames | Cum | 0.12 | 96131.60 | yes | rate-17 |
| 18 | 35 mm double-leaf teak panel shutters | Sqm | 13.23 | 3501.60 | yes | rate-18 |

Each line’s contribution, once an estimate row exists:

```
amount = round_half_up_2( netQuantity × rate )
```

Depreciation is **not** applied per item. It is applied once to the sum of all item amounts, and again to the sum of salvage-flagged item amounts (section 7).

Opening deductions in the seed exist only on item 5 (codes D1, D2, W1, W2). The README’s door/window sizes (1.00×2.10, 0.90×2.10, and so on) do **not** match the seed deduction dimensions. The code uses the numbers stored on each deduction record.

### D. Categories searched for and not implemented as estimators

No models, screens, or formulas were found for:

- Agricultural / residential / commercial **land area or land rate**
- Trees, crops, orchards
- Wells, bore wells
- Roads as a land-acquisition component (no road item in the 18)
- Fencing as its own module (compound wall is only a structure-purpose label)
- Irrigation assets other than the house items above
- Replenishable vs non-replenishable classification (the salvage checkbox is the only split)
- Solatium, interest on compensation, shifting charges, resettlement grants
- Multiple owners, multiple structures, or multiple houses on one case
- Sanitation as a priced item (mentioned in `README.md` step 5; absent from `seedRateItems` / `seedEstimateItems`)

Item 15 (kud / bamboo / thatch) is the only non-masonry “light” partition in the rate list. It is still a construction abstract line, not a crop or tree valuation.

### E. Partial / unused

| Thing | State |
|---|---|
| Structure purpose and submergence dropdowns | Stored and printed. Not used in rates or formulas. |
| Built-up area, plinth area, room count | Stored and printed. Not multiplied by any rate. |
| `documents[]` | Schema only. |
| Photo file upload | URL string or Unsplash default. `multer` unused. |
| Panchanama structural condition | Stored. Not in the formula. |
| YP factor admin screen | Read-only. No create/update route. |
| `calculationVersions[]` | Always empty. `finalValuations.calculationVersion` is set to `1` on insert and never incremented. |

### CONFIRM / INFER / UNKNOWN — section 4

**Confirmed from code:** only CSR-style work-item lines are priced; structure-purpose labels are not; land/trees/crops/wells are absent.

**Inferred:** the 18 items are a sample bill for one Class-B house, not an enforced government catalog, because groups can be added with arbitrary titles and the rate link copies whatever rate row is chosen.

**Unknown:** which additional PWD items a real estimate must contain beyond this seed list.

---

## 5. Land estimation

**There is no land-value formula in the code.**

What exists:

- `properties.surveyNumber` — free text, seed `Gat No. 42/1`
- `properties.village`, `taluka`, `district` — free text
- `properties.laCaseNumber` — free text, seed `15/2008-09`
- `properties.submergenceType` — one of four labels
- PDF label “Cadastral Reference” prints the survey string

Not present:

- Land area field
- Unit (hectare, are, guntha, acre, sq m) for land
- Unit conversion for land
- Land classification that selects a rate (jirayat, bagayat, pot kharaba, etc.)
- Ready-reckoner or village land-rate table
- Location factor, road factor, or government multiplier on land
- Solatium or additional land compensation
- Rounding rules for land, because land is not computed

`builtUpArea` and `plinthArea` are building areas in square metres. They are not land area and are not multiplied by a rate.

### CONFIRM / INFER / UNKNOWN — section 5

**Confirmed:** no land valuation formula.

**Inferred:** gat/survey and LA case number are identifiers for the house file, because they are printed beside the house valuation and never multiplied.

**Unknown:** whether engineers’ manual files include a land award that this software was supposed to cover. The code does not cover it.

---

## 6. House / building / structure estimation

The payable amount is a **bill of quantities for one structure**, then depreciation, then a salvage deduction. It is not `built-up area × plinth rate`.

### Path

```
INPUTS
  measurement lines (count, L, B, D, type)
  optional volume deductions
  a rate copied from a CSR row (or typed via PUT rate)
      ↓
RATE
  estimateItems.rate  (snapshot at link time, INR per unit)
      ↓
FORMULA
  line net quantity  (section 3)
  line amount = round2(quantity × rate)
  primary cost = sum of line amounts
      ↓
DEPRECIATION
  one YP ratio for the whole primary cost (section 7)
      ↓
ADJUSTMENTS
  salvage subset summed, depreciated with the same YP ratio,
  then a percentage (default 10) subtracted from the primary depreciated value
      ↓
FINAL VALUE
  finalValuations.finalValuationAmount
```

### Where each input comes from

| Input | Source |
|---|---|
| Dimensions | User, or seed for case `case-jigaon-165` |
| Work-item choice | Seed titles, or user-typed group title |
| Rate | `rateItems` row copied onto the estimate item; ADMIN can change the master later without automatically changing already copied rates |
| Age | `valuationDate` year minus `structures.yearOfConstruction` inside `calculateCaseDepreciation` |
| Total life | `structures.totalUsefulLife`, default 45 if structure missing |
| YP factors | `depreciationFactors` where `scheduleType === 'GOV_YP_7PCT'` and `year` equals future life or total life |
| Salvage set | `estimateItems.isSalvageEligible` |
| Adjustment % | argument to `calculateCaseSalvageAndFinal`, otherwise the literal `10.0` |

### Seed golden-sample arithmetic (what tests assert)

Tests in `backend/test/measurement_estimate.test.ts` and `depreciation_salvage.test.ts` lock these results for case `case-jigaon-165` after recalculation:

| Stage | Expression in tests | Result |
|---|---|---|
| Primary abstract | sum of `roundMoney(qty × rate)` then `Math.round` of that sum | 261669 |
| Primary depreciated | `Math.round( 261669 × 13.394 / 13.606 )` | 257592 |
| Salvage abstract | sum of 6 flagged items, then `Math.round` | 192040 |
| Salvage depreciated | `Math.round( 192040 × 13.394 / 13.606 )` | 189048 |
| 10% deduction | `roundMoney(189048 × 0.10)` | 18904.80 |
| Net | `roundMoney(257592 - 18904.80)` | 238687.20 |

Words produced by `numberToIndianWords(238687.20)`:

`Rupees Two Lakh Thirty-Eight Thousand Six Hundred Eighty-Seven and Paise Twenty Only`

### Seed file inconsistency (confirmed)

`seedSalvageEstimate.salvageDepreciatedValue` is `183981` and `adjustmentAmount` is `18398.10` (10% of 183981).  
`seedFinalValuation.salvageDepreciatedValue` is `189048`, adjustment `18904.80`, net `238687.20`.  
The live function overwrites both records to the test values (189048 / 18904.80 / 238687.20) the first time salvage or final valuation or PDF is generated. `README.md` matches the test values, not the stale salvage-seed depreciated figure.

### CONFIRM / INFER / UNKNOWN — section 6

**Confirmed:** BOQ × CSR rate, then one YP ratio, then salvage percentage. Areas on the structure form are not the valuation base.

**Inferred:** “Class-B” is descriptive text because no class table selects different rates.

**Unknown:** whether a real WRD estimate prices only these 18 items or a longer CSR bill.

---

## 7. Depreciation

### Method

Not straight-line. Not a percent-per-year of age. Not a slab of condition.

It is a **Year’s Purchase ratio** using a stored factor table tagged `GOV_YP_7PCT`:

```
presentLife  = max(0, valuationYear - yearOfConstruction)
totalLife    = structure.totalUsefulLife or 45
futureLife   = max(0, totalLife - presentLife)

futureYp = factor where year == futureLife and scheduleType == GOV_YP_7PCT
totalYp  = factor where year == totalLife   and scheduleType == GOV_YP_7PCT

if no row: futureYp = 13.394 and totalYp = 13.606   (hardcoded fallback)

presentCost        = Math.round( sum of roundMoney(qty × rate) )     // whole rupees
depreciatedValue   = Math.round( round2( presentCost × futureYp / totalYp ) )
depreciationFactor = round( futureYp / totalYp , 7 decimal places )
```

`calculateDepreciatedValue` divides and then rounds half-up to 2 decimal places. The depreciation controller then `Math.round`s that result to a whole rupee. If `totalYp` is 0, the helper returns the cost unchanged. The fallback 13.606 prevents that unless a stored factor is literally 0.

The same ratio is applied to the salvage abstract total (also `Math.round`ed to a rupee before the ratio).

Interest rate `7` is a column on each factor row. **The engine does not recompute factors from 7%.** It reads `factor`. Changing `interestRate` without changing `factor` would not change valuation. There is no API to edit factors.

### Table coverage (`seedYpFactors`)

Years present: 1–10, 15, 20, 25, 30, 35, 40, 41, 42, 43, 44, 45, 50, 60, 80, 100.  
All `interestRate: 7`, `scheduleType: 'GOV_YP_7PCT'`.

Examples stored: year 41 → 13.394; year 45 → 13.606; year 1 → 0.935; year 100 → 14.269.

Missing years (11–14, 16–19, 21–24, …, 46–49, 51–59, 61–79, 81–99, and **year 0**) use the fallback **13.394 / 13.606**, which are the 41-year and 45-year factors, not a computed value for the missing year.

### Which assets

One ratio for the **entire primary abstract**. The same ratio again for the **sum of salvage-flagged lines**. No per-material depreciation rate. No different life by teak vs brick vs CGI. Roof/wall type does not select a life. Useful life is one number on the structure (default 45).

### Edge cases

| Situation | Code behavior |
|---|---|
| Age 0 (valuation year = construction year) | `presentLife = 0`, `futureLife = totalLife`. Year **0 is not in the table**, so future YP falls back to **13.394** even if total life is 45 (factor 13.606). A new building is therefore depreciated with the 41-year factor unless total life is also missing and both fallbacks match. |
| Very old (present life &gt; total life) | On the depreciation calculator, `futureLife = max(0, totalLife - presentLife) = 0`, then year-0 fallback **13.394** is used, so residual value is not zero. |
| Structure save if computed future life &lt; 0 | `updateStructure` returns 400 `INVALID_LIFE` when the **submitted** future life is negative. The depreciation function itself clamps with `Math.max(0, …)` and does not 400. |
| Missing structure | Year of construction defaults to **2012**, total life **45**. |
| Missing valuation date | Valuation year defaults to **2016**. |
| Future construction year | Structure **save** rejects year &gt; current calendar year. Depreciation calculator does not re-check that. If valuation year &lt; construction year, present life becomes 0 (`Math.max`). |
| Missing YP row | Fallback 13.394 and 13.606. |
| Total YP factor 0 | Depreciated value returned as the cost (no division). |
| `presentEstimatedCost` 0 | Depreciated value 0. The depreciation **screen** then divides loss by present cost (`depreciationLoss / presentEstimatedCost`) and can show `Infinity` / `NaN` in the loss percent. The API still returns numbers. |
| Negative rates or quantities | No rejection. Net quantity is clamped at 0. Negative rates would produce negative amounts. |
| Maximum depreciation cap | None, other than the YP ratio and the year-0 fallback behavior above. |
| Minimum residual | None as a named rule. Residual is whatever the ratio yields. |
| Condition (good/dilapidated) | Not an input to this formula. |

Depreciation does **not** read `structures.presentLife` or `structures.futureLife`. Those fields can disagree with the depreciation row if they were stored from a different rule (structure save uses “current year” when present life is omitted; depreciation uses the valuation date’s year).

### Where it is stored

- Factors: `depreciationFactors` in `db.json` / `seedYpFactors`. Not editable in UI.
- Result: `depreciationCalculations` (one row per case, overwritten on every depreciation, salvage, or PDF call).

### CONFIRM / INFER / UNKNOWN — section 7

**Confirmed:** YP ratio formula, fallback constants, table years, whole-rupee `Math.round` on this path, salvage uses the same factors, no per-item depreciation.

**Inferred:** the fallback constants were copied from the golden sample (41 and 45), because those exact numbers appear as both the sample factors and the missing-year defaults.

**Unknown:** the official circular’s factor for years missing from this table, and whether age 0 should use YP(total)/YP(total) = 1.

---

## 8. Rates and government values

| Value | Classification | Where | How it changes |
|---|---|---|---|
| 18 CSR item rates | Database seed, editable | `rateItems` | ADMIN UI or `POST/PUT /api/v1/rates`. Does not rewrite existing estimate snapshots until link or manual item update. |
| Rate schedule header | Database seed | one row `sched-pwd-2014`, year `2014-15`, effective 2014-04-01 to 2015-03-31 | No update API. `effectiveFrom` / `effectiveTo` are **not** consulted when listing or applying rates. |
| New rate defaults | Hardcoded if omitted | `createRateItem`: schedule `sched-pwd-2014`, department `PWD`, year `2014-15` | Code change or pass fields in the body. |
| YP factors | Database seed, read-only | `depreciationFactors` | Code/seed/db.json edit. No admin write UI. |
| Missing-year YP | Hardcoded | `13.394` and `13.606` in `depreciationController.ts` | Code change. |
| Salvage default percent | Hardcoded | `10.0` in `calculateCaseSalvageAndFinal` when override is omitted | Code change. Slider can send 0–25 but GET resets to 10 (section 3). |
| Structure defaults on new case | Hardcoded | `createCase` | Code change. |
| Life default 45 | Hardcoded fallback | create case, depreciation if structure missing, frontend initial state | Code change. |
| Submergence and structure-purpose lists | Hardcoded in JSX | property and structure steps | Code change. |
| Panchanama default witnesses | Hardcoded | `panchanamaController.ts` | Code change. |
| Report money on step 10 screen and JSON export | Hardcoded literals | `PdfReportStep.tsx` | Code change. Server PDF uses live numbers. |
| Sq ft display factor | Hardcoded | `10.7639` in the PDF only | Display only. |
| Valuation year fallback 2016 and construction year fallback 2012 | Hardcoded | depreciation controller and structure step initial fallback | Code change. |

No rate version id is stored on the estimate line beyond the text `rateReference`. No effective-date selection at valuation time. No village-specific or asset-class-specific rate tables. `getRates` can filter by `scheduleYear`, `department`, `unit`, and text `q`. It does not filter `isActive`.

Updating a government rate in this system means an ADMIN edit (or a JSON/code edit), then a user re-link or item update, then a recalculation. It does not require a schema migration. A change to the YP **numbers** or the 10% default or the missing-year fallback requires editing seed/JSON or source code. There is no rate-publish workflow.

### CONFIRM / INFER / UNKNOWN — section 8

**Confirmed:** CSR rates are stored rows with an ADMIN write path; YP table is stored but not writable via API; several valuation constants are literals in controllers and in the step-10 screen.

**Inferred:** “CSR 2014-15” is a label plus these 18 numbers. The code does not show a full PWD schedule.

**Unknown:** whether these 18 rates match the department’s actual CSR pages. The `referenceSource` strings (page numbers) are data, not verified here.

---

## 9. Calculation engine

There is no separate calculation service. The engine is the controllers plus `DecimalMath`.

```
Measurement POST/PUT/DELETE
  -> calculateGrossQuantity
  -> deductions (always volume)
  -> net = max(0, gross - deductions)
  -> group total
  -> if estimate row exists: amount = round2(qty × rate)
  -> db.save() on the write routes

GET estimate
  -> recompute amounts for display only (no save)

POST estimate/recalculate
  -> refresh qty from groups
  -> amounts and grand total
  -> if depreciation row exists, overwrite its cost and depreciated value with round2 (not Math.round)
  -> save

GET or POST depreciation
  -> sum round2(qty × rate), then Math.round to rupees
  -> YP lookup
  -> Math.round(round2(cost × ratio))
  -> save depreciation row

GET salvage, GET final-valuation, PDF, POST salvage/update
  -> calculateCaseDepreciation (save)
  -> sum salvage-flagged items, Math.round
  -> same YP ratio, Math.round
  -> adjustment = round2(salvageDepreciated × percent/100)
  -> final = round2(primaryDepreciated - adjustment)
  -> save salvage + final valuation
  -> PDF also builds words and draws pages
```

### Formula card

| Formula | Inputs | Source | Location | Output unit | Rounding |
|---|---|---|---|---|---|
| Gross volume | n, L, B, D | measurement line | `decimal.ts` `VOLUME` | same as line unit string; seed uses Cum | later round 2 d.p. half up |
| Gross area | n, L, and depth-or-breadth | measurement line | `decimal.ts` `AREA` | Sqm in seed | round 2 |
| Gross length | n, L | measurement line | `RUNNING_LENGTH` | Rmt in seed | round 2 |
| Gross count | n | measurement line | `COUNT` | No. in seed | round 2 |
| Deduction qty | n, L, B, D as volume | deduction row | `measurementController.ts` | parent unit string copied | round 2 each, then sum round 2 |
| Net qty | gross − deductions, floor 0 | computed | same | group unit | round 2 |
| Line amount | qty × rate | estimate row | `DecimalMath.roundMoney` | INR | 2 d.p. half up |
| Abstract total | sum of line amounts | estimate items | `getEstimate` / `recalculateEstimate` | INR | 2 d.p. |
| Present cost for YP | abstract total | estimate items | `calculateCaseDepreciation` | INR | **whole rupee** via `Math.round` |
| YP ratio | future factor / total factor | factor table or fallback | `depreciationController.ts` | ratio | stored to 7 d.p. |
| Depreciated value | present cost × ratio | above | `calculateDepreciatedValue` then `Math.round` | INR | 2 d.p. then whole rupee |
| Salvage total | sum of flagged line amounts | `isSalvageEligible` | `salvageController.ts` | INR | whole rupee `Math.round` |
| Salvage depreciated | salvage total × same ratio | YP factors from primary calc | same | INR | whole rupee |
| Adjustment | salvage depreciated × percent / 100 | percent argument or 10 | same | INR | 2 d.p. half up |
| Net payable | primary depreciated − adjustment | above | same | INR | 2 d.p. half up |
| Words | net payable | `numberToIndianWords` | salvage controller | English string | uses `toFixed(2)` then integer/paise split |

`Decimal.set({ precision: 20, rounding: ROUND_HALF_UP })` is global for Decimal.js in this process.

`numberToIndianWords` handles crore, lakh, thousand, hundred, and paise. Crore and lakh use `convertTens`, which only names numbers below 100. A crore count above 99 would not be fully named. Not hit by the sample.

### Dependency tree

```
valuationDate (case) ─────────────────────┐
yearOfConstruction (structure) ───────────┼─ presentLife, futureLife
totalUsefulLife (structure) ──────────────┘
                                              │
measurement lines ─ net qty ─ estimate.qty ─┤
rate snapshot ─ estimate.rate ──────────────┼─ primary cost ─ × YP ratio ─ primary depreciated ─┐
                                              │                                                    │
isSalvageEligible ──────────────────────────┼─ salvage cost ─ × same ratio ─ salvage depreciated ┤
                                              │                         × adjustment % ───────────┴─ net payable
depreciationFactors[year] ─ or 13.394/13.606 ┘
```

Built-up area, plinth, rooms, submergence, structure purpose, and panchanama do not enter this tree.

### Client vs server

Money totals that affect the stored award are computed on the server. The browser computes present/future life for display before save, and it explains formulas using numbers the server already stored. Step 10’s on-screen award and the JSON download do not call the calculation engine.

### CONFIRM / INFER / UNKNOWN — section 9

**Confirmed:** formulas, locations, rounding split between `roundMoney` and `Math.round`, and the dependency tree above.

**Inferred:** two depreciation writers (`recalculateEstimate` vs `calculateCaseDepreciation`) can leave different `depreciatedValue` scales (paise vs rupee) until the depreciation endpoint runs.

**Unknown:** which rounding (whole rupee vs paisa) the manual sheets use at each subtotal. Tests lock whole rupees for the sample’s depreciated values.

---

## 10. End-to-end example (only steps the code supports)

**Seeded case (the only case that already contains a full bill)**

1. User logs in. Any of the seeded roles that can authenticate. `POST /api/v1/auth/login`.
2. Opens `/cases`. `GET /api/v1/cases`. Sees `CASE/2008-09/165`, owner Mohan Vishwanath Gai, village Dadulgaon, status `APPROVED`, formatted final amount from `finalValuations`.
3. Opens `/cases/case-jigaon-165`. `GET /api/v1/cases/case-jigaon-165`. Wizard starts at step 2. Property and structure are the seed rows (house 165, gat 42/1, LA `15/2008-09`, year 2012, life 45/4/41, built-up 73.01, plinth 80.50).
4. Step 4. `GET .../measurements`. Eighteen groups. Item 5 net 7.94 Cum after D1–W2. No new input required.
5. Step 5. `GET .../estimate`. Eighteen lines. Displayed grand total recomputed as sum of qty × rate (tests: 261669 after rounding the sum to a rupee). User may toggle salvage flags or re-link a CSR row.
6. Step 6. `GET .../depreciation` **saves** present cost 261669, factors 13.394 and 13.606, depreciated 257592.
7. Step 7. `GET .../salvage` **saves** six items, salvage 192040, depreciated salvage 189048, adjustment 10% = 18904.80, and also writes the final row.
8. Step 8. `GET .../final-valuation` recomputes the same net **238687.20** and the words in section 6. Slider movement is not durable (section 3).
9. Step 9. `GET .../panchanama` may insert default panchas and Unsplash photos if those arrays were empty. Remarks do not change 238687.20.
10. Step 10 screen still **prints the hardcoded** 238687.20 even if earlier steps changed rates. `GET .../report/download` rebuilds the PDF from current rows (and again forces 10% salvage).

**New case (what the code will do, not the sample)**

1. `POST /api/v1/cases` creates case `DRAFT`, property, and a default structure. No bill of quantities.
2. Property save moves status to `MEASUREMENT_IN_PROGRESS`.
3. User adds groups and lines. Quantities calculate. Abstract stays empty until an estimate row exists.
4. Depreciation GET on an empty bill yields present cost 0, age from valuation year and the default or saved construction year, and depreciated value 0, and still writes a depreciation row.
5. Salvage/final GET writes a final valuation of 0 (or whatever lines exist) with status `APPROVED` on that **final valuation record**, while the case status can still be `MEASUREMENT_IN_PROGRESS`.

### CONFIRM / INFER / UNKNOWN — section 10

**Confirmed:** seeded journey and the create-case defaults.

**Inferred:** new-case rate linking gap, from the UI call graph in section 3.

**Unknown:** none beyond that inference; behavior was read from controllers, not run live.

---

## 11. Database / data model

Storage is one JSON document with arrays, not tables. Relationships are string ids. There are no foreign-key constraints. Deletes do not cascade (deleting a measurement group leaves its estimate item).

| Entity | Array | Important fields | Relationships | Created | Updated | Consumed by |
|---|---|---|---|---|---|---|
| User | `users` | id, email, name, role, department, designation, passwordHash, isActive | none | seed, register, ensureSuperAdmin | not updated after create except delete | login, audit actor |
| Project | `projects` | id, code, name, department, division, subDivision, district, taluka, status | cases.projectId | seed or ADMIN POST | no update route | case create, dashboard, PDF header |
| ValuationCase | `cases` | id, caseNumber, projectId, status, dateOfInspection, valuationDate, preparedBy, checkedBy, approvedBy, createdBy | 1 project; 1 property; 1 structure | POST /cases | property save may change status; PUT status | every later step |
| PropertyDetails | `properties` | owner, village, taluka, district, houseNumber, surveyNumber, laCaseNumber, submergenceType, contact, address, notes | caseId | with case | PUT property | reports, search |
| StructureDetails | `structures` | type, construction, years, roof/wall/floor, rooms, builtUpArea, plinthArea | caseId | with case | PUT structure | depreciation reads year and total life; PDF reads text and areas |
| MeasurementGroup | `measurementGroups` | itemNumber, title, unit, totalQuantity, rateItemId, items[] | caseId; optional rateItemId | seed or POST group | measurement writes | estimate recalc |
| MeasurementItem | nested in group | calc type, n, L, B, D, gross, deduction, net, deductions[] | groupId, caseId | POST item | recalc | group total |
| MeasurementDeduction | nested | code, n, L, B, D, deductionQuantity | measurementItemId | POST deduction | recalc | net qty |
| RateSchedule | `rateSchedules` | name, year, effectiveFrom/To, isActive | rateItems.scheduleId | seed only | none | displayed; not filtered by date |
| RateItem | `rateItems` | itemCode, description, unit, rate, scheduleYear, referenceSource, isActive | scheduleId | seed or ADMIN POST | ADMIN PUT | copied onto estimate items |
| EstimateItem | `estimateItems` | itemNumber, qty, unit, rate, amount, rateReference, isSalvageEligible, measurementGroupId | caseId | seed or link-rate | recalc, PUT item | abstract, depreciation, salvage, PDF |
| DepreciationFactor | `depreciationFactors` | year, interestRate, factor, scheduleType | none | seed | none | depreciation lookup |
| DepreciationCalculation | `depreciationCalculations` | costs, years, both YP factors, ratio, depreciatedValue, formulaText | caseId | first depreciation/salvage/PDF | every such call overwrites | salvage, PDF, case GET |
| SalvageEstimate | `salvageEstimates` | selectedItemIds, totals, lives, factors, adjustment | caseId | first salvage/final/PDF | every such call | final, PDF |
| FinalValuation | `finalValuations` | primary, depreciated, salvage, adjustment, finalValuationAmount, calculationVersion, status | caseId | first salvage/final/PDF; status set `APPROVED` on insert | amounts overwritten; version stays 1; status not updated on later saves | dashboard, project sums, case list, PDF |
| PanchanamaDetails | `panchanamaRecords` | date, officers, panchas, remarks, structuralCondition | caseId | GET panchanama if missing | POST panchanama | PDF page 4 |
| EvidencePhoto | `evidencePhotos` | title, category, description, photoUrl | caseId | GET for seed case, or POST photo | delete by id | PDF page 5 uses up to 4; image file path is a local assets path, not photoUrl |
| AuditLog | `auditLogs` | user, action, entity, old/new JSON, timestamp | optional caseId | case create, property, structure, status, project create, register; plus 4 seed logs | never updated | audit screen, embedded on case GET |
| DocumentRecord | `documents` | file metadata | caseId | never | never | case GET returns `[]` |
| CalculationVersion | `calculationVersions` | snapshotJson, versionNumber, totals | caseId | never | never | unused |

Case status values the **backend type** allows:  
`DRAFT`, `MEASUREMENT_IN_PROGRESS`, `ESTIMATE_IN_PROGRESS`, `DEPRECIATION_IN_PROGRESS`, `SALVAGE_IN_PROGRESS`, `REVIEW`, `APPROVED`, `COMPLETED`, `ARCHIVED`.

Only `DRAFT` (on create) and `MEASUREMENT_IN_PROGRESS` (on first property save from draft) are set by application logic. The seed case is `APPROVED`. Other statuses exist only if something calls `PUT .../status`. The frontend `CaseStatus` type is a **different set**: `DRAFT | CALCULATED | CHECKED | APPROVED | REJECTED`. The list filter uses the backend names.

```
Project 1---* ValuationCase 1---1 PropertyDetails
                          1---1 StructureDetails
                          1---* MeasurementGroup 1---* MeasurementItem 1---* Deduction
                          1---* EstimateItem *---0..1 RateItem
                          1---0..1 DepreciationCalculation
                          1---0..1 SalvageEstimate
                          1---0..1 FinalValuation
                          1---0..1 Panchanama
                          1---* EvidencePhoto
                          1---* AuditLog
RateSchedule 1---* RateItem
DepreciationFactor (global, not per case)
User (global)
```

### CONFIRM / INFER / UNKNOWN — section 11

**Confirmed:** entities and write paths above. No land, tree, crop, well, or owner-share tables.

**Inferred:** one case is intended to be one house, because create always inserts exactly one property and one structure.

**Unknown:** whether a real file has multiple structures or co-owners that would need more than these arrays.

---

## 12. API workflow

Base path `/api/v1`. Auth column: JWT means any logged-in role.

| Step | API | Method | Purpose | Request | Response | DB operation |
|---|---|---|---|---|---|---|
| Health | `/api/health` | GET | liveness | none | status JSON | none |
| Login | `/auth/login` | POST | session | email, password | token, user | read users; may insert super-admin |
| Register | `/auth/register` | POST | create officer | name, email, password, role, designation, department | token, user | insert user + audit |
| Users | `/auth/users` | GET | list officers | none | users without hash | read |
| Users | `/auth/users/:id` | DELETE | remove officer | none | message | delete user |
| Me | `/auth/me` | GET | current user | JWT | user | read |
| Dashboard | `/dashboard/stats` | GET | counts | JWT | stats, recentCases | read |
| Projects | `/projects` | GET | list + sums | JWT | projects | read cases and finals |
| Project | `/projects/:id` | GET | one project + cases | JWT | project, cases | read |
| Project | `/projects` | POST | create | JWT + ADMIN | project | insert + audit |
| Cases | `/cases` | GET | list/search | query projectId, status, search | cases with property, structure, final | read |
| Case | `/cases/:id` | GET | full bundle | id | case, project, property, structure, groups, estimates, dep, salvage, final, documents, audits | read; does not compute |
| Case | `/cases` | POST | create | projectId, caseNumber, ownerName, optional location and dates | case, property, structure | insert 3 + audit |
| Property | `/cases/:id/property` | PUT | save property | body overlay | property | update; maybe status; audit |
| Structure | `/cases/:id/structure` | PUT | save structure | structure fields | structure | update + audit |
| Status | `/cases/:id/status` | PUT | set any status string | `{status}` | case | update + audit; **no UI caller** |
| Measurements | `/cases/:id/measurements` | GET | list and recompute in memory | id | groups | memory recalc, **no save** |
| Group | `/cases/:id/measurements/groups` | POST | add group | title, unit | group | insert |
| Group | `/cases/measurements/groups/:groupId` | DELETE | delete group | id | group | delete group only |
| Line | `/cases/:id/measurements/items` | POST | add line | dimensions | item, groupTotal | insert + recalc + save |
| Line | `/cases/measurements/items/:itemId` | PUT | edit line | dimensions | item | update + recalc + save; **no UI caller** |
| Line | `/cases/measurements/items/:itemId` | DELETE | delete line | id | groupTotal | delete + recalc + save |
| Deduction | `/cases/measurements/items/:itemId/deductions` | POST | add opening | code, dimensions | deduction, nets | insert + recalc + save |
| Deduction | `/cases/measurements/deductions/:deductionId` | DELETE | remove opening | id | nets | delete + recalc + save |
| Estimate | `/cases/:id/estimate` | GET | abstract | id | items, grandTotal | read; recompute response only |
| Estimate | `/cases/:id/estimate/recalculate` | POST | sync qty and amounts | id | items, grandTotal | update items and maybe depreciation; save |
| Estimate item | `/cases/estimate/items/:itemId` | PUT | rate, description, salvage flag | partial | item | update + save; no grand-total refresh |
| Link rate | `/cases/measurements/groups/:groupId/link-rate` | POST | copy CSR onto estimate | rateItemId | group, estimateItem | update/insert estimate; save |
| Rates | `/rates` | GET | search CSR | q, scheduleYear, department, unit | rates | read |
| Schedules | `/rates/schedules` | GET | schedule headers | none | schedules | read |
| Rates | `/rates` | POST | add rate | ADMIN | rate | insert |
| Rates | `/rates/:id` | PUT | edit rate | ADMIN | rate | update; does not retouch estimates |
| Depreciation | `/cases/:id/depreciation` | GET | compute and return | id | calculation | **upsert + save** |
| Depreciation | `/cases/:id/depreciation/calculate` | POST | same function | id | calculation | **upsert + save** |
| YP table | `/cases/rates/yp-factors` | GET | list factors | JWT | factors sorted by year | read |
| Salvage | `/cases/:id/salvage` | GET | compute salvage and final at 10% | id | salvage, final, items | **upsert + save** |
| Salvage | `/cases/:id/salvage/update` | POST | set % and/or selected ids | adjustmentPercentage?, selectedItemIds? | same | **upsert + save** |
| Final | `/cases/:id/final-valuation` | GET | summary + words at 10% | id | summary, words | **upsert + save (resets % to 10)** |
| Panchanama | `/cases/:id/panchanama` | GET | get or create defaults | id | panchanama, photos | may insert defaults + save |
| Panchanama | `/cases/:id/panchanama` | POST | patch remarks/panchas | partial | panchanama | update + save |
| Photo | `/cases/:id/panchanama/photos` | POST | add URL photo | title, category, description, photoUrl | photo | insert |
| Photo | `/cases/panchanama/photos/:photoId` | DELETE | remove photo | id | photo | delete |
| PDF | `/cases/:id/report/download` | GET | 5-page PDF | JWT | application/pdf | recalculates dep + salvage (10%) and saves |
| Audit | `/audit` | GET | all logs newest first | JWT | logs | read |

### Repeated and overlapping calls (existing behavior)

- Case wizard load and every step do not share a calculation cache. Each step issues its own GET.
- `GET depreciation`, `GET salvage`, `GET final-valuation`, and `GET PDF` all call `calculateCaseDepreciation`, which writes the database.
- `GET salvage` and `GET final-valuation` both call `calculateCaseSalvageAndFinal`. Step 7 calls estimate GET **and** salvage GET. Step 8 calls final GET, and the slider calls salvage POST **then** final GET.
- `POST depreciation/calculate` and `GET depreciation` are the same function. The Recalculate button does not take new inputs.
- YP factors are fetched on the depreciation step and again on `/depreciation-factors`.
- Rates are fetched in full when opening the rate modal and again on the rate admin page.
- `GET /cases/:id` already returns estimate items, depreciation, and salvage **without** recalculating. Later steps ignore that payload and recalculate via their own routes.
- Abstract grand total is computed in `getEstimate`, again in `recalculateEstimate`, again inside depreciation, and again inside salvage.
- No Excel route. JSON “export” is client-side and hardcoded.

### CONFIRM / INFER / UNKNOWN — section 12

**Confirmed:** route table and the write-on-GET behavior.

**Inferred:** the duplicate GETs are a consequence of each step owning its own `useEffect`, not a shared store.

**Unknown:** none material for the route list; the files were read directly.

---

## 13. Frontend workflow

| Route | Screen | Role gate |
|---|---|---|
| `/login` | Login | public; redirects to dashboard if token exists |
| `/register` | Open officer registration | public |
| `/super-admin/login` | Separate login view | public route, not wrapped in `PublicRoute` |
| `/super-admin/users` | Create/delete users | any logged-in user, not only admin |
| `/dashboard` | Counts, recent cases | logged in |
| `/projects` | Project cards; create if admin | logged in |
| `/cases` | Search, status filter, new-case modal | logged in |
| `/cases/:id` | 10-step wizard | logged in |
| `/rates` | CSR table; edit if admin | logged in |
| `/depreciation-factors` | Read-only YP table | logged in |
| `/audit-logs` | Audit table | logged in |

Wizard navigation: any step button works. “Completed” styling means “step number &lt; current”, not “data saved”.

| Step | Save behavior | Edit | Delete |
|---|---|---|---|
| 1 | none (already created) | no | no |
| 2 | explicit Save Draft or Save & Continue | all property fields | no |
| 3 | explicit save | structure fields; life is derived | no |
| 4 | each add/delete is immediate POST/DELETE | cannot edit existing dimensions in UI | lines and deductions |
| 5 | salvage toggle and rate link save immediately; Recalculate is explicit | rate and salvage flag | no item delete in UI |
| 6 | GET already persists; Recalculate repeats it | no inputs | no |
| 7 | checkbox POST immediately | salvage selection | no |
| 8 | slider POST immediately (then a GET resets stored %) | adjustment 0–25 | no |
| 9 | panchas/photos immediate; remarks need Save | remarks, condition, date | panchas and photos |
| 10 | Edit Notes is local only | preview text | no |

No autosave timer. No server draft distinct from “whatever is in the JSON”. Leaving a step without Save on steps 2–3 drops unsaved form state (parent still holds the last fetched property/structure).

Dropdowns that exist: project, submergence, structure purpose, measurement calc type, measurement unit (free text with default Cum), photo category, rate search list, case status filter, role on register.

Auto-populated: case number pattern, village/taluka/district defaults in the **create** modal, structure defaults from the server after create, life years from valuation date, panchanama defaults from the server, step-10 certificate sentence from property fields with Dadulgaon/Mohan fallbacks if property is missing.

### CONFIRM / INFER / UNKNOWN — section 13

**Confirmed:** routes, save timing, and local-only report edits.

**Inferred:** users can open step 10 without completing measurements, because the stepper does not check completeness.

**Unknown:** whether super-admin login is meant to be a different security boundary. It still posts to the same `/auth/login`.

---

## 14. Validation and error handling

| What | Where | Message / result | Can bad data be stored? |
|---|---|---|---|
| Login email and password present | backend | 400 VALIDATION_ERROR | no |
| Bad password | backend | 401 | no |
| Register name, email, password, role | backend | 400 | no |
| Duplicate email | backend | 409 | no |
| Role value is a real enum | neither | any string is cast to `UserRole` | yes |
| Project code, name, department | backend create | 400 | no |
| Duplicate project code | backend | 400 | no |
| Case projectId, caseNumber, ownerName | backend | 400 | no |
| Duplicate case number | backend, case-insensitive | 400 | no |
| House number on create | frontend modal only | HTML `required` | backend stores `''` if bypassed |
| Owner and house on property step | frontend only | inline error, no request | API accepts empty if called directly |
| Property body shape | backend | none; object spread | extra or wrong types can be stored |
| Construction year in the future | frontend and backend on structure save | `INVALID_YEAR` | rejected on that route |
| Future life negative on structure save | both | `INVALID_LIFE` | rejected |
| Zero built-up / rooms | backend `Number(x) \|\| old` | silently keeps previous | zero not stored |
| Measurement title and unit | backend | 400 if missing | no |
| Measurement numbers | `Number(x) \|\| 0` or `\|\| 1` for count | no range check | negatives stored; net clamped to 0 |
| Existing line edit | API only | no range check | yes |
| Estimate rate | `Number(rate)` | no sign or zero check | negative rate stored |
| Rate create: code, description, unit, rate | backend | 400 | no |
| Rate update | spread body | no | arbitrary fields |
| Case status | backend cast | no enum check | any string |
| Depreciation year missing from table | fallback constants | no error | calculation stored using 13.394/13.606 |
| Divide by zero YP | returns cost | no error | yes |
| Salvage percent | `Number(adjustmentPercentage)` | slider limits 0–25 in UI only | API accepts any number, including negative or &gt; 100 |
| Selected salvage ids | if array passed, **replaces all** eligibility flags | ids not on the case are ignored; items not in the list become ineligible | yes |
| Panchanama | no required fields | defaults inserted | yes |
| Photo URL | default Unsplash if empty | no type check | yes |
| JWT missing/invalid | 401 JSON | frontend interceptor clears token on 401 | n/a |
| 403 | role middleware | “sufficient government clearance” | n/a |
| Not found | 404 on missing case, group, item, rate, photo | | n/a |
| Unhandled throw | 500 SERVER_ERROR with `err.message` | | n/a |

Frontend measurement and salvage failures are mostly `console.error` with no user-visible message.

Precision: Decimal precision 20. Money outputs 2 d.p. half up, except depreciation and salvage **bases** which then pass through `Math.round` (IEEE round-half-away-from-zero toward +∞ for positive .5). No overflow guard. Very large values stay JS numbers (`toNumber()`), so they are not exact integers beyond `Number.MAX_SAFE_INTEGER`.

`GET` handlers that calculate also persist, so a read is not side-effect free.

### CONFIRM / INFER / UNKNOWN — section 14

**Confirmed:** the checks listed are the ones present in the cited functions.

**Inferred:** HTML `required` can be bypassed by calling the API, because the server checks a smaller set.

**Unknown:** none; this is a code inventory, not a penetration test.

---

## 15. Result and report generation

### What the “final estimate” is

`finalValuations.finalValuationAmount` for one case:

```
round2( primaryDepreciatedWholeRupees - round2(salvageDepreciatedWholeRupees × percent/100) )
```

There is no separate land total.

| Aggregate | Exists? | How |
|---|---|---|
| Work-item amount | yes | stored on estimate item and recomputed on read/recalc |
| Structure / case total | yes | `finalValuationAmount` (one structure per case) |
| Owner total | same as the case | one owner string, not a sum across cases |
| Village total | no | village is a filterable string only |
| Project total | yes, on project list | sum of `finalValuationAmount` for cases of that project, whenever a final row exists |
| Dashboard grand total | yes | sum of **every** final valuation row |
| “Sanctioned” dashboard figure | the same sum | it is not filtered to case status APPROVED |

### Stored vs recalculated

- Estimate line `amount` is stored, and also recomputed on GET estimate (response) and on recalculate (stored).
- Depreciation row is stored and **replaced on every depreciation/salvage/PDF read or calculate**.
- Salvage and final rows are stored and replaced on every salvage GET, final GET, salvage POST, and PDF GET.
- Dashboard and project totals read the stored final amounts. They do not recalculate from measurements.
- Because opening salvage or PDF rewrites the final row, a later dashboard read sees the post-recalc number.
- Nothing is cached in Redis or similar. `calculationVersions` is unused, so old results are not kept.
- Step-10 **screen and JSON file** do not read these rows; they show the golden-sample literals.
- Server PDF reads the values just recalculated in that request (10% adjustment).

### PDF contents (server)

Five A4 pages, footer text “Page n of 5”, division line hardcodes “Jigaon Major Irrigation Project Sub-Division No. 2, Nandura”:

1. Valuation certificate, metadata grid, certification paragraphs (wording fixed in code), net amount, component summary, three signature blocks (SE, AE Gr-I, EE).
2. FC sheet: location, construction text, plinth and built-up in sq m and sq ft, **some construction sentences are fixed strings** (foundation, doors) even if the user changed materials, YP formula box.
3. AB sheet: all estimate items for the case (comment says 18 items fit one page; the loop prints whatever exists, with no page break logic visible in the loop).
4. RA sheet: five recapitulation rows and net, panchanama remarks, panchas, three signatures.
5. Photo sheet: up to four cards. Image embedding uses files under `backend/assets/photos/*.jpg` chosen by **card slot**, not the stored `photoUrl`. If those files are missing, behavior is whatever PDFKit does on a bad path (not separately handled in the lines read).

No Excel. No approval PDF distinct from this certificate. Print uses the browser preview, which does not match the server PDF’s numbers if the case is not the golden sample.

### CONFIRM / INFER / UNKNOWN — section 15

**Confirmed:** formula, storage, rewrite-on-read, hardcoded preview, five PDF sections.

**Inferred:** project “total valuation” includes draft cases once someone has opened salvage or the PDF, because those GETs create an `APPROVED` final-valuation row. The case status itself may still be `DRAFT` or `MEASUREMENT_IN_PROGRESS`.

**Unknown:** whether missing photo asset files are shipped in this clone. The controller points at `backend/assets/photos`, and that directory was not part of the source file list returned by the repository glob of code/json/md.

---

## 16. Auditability and traceability

| Question | What the code does |
|---|---|
| Who created a case? | `cases.createdBy` user id, `preparedBy` name string, audit `CASE_CREATED` with user id and name. |
| Who changed property or structure? | Audit row with user, full old JSON, full new JSON. |
| Who changed measurements, rates on a case, depreciation, or salvage? | **No audit write** in those controllers. |
| When? | `updatedAt` on property, structure, depreciation, salvage, final, panchanama, case. Measurement items have no `updatedAt`. |
| Previous values? | Only where audit `oldValue` was written (property, structure, status). No history for quantities, rates, or amounts. |
| Rate version used? | Free-text `rateReference` on the estimate line (for example `2014-15 Item 72`). Not a foreign key that is frozen against later master edits. The numeric `rate` on the line is a copy until someone updates it. |
| Calculation version? | Field `calculationVersion` set to 1 once. `calculationVersions[]` never appended. `snapshotJson` never written. |
| Approval history? | Seed data contains an audit action `VALUATION_SANCTIONED`. Runtime code never writes that action. No approve button. Final row is inserted already `APPROVED`. |
| Status transitions? | Only draft → measurement-in-progress, plus unvalidated `PUT` status if something calls it. |
| Audit log viewer? | Yes, all rows, any logged-in user. |
| Reproduce an old calculation? | No snapshot. Re-running uses **current** quantities, **current** copied rates, **current** YP table, and the 10% default. |
| IP address | Frontend audit type has `ipAddress`. Backend writer does not set it. |

Seed audit rows (`CASE_INITIALIZED`, `MEASUREMENTS_ENTERED`, `ABSTRACT_CALCULATED`, `VALUATION_SANCTIONED`) are fixture text. They are not produced by the measurement or estimate code paths.

### CONFIRM / INFER / UNKNOWN — section 16

**Confirmed:** audit coverage is partial; calculation history is not stored; final status is preset to APPROVED.

**Inferred:** the four seed audit lines were written to resemble a workflow the running code does not record.

**Unknown:** whether a manual file’s sanction chain (SE / AE / EE dates) is required. The PDF prints those titles every time, without dates or real signatures.

---

## 17. Current workflow diagram

```
[Login JWT]
    |
    v
[Project registry] ---- ADMIN may insert a project
    |
    v
[Create valuation case]
    |  writes Case DRAFT + Property + default Structure
    |  does not write measurements or money
    v
[Property text] --save--> status MEASUREMENT_IN_PROGRESS if it was DRAFT
    |
    v
[Structure text + year + useful life]
    |  built-up / plinth / rooms stored, not priced
    v
[Measurement groups and lines]
    |  VOLUME / AREA / LENGTH / COUNT
    |  deductions only as volume
    |  net qty
    |
    +--(only if an estimate row already exists)--> qty copied onto that row
    |
    v
[Abstract]
    |  amount = qty x snapped CSR rate
    |  grand total
    |
    +-- salvage flag on each line (does not change the abstract total)
    v
[One depreciation for the whole abstract]
    |  age = valuation year - construction year
    |  value = round( cost x YP(future) / YP(total) )
    |  missing YP year -> 13.394 and 13.606
    v
[Salvage subset of the same lines]
    |  same YP ratio
    |  adjustment = 10% unless this POST passed another percent
    v
[Net payable = depreciated abstract - adjustment]
    |  final row stored; status field APPROVED on first insert
    |  case status is NOT set to APPROVED by this step
    v
[Panchanama text + photo URLs]   (no effect on net)
    v
[On-screen certificate]  hardcoded sample rupees + optional local text edits
[Server PDF]             live recompute at 10% salvage, 5 fixed forms

Branches that do not exist:
  land area x land rate
  trees / crops / wells
  per-material depreciation
  checker approval gate
  village rollup
```

Structure-purpose and submergence choices do not branch the calculation. The only money branch is which estimate lines have `isSalvageEligible === true`.

---

## 18. Current system complexity

Classifications: **A** confirmed issue (code contradicts itself or cannot do what its own screens imply), **B** potential issue (likely wrong under conditions visible in code, not executed here), **C** design complexity (how it is built), **D** unknown until domain rules are checked.

| # | Class | Observation |
|---|---|---|
| 1 | A | Step 10 preview and JSON export use fixed golden-sample money. Server PDF uses live data. |
| 2 | A | `GET` salvage and `GET` final-valuation always pass no percentage, and the function then uses `10.0`, after the slider POST. Stored custom percent does not survive those reads. PDF uses the same function. |
| 3 | A | Seed salvage depreciated value `183981` disagrees with seed final valuation `189048` and with the test’s formula. Live recalc overwrites toward the test. |
| 4 | A | `recalculateEstimate` writes depreciated value with `roundMoney` (paise). `calculateCaseDepreciation` then `Math.round`s to a rupee. |
| 5 | A | Missing YP years, including age 0 and future life 0, substitute 13.394 and 13.606. |
| 6 | A | New case has no estimate rows, and the abstract UI links rates only from existing estimate rows. |
| 7 | A | `CHECKER` and `VIEWER` are not restricted. Register and delete-user need no login. |
| 8 | A | Final valuation record is created with status `APPROVED` without a sanction action. Case status is a different field and is not moved to `APPROVED`. |
| 9 | A | Frontend `CaseStatus` union does not match the backend union. |
| 10 | A | PDF page 2 labels YP columns as “41 yrs” and “45 yrs” in the row titles while also printing `dep.futureLife` / `dep.totalLife` in the formula. The row title text is hardcoded to 41 and 45. |
| 11 | A | PDF recapitulation description strings hardcode `YP(41y: 13.394)` and `13.394 ÷ 13.606` even though the numeric cells use the calculated record. |
| 12 | B | `GET /measurements` recalculates in memory and does not `db.save()`, so a later process restart can show pre-recalc quantities if no other save happened. |
| 13 | B | AREA formula ignores breadth when depth is non-zero. Deductions on non-volume items still multiply four dimensions. |
| 14 | B | `Number(builtUpArea) \|\| previous` and `numberCount \|\| 1` treat 0 as empty. |
| 15 | B | Deleting a measurement group does not delete the estimate line, so a stale amount can remain in the abstract. |
| 16 | B | Depreciation screen divides by present cost for a loss percent with no zero check. |
| 17 | B | Panchanama GET inserts Dadulgaon 2016 sample witnesses for every new case. |
| 18 | B | Step 10 image slots look for local jpg files, while the UI stores remote URLs. |
| 19 | C | Ten screens for one house BOQ, with each screen refetching and several of them rewriting totals. |
| 20 | C | Same total is implemented in get-estimate, recalculate, depreciation, and salvage. |
| 21 | C | Life is computed in the browser, again in `updateStructure`, and again in `calculateCaseDepreciation`, with different fallbacks (valuation year vs current year vs 2016/2012). |
| 22 | C | Rates are both a master list and a copied number on the estimate line, with no automatic refresh. |
| 23 | C | JSON file is both seed content and the live database. Loading a non-empty `db.json` replaces memory. |
| 24 | C | Auth, valuation, and PDF share one process and one global `db` object. |
| 25 | D | Whether 10% salvage, 45-year life, and 7% YP are the rules an engineer must apply. |
| 26 | D | Whether land, trees, wells, and solatium are in scope for this office. They are not in this code. |
| 27 | D | Whether the 18 seed rates and quantities are a real sanctioned bill or only a demo. Tests treat them as the benchmark. |

README statements that the code does not implement: sanitation as one of the 18 groups; tamper-evident history of every change; checker/viewer clearance; “exact paisa” on the depreciation path that uses `Math.round`.

---

## 19. Fact vs inference

Each section above ends with Confirmed / Inferred / Unknown. The following points are repeated because they are easy to over-read from the README.

**Confirmed from code**

- This is a single-structure house BOQ valuator with CSR line rates, one YP ratio, and a salvage percentage.
- Land compensation is not calculated.
- The golden sample net the tests assert is ₹ 2,38,687.20 at 10% salvage.
- Roles other than ADMIN-for-rates-and-projects are not enforced.
- Report preview money is hardcoded; PDF money is recalculated.

**Inferred**

- The product name and LA fields suggest a land-acquisition file, while the arithmetic is only the house bill. That is an inference about intent. The arithmetic itself is confirmed.

**Unknown / needs domain validation**

- Official item list, official YP table for every year, official salvage percent, official rounding, and whether land/trees/wells belong in this estimate.

---

## 20. Executive summary

### A. What the platform currently does

A logged-in user can register projects (admin), open valuation cases, type owner and house identity, type structure description and life, enter measurement lines, price those lines from a small PWD CSR 2014-15 list, depreciate the total with a 7% YP factor ratio, subtract a percentage of the depreciated salvage subset, and download a five-page PDF. A seeded Jigaon case demonstrates that path end to end.

### B. Complete current estimation workflow

Login → project → create case → property text → structure life → measurements → abstract (qty × rate) → YP depreciation of that abstract → choose salvage lines → net = depreciated cost − (default 10% × depreciated salvage) → panchanama text → PDF. The wizard does not gate these steps. Several money steps persist as soon as their GET runs.

### C. Supported categories

Priced: the 18 construction items in the seed (earthwork, rubble, concrete, UCR, brickwork, teak roof, plaster, colour wash, sand-faced plaster, CGI, flooring, ballies, GI pipes, MS gate, kud/bamboo, wiring points, teak frames, teak shutters), plus any extra group a user can add if an estimate row is created. Labeled but not priced: residential, commercial/shop, cattle shed, community/religious, compound wall; four submergence labels. Not implemented: land value, trees, crops, wells, bore wells, solatium, multi-structure files.

### D. Major calculation engines

1. Quantity engine in `measurementController.ts` + `DecimalMath.calculateGrossQuantity`.
2. Abstract engine `quantity × rate` in `estimateController.ts`.
3. YP depreciation in `calculateCaseDepreciation`.
4. Salvage and net payable in `calculateCaseSalvageAndFinal`.
5. PDF renderer that calls 3 and 4 again.

### E. Rate and depreciation handling

CSR rates are JSON rows, editable by ADMIN, copied onto estimate lines. YP factors are JSON rows, not editable in the UI, with a hardcoded fallback. Default salvage deduction is the literal 10%. Useful life defaults to 45. None of these are selected by village or by structure-purpose dropdown.

### F. Current API and data flow

React calls `/api/v1` with a JWT. Express mutates a JSON document. Reads of depreciation, salvage, final valuation, and PDF also write. The case GET returns stored children without recalculating. The step-10 page does not read the final-valuation API for its figures.

### G. Current output

Stored case net in `finalValuations`. Project and dashboard sums of those nets. Server PDF (certificate, FC, abstract, recapitulation, photo page). Browser print and a JSON download of the **sample** numbers. No Excel. No separate sanction document.

### H. Limitations discovered

No land estimation. New cases are not given a bill of quantities. Preview/PDF/JSON can disagree. Salvage percent does not stick. YP gaps use the sample’s 41/45 factors. Approval is a label. Audit does not cover the calculation steps. One JSON file is the database.

### I. Questions that must be answered by engineers or documents

1. Is the award only the house BOQ, or must land, trees, wells, crops, and solatium be added?
2. Is the official depreciation exactly `cost × YP(balance life) / YP(total life)` at 7%, and what is the factor for every year from 0 through the maximum life?
3. Is total life always 45, or does it vary by class (mud, brick, RCC, CGI, teak)?
4. Is the salvage deduction 10% of depreciated salvage, and is the salvage set fixed (teak, CGI, pipes, gates, shutters) or chosen on site?
5. Which CSR year and which circle’s rates apply, and are the 18 seed rates the real schedule lines?
6. What rounding is required at quantity, item amount, depreciated value, and net (paisa vs whole rupee)?
7. What is the real sanction path (who prepares, checks, approves, and can a draft be edited after sanction)?
8. Are door/window deduction sizes standardized, and are deductions volume-only?
9. Does one LA case contain one house or many assets and many owners?
10. Are panchanama photos and panch signatures legally part of the estimate or only an annexure?

### J. Do not change until domain rules are verified

- The YP ratio and the factor table.
- The 10% salvage step and which items are salvageable.
- The 18-item bill and the CSR rates.
- Quantity formulas, especially AREA and deductions.
- Whole-rupee rounding on depreciated values.
- The meaning of case status versus final-valuation status.
- Any assumption that land value is “missing and should be area × rate” — that formula is not in this system, and it must not be invented from this code.

---

## 21. Master table

| Workflow stage | Current system behavior | User input | Automated calculation | Data source | API / service | Database entity | Output | Issues / unknowns |
|---|---|---|---|---|---|---|---|---|
| Sign-in | JWT 24h; one hardcoded admin bypass; open registration | email, password | none | `users` or bypass | `POST /auth/login` | `users` | token | Register and user delete are public. CHECKER/VIEWER not enforced. |
| Project | List projects; ADMIN can add one | code, name, department, division, place | case count; sum of stored final amounts | `projects`, `finalValuations` | `GET/POST /projects` | `projects` | project card | Sum includes any case that already has a final row. No project edit/archive API. |
| Create case | One case, one property, one default structure; status DRAFT | project, case no., owner, house, village, dates, gat, LA no. | defaults: submergence full; life 45; year = now−4; areas 60 / 68 | body + `createCase` literals | `POST /cases` | `cases`, `properties`, `structures` | case id | No measurement or estimate rows. Dates not editable later. |
| Property | Form save; draft becomes MEASUREMENT_IN_PROGRESS | owner, contact, address, village, house, gat, LA no., submergence label, notes | none | form | `PUT /cases/:id/property` | `properties`, `cases.status` | saved property | Submergence does not affect money. Backend does not require house number. |
| Structure | Form save | purpose label, construction text, year, useful life, areas, rooms, roof/wall/floor | browser: age from valuation year; server stores sent ages | form + case.valuationDate | `PUT /cases/:id/structure` | `structures` | saved structure | Areas and purpose are not priced. Year &gt; current year rejected. 0 area kept as old value. |
| Measurements | Groups and lines; seed case has 18 groups | title, unit, n, L, B, D, type; deduction n, L, B, D | gross by type; deductions always volume; net = max(0, gross−ded) rounded 2 d.p. | user or seed | `GET/POST/DELETE` measurement routes; PUT exists unused in UI | `measurementGroups` | group totalQuantity | New case starts empty. Cannot edit a line in UI. AREA ignores breadth if depth set. GET recalc may not save. |
| Rates | 18 CSR rows, ADMIN editable | optional new rate; or pick a row in abstract | none until linked | `rateItems` seed | `GET/POST/PUT /rates`; `POST .../link-rate` | `rateItems`; copy on `estimateItems` | rate snapshot text | Master edit does not update old lines. Schedule dates unused. Not village-specific. |
| Abstract | Lists estimate lines only | salvage checkbox; rate picker; Recalculate | amount = round2(qty × rate); grand total | estimate rows; qty from groups on recalc | `GET/POST /cases/:id/estimate`, `PUT estimate/items` | `estimateItems` | grand total INR | Empty for a new case until a row exists. UI cannot link a rate without a row. |
| Depreciation | Auto on open | none (recalculate repeats) | cost = Math.round(sum of line amounts); value = Math.round(cost × YPfuture/YPtotal) | structure year, valuation date, useful life, YP table | `GET/POST .../depreciation`, `GET .../yp-factors` | `depreciationCalculations`, `depreciationFactors` | depreciated rupees | Missing years use 13.394 and 13.606. Ignores stored presentLife. GET writes DB. |
| Salvage | Check lines; opening the page recomputes at 10% | which items are reusable | salvage sum Math.round; same YP; adjustment = round2(depSalvage × %/100) | `isSalvageEligible` | `GET .../salvage`, `POST .../salvage/update` | `salvageEstimates`, flags on `estimateItems` | salvage totals | Seed file has 183981 vs live 189048. GET forces 10%. |
| Final net | Recap table and 0–25% slider | slider percent | net = round2(primaryDepreciated − adjustment); Indian words | depreciation + salvage | `GET .../final-valuation`, `POST .../salvage/update` | `finalValuations` status APPROVED on insert | net INR + words | Slider not durable. Case status not approved. No owner/village rollup. |
| Panchanama | Witnesses, remarks, photo URL | names, date, condition, remarks, URL | none | defaults hardcoded if missing | `GET/POST .../panchanama`, photo POST/DELETE | `panchanamaRecords`, `evidencePhotos` | text record | Sample panchas inserted for new cases. Condition unused in money. `documents[]` unused. |
| On-screen report | Five tabs, edit notes, print, share link, JSON | local title, remarks, officer names | none | hardcoded rupees in `PdfReportStep.tsx` | none for the figures | none | print preview, JSON file of the sample | Does not show the open case’s calculated net. Edits are not saved. |
| Server PDF | Download | none | re-runs depreciation and salvage at 10% | live case rows | `GET .../report/download` | rewrites dep, salvage, final | 5-page PDF | Some labels stuck on 41/45 and Jigaon Nandura. Photos use local files, not URLs. |
| Dashboard / audit | Counts and log list | search/filter on cases only | sums and counts | stored finals and audit rows | `GET /dashboard/stats`, `GET /audit` | read-only | cards, table | Calculation edits are not audited. Old versions cannot be replayed. |

---

*End of current-platform report. No optimized workflow is proposed in this document.*
