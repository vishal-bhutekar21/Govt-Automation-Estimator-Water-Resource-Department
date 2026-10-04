# Implementation Change Map

Written from the repository as it stood before the building-workflow change, and from `FINAL_IMPLEMENTATION_PLAN.md`.

`Government_Building_Valuation_Detailed_Engineering_Derivation_Spec.docx` was not in the repository, the project folder, Downloads, or Desktop. It was not used. Nothing in that missing file was guessed. Where the plan says a rule is **DOMAIN VALIDATION REQUIRED**, the code keeps it draft or blocked.

Labels:

- **CONFIRMED FROM CODE** — read from this repository.
- **SOURCE-DERIVED** — the gut-193 workbook.
- **FIELD-EVIDENCE** — the 14-page booklet and the section sketch.
- **DOMAIN VALIDATION REQUIRED** — not an automatic production rule.

## 1. Current Architecture

Frontend:

- React 19 + Vite + Tailwind. Routes in `frontend/src/App.tsx`.
- Case UI is `CaseWizardView` plus steps: Property, Structure, Measurement, Abstract, Depreciation, Salvage, Final, Panchanama, PDF (`frontend/src/components/layout/CaseStepper.tsx`).
- API client: `frontend/src/services/api.ts`. Base URL `VITE_API_URL` or `/api`. JWT from `localStorage`.

Backend:

- Express 4 in `backend/src/index.ts`, port `process.env.PORT` or 5000.
- Routers mounted under `/api/v1/*`. Health check `GET /api/health`.
- Vercel entry `api/index.ts` re-exports the same app. `vercel.json` rewrites `/api/(.*)` to that file and builds `frontend`.

Persistence:

- `backend/src/database/db.ts` reads and writes `backend/data/db.json`.
- If the file is missing or empty, the process keeps the in-memory seed.
- Disk writes are swallowed on failure so serverless can keep running in memory.

Auth:

- JWT in `backend/src/middleware/auth.ts`, 24 hour expiry.
- `JWT_SECRET` from the environment, with a hardcoded fallback.
- Login in `authController.ts` had a plaintext password branch for one email that issued a token without checking the stored hash.

Roles:

- `ADMIN | ESTIMATOR | CHECKER | VIEWER` on the user record.
- `requireRole` exists. It is used for project create and rate write.
- Register, list users, and delete user were unauthenticated.
- CHECKER and VIEWER were not blocked from case mutations.

Deployment:

- Root `npm run build` installs and builds the frontend only.
- Backend `npm run build` is `tsc`. Start is `node dist/index.js`.
- No GitHub Actions directory. No Dockerfile.
- No new database server. The system of record is the JSON file plus the in-memory seed.

Calculation:

- `DecimalMath` in `backend/src/utils/decimal.ts`.
- Measurement lines are typed by the engineer. Net is stored on the line.
- Estimate copies rate and quantity.
- Depreciation looks up a Year’s Purchase row and, if the year is missing, substitutes 13.394 and 13.606.
- Salvage defaults to 10 percent. Several GET handlers recalculate and save.
- New cases were created with useful life 45, present life 4, and a burnt-brick / CGI description (`caseController.ts` `createCase`).

Reports:

- `pdfReportController.ts` recalculates depreciation, salvage, and the final amount while generating the PDF.
- `PdfReportStep.tsx` also prints fixed sample rupees for the seed case.

Testing:

- `backend` uses `node --test`.
- Suites cover decimal arithmetic, measurement/estimate, depreciation/salvage, PDF/panchanama, and the seed case `case-jigaon-165`.
- Two salvage tests disagree (183981 versus 189048). That inconsistency stays inside the legacy fixture.

## 2. Protected Infrastructure

| Item | Decision | Why |
|---|---|---|
| JWT login and `authenticateJWT` | HARDEN | Same token flow. The plaintext login branch is removed. Tokens are still checked against the user table. |
| `JWT_SECRET` fallback | KEEP for this release | Removing it would stop a deployment that does not set the variable. Production should set `JWT_SECRET`. The fallback is still a risk. |
| Role names `ADMIN`, `ESTIMATOR`, `CHECKER`, `VIEWER` | KEEP | They are the existing role system. The office delegation matrix is not invented. New writes use a provisional matrix and say so. |
| `requireRole` | KEEP | Reused on new write, import, finalize, and export routes. |
| User seed and password hashes | KEEP | Existing accounts stay. |
| `GET /api/health` | KEEP | Same path and JSON shape, version field updated. |
| Port, `vercel.json`, `api/index.ts` | KEEP | Deployment contract unchanged. |
| Frontend build command and Vite proxy | KEEP | |
| `VITE_API_URL` | KEEP | |
| CORS `origin: true` | KEEP | |
| JSON file persistence | KEEP as the store | No second database was introduced. New collections are added beside the old ones. |
| Legacy seed case, rates, and Year’s Purchase rows | KEEP | Readable. Not the default for a new valuation. |

## 3. Replaceable Workflow

These modules are the old case path. New cases do not use them.

| Module | Files | What happens |
|---|---|---|
| Case creation defaults | `caseController.ts` `createCase` | New cases no longer receive life 45, a CGI house, or a single guessed structure. |
| Property step as the measurement start | `PropertyDetailsStep.tsx` | Legacy cases only. |
| One structure form | `StructureDetailsStep.tsx`, `StructureDetails` | Legacy cases only. New cases use a structure list. |
| Hand-typed measurement lines | `measurementController.ts`, `MeasurementStep.tsx` | Legacy cases only. |
| Estimate copy | `estimateController.ts`, `AbstractEstimateStep.tsx` | Legacy cases only. |
| Depreciation fallback | `depreciationController.ts` | Not called by the new engine. |
| Salvage 10% | `salvageController.ts`, `SalvageStep.tsx` | Not used for new cases. |
| Final row inserted as approved | `FinalValuation` on the legacy path | New finalize is a separate immutable snapshot. |
| PDF that recalculates | `pdfReportController.ts` | Legacy route kept for legacy cases. New exports read a snapshot. |

`/cases/:id` sends a legacy case (no `workflow`, or `workflow: 'LEGACY'`) to the old wizard, including `case-jigaon-165`. A case with `workflow: 'BUILDING'` opens the six-screen workspace.

## 4. Target Architecture

```
Case identity
  → one or more structures
  → construction profile
  → rooms and placement
  → candidate wall runs
  → engineer confirms wall runs
  → openings and members
  → applicability list (draft until a rule is validated)
  → measurement blocks the engineer accepts, overrides, excludes, or types
  → pinned rate version and a unique rate match
  → abstract from accepted nets
  → depreciation from a typed life, the valuation date, and an exact Year’s Purchase row
  → draft snapshot
  → finalize (immutable)
  → measurement sheet, abstract, depreciation, cover, PDF, Excel
```

Evidence files hang off the case and are cited by the snapshot. The field drawing is not parsed into dimensions.

Candidate wall runs are not quantities.

There is no validated production quantity rule in this release. Gut 193 is a source-replay fixture only.

## 5. Database Changes

The store remains `db.json`. Old keys are not deleted.

| Current | Target | Migration | Legacy |
|---|---|---|---|
| `cases[]` | Optional `workflow: 'LEGACY' \| 'BUILDING'` | Missing value means LEGACY. New rows are BUILDING. | `case-jigaon-165` stays LEGACY. |
| `properties[]` | Still the identity row (owner, village, gut, LA number) | New cases still get a property row so the registry can list them. No guessed submergence. | Unchanged. |
| `structures[]` (`StructureDetails`) | Left for legacy. New `buildingStructures[]` | Additive. | Legacy structure row is not converted into rooms. |
| `measurementGroups[]` | New `measurementBlocks[]` and `measurementLines[]` | Additive. | Legacy groups stay. |
| `rateSchedules[]`, `rateItems[]` | New `rateScheduleVersions[]` and `catalogueItems[]`. Item number is a string. | Legacy 18 rows are copied once into version `PWD-CSR-2014-15-SEED` and are not pinned to new cases. | Seed rates unchanged. |
| `depreciationFactors[]` | New `ypTables[]` | Legacy factors copied once into `yp-legacy-seed`. New cases do not auto-select it. | Old depreciation rows unchanged. |
| `estimateItems[]`, `depreciationCalculations[]`, `salvageEstimates[]`, `finalValuations[]` | New `calculationSnapshots[]` | Additive. | Legacy totals stay readable. |
| `documents[]`, `evidencePhotos[]` | New `caseEvidence[]` with versions | Additive. | Old photo records stay. |
| `calculationVersions[]` | Unused before. Snapshots are the new history. | Not overwritten. | — |
| `users[]` | Unchanged | — | Preserved. |

New arrays are created empty when an older `db.json` is loaded.

## 6. API Changes

| Endpoint | Decision | Compatibility | Authorization |
|---|---|---|---|
| `POST /api/v1/auth/login` | MODIFY | Same URL. Password is checked with the stored hash. | Public. |
| `POST /api/v1/auth/register`, `GET /users`, `DELETE /users/:id` | MODIFY | Same URLs. Now require an administrator token. | ADMIN. |
| `GET /api/v1/cases`, `GET /cases/:id` | KEEP | Read. New cases include `workflow`. | Any signed-in user. |
| `POST /api/v1/cases` | MODIFY | Still creates a case. No life-45 structure. `workflow` is BUILDING. | Signed-in user. Viewer and checker are rejected. |
| Legacy measurement, estimate, depreciation, salvage, final, PDF routes | KEEP | Used by legacy cases. New UI does not call them. | Unchanged, still weak on the old routes. |
| `GET /api/v1/workflow/cases/:caseId` | ADD | Read bundle. Does not save. | Signed-in. |
| `PUT /api/v1/workflow/cases/:caseId/identity` | ADD | | Estimator or admin. |
| `POST /api/v1/workflow/cases/:caseId/structures` | ADD | | Estimator or admin. |
| `PUT /api/v1/workflow/structures/:id` | ADD | Profile. Marks dependent blocks for review. | Estimator or admin. |
| `PUT /api/v1/workflow/structures/:id/rooms` | ADD | | Estimator or admin. |
| `POST /api/v1/workflow/structures/:id/geometry/candidates` | ADD | Suggestions only. | Estimator or admin. |
| `POST /api/v1/workflow/wall-runs/:id/confirm` | ADD | | Estimator or admin. |
| `POST /api/v1/workflow/structures/:id/wall-runs` | ADD | Manual wall. | Estimator or admin. |
| `PUT` openings and members | ADD | | Estimator or admin. |
| `POST /structures/:id/generate` | ADD | Applicability list. Does not create quantities. | Estimator or admin. |
| `POST /structures/:id/draft-lines` | ADD | Creates a line only because the engineer asked. Tagged DRAFT. | Estimator or admin. |
| `POST /blocks/:id/decision` | ADD | Accept, override, exclude, reset. | Estimator or admin. |
| `POST /structures/:id/manual-block` | ADD | | Estimator or admin. |
| `POST /cases/:caseId/calculate` | ADD | Writes a draft snapshot. | Estimator or admin. |
| `POST /snapshots/:id/finalize` | ADD | Admin only. Provisional. | ADMIN. |
| `GET /snapshots/:id`, `/pdf`, `/xls` | ADD | Read the snapshot. Viewer cannot export. | Not VIEWER. |
| `POST /cases/:caseId/evidence` | ADD | New version. Does not overwrite a file. | Estimator or admin. |
| `POST /rate-schedules/import` | ADD | | ADMIN. |
| `POST /cases/:caseId/source-replay` | ADD | Explicit fixture. Not used by ordinary generate. | Estimator or admin. |
| `GET /api/health` | KEEP | | Public. |

## 7. Frontend Changes

| Screen | Decision | Notes |
|---|---|---|
| Login, layout, sidebar, dashboard, projects, rates, audit | REUSE | |
| Register | REUSE the page. The API now requires an administrator. | |
| Case list and create modal | REUSE | New cases open the new workspace. |
| `CaseWizardView` and the nine steps | KEEP for legacy cases | Not shown for a BUILDING case. |
| `pages/valuation/ValuationWorkspace.tsx` | ADD | Six screens: case and structures, building definition, generated measurement, review and abstract, depreciation and finalize, documents. |

## 8. Calculation Changes

Current quantity path: the engineer types number, length, breadth, and depth. The server multiplies and stores the net. Each line is independent.

Target quantity path: rooms, confirmed walls, openings, and members are the facts. `POST generate` returns draft applicability and does not write quantities. A quantity appears when the engineer adds a manual line or explicitly asks for a named draft suggestion. Draft suggestions do not apply the workbook’s 0.05 m or 0.10 m centre-line adjustments, the 50 kg/m³ steel factor, or the plaster range that drops rooms. Those remain source-replay only.

Current depreciation: software life 45 and a fallback factor pair.

Target depreciation: construction year, valuation date, and a life the engineer typed. Exact lookup in the selected Year’s Purchase table. A missing factor blocks the snapshot. The year 2026 is not hardcoded. Life 10 and life 45 are not defaults.

Current salvage: 10 percent on the legacy path, including on some reads.

Target salvage: no salvage stage. Legacy salvage remains on the legacy controllers and is tagged, in the change map and in the replay/legacy split, as legacy software behaviour.

Current rate mapping: a rate row is copied onto an estimate line. Item codes are the 2014-15 seed.

Target rate mapping: a schedule version is pinned. Item numbers are strings. One match may be proposed. Two matches stay ambiguous and select nothing. No match stays unmapped. The snapshot stores the version id and the rate used.

## 9. Evidence and Traceability

`caseEvidence[]` stores document type, file path, uploader, time, version, optional structure id, and notes. Types: `FIELD_DRAWING`, `SECTION_SKETCH`, `SITE_PHOTO`, `SOURCE_WORKBOOK`, `RATE_DOCUMENT`, `SUPPORTING_MEASUREMENT`, `OTHER`.

A replacement upload creates a new row and a new file name. A finalized snapshot stores the evidence ids that existed at calculation time.

A measurement block stores rule id, rule status (`DRAFT` or `VALIDATED_RULE`), formula text, source fact ids, derived value, engineer value, decision, user, time, and reason. No production rule is `VALIDATED_RULE` in this release.

The server does not read dimensions out of the PDF.

## 10. Migration Strategy

- Load path: if `db.json` has cases, keep them and add empty arrays for the new collections.
- `case-jigaon-165` is not rewritten into rooms.
- Legacy rate rows and Year’s Purchase rows are copied into versioned collections once, marked legacy, and are not the default pin for a new case.
- Users are untouched.
- Rollback: the new UI is selected only when `workflow === 'BUILDING'`. Legacy cases still open the old wizard. The new arrays can be ignored by the old code.

## 11. Deployment Safety

Before this change is treated as ready:

- `GET /api/health` still returns 200.
- `vercel.json` rewrite and `api/index.ts` are unchanged.
- Frontend `npm run build` (tsc + vite) succeeds.
- Backend `npm test` succeeds.
- Backend `tsc` succeeds.
- No new required environment variable.
- No port change.

## 12. Rollback Strategy

- A BUILDING case is data in new arrays plus `workflow` on the case.
- To return an individual case to the old screens, set `workflow` to `LEGACY`. Its building rows can remain unused.
- To return the whole app to the previous commit, check out `backup/pre-main-changes-2026-10-03` (commit `96d822f` at the time that branch was created). Later commits move `main` only.
- Old `db.json` keys are still present, so the previous controllers can still read legacy cases after a code rollback. New keys are ignored by the old code.

## 13. Risks

Technical: two calculation paths now exist. New cases must not call salvage or the Year’s Purchase fallback. The code path is separated by `workflow` and by a different route prefix.

Data: `db.json` is still one file. A failed write on serverless still drops the change after the process ends. That is the existing operational limit, not a new database.

Calculation: draft suggestions are arithmetic from facts the engineer entered. They are not the gut-193 centre-line method. An engineer can still accept a draft suggestion; the block is marked DRAFT so it is not presented as a government rule.

UX: legacy cases and new cases look different on purpose.

Deployment: the register API is no longer public. The super-admin screen must already be logged in, which it is. The plaintext login bypass is gone; the same user can still sign in if that password hash is the one stored.

## 14. Implementation Order

1. This change map.
2. Additive collections and types.
3. Pure calculation module and tests (replay, legacy separation, geometry, rates, Year’s Purchase, overrides).
4. Workflow API. GET does not save.
5. Six-screen UI and case routing.
6. Auth hardening that does not change the token contract.
7. Build, tests, and this file’s implementation record.

## 15. Definition of Done

- A new case opens six screens and is not given life 45 or a salvage step.
- A legacy case, including case 165, still opens the old wizard and its stored totals.
- Candidate walls are not used as quantities until confirmed, and generate does not invent quantities.
- An ambiguous rate selects nothing.
- A missing Year’s Purchase factor blocks finalize.
- Source replay of the twelve workbook lines produces ₹ 10,73,836 and ₹ 8,23,876 without becoming the default generate path.
- No validated production golden rules are registered.
- A finalized snapshot is not rewritten in place.
- PDF and Excel for a new snapshot are rendered from that snapshot.
- Health, Vercel rewrite, and the frontend/backend build commands still work.

## Domain validation required

Still blocked, not implemented as production rules:

- Useful life table, including 10 and 45
- Salvage percentage
- 50 kg of steel per cubic metre
- Centre-line adjustments of 0.05 m and 0.10 m
- Which of field-drawing page 1 or page 3 is the gut-193 measure
- Opening sizes that are in the workbook and not dimensioned on the booklet
- Item 6 versus item 26 for columns
- Internal plaster formula and the omitted rooms
- Ceiling deduction
- External plaster versus openings
- Rate schedule, page, and date for each RA row
- Official approval roles
- Rounding as a government policy (the snapshot records which arithmetic profile was used)

## Implemented

- `IMPLEMENTATION_CHANGE_MAP.md` from the current controllers, routes, persistence, and deployment files.
- Additive `db.json` collections and a one-time copy of the legacy rate rows and Year’s Purchase rows into versioned records. Old cases are not rewritten.
- New cases are `workflow: "BUILDING"` and are not given life 45, a CGI description, or a guessed structure.
- `/cases/:id` opens `ValuationWorkspace` for a building case and `CaseWizardView` for a legacy case, including case 165.
- Workflow API under `/api/v1/workflow`: identity, many structures, rooms, candidate walls, openings, members, applicability without writing quantities, explicit draft lines, accept / override / exclude / reset, manual lines, string item numbers, ambiguous matches that select nothing, abstract, depreciation, immutable finalize, evidence versions, PDF and Excel from the snapshot, and an explicit source replay.
- `GET /api/v1/workflow/cases/:caseId` and `GET /api/v1/workflow/snapshots/:id` do not save.
- Login no longer accepts the plaintext password branch. Register, list users, and delete user require an administrator token.
- Viewer and checker cannot create a case or call workflow writes. Finalize is administrator-only and is labelled provisional.
- Tests: source replay ₹ 10,73,836 and ₹ 8,23,876, legacy case 165 still readable, candidate walls, ambiguous item `121`, missing Year’s Purchase year, override kept after review, empty shed not copied from the house. Existing legacy suites still pass (35 tests).
- Frontend production build succeeds. Backend `tsc` succeeds. `GET /api/health`, `vercel.json`, and `api/index.ts` are unchanged apart from the health version string and the new route mount.
- The test script sets `VALUATION_DB_READONLY=1` so the suite does not rewrite `db.json`.

## Partially implemented

- Draft suggestions cover floor area, confirmed-wall volume, opening area, and member volume. They do not cover the workbook centre-line method, plaster, ceiling, or steel. Those stay in the source-replay fixture only.
- The six screens are one workspace. Opening and member entry is a short add-row form, not a full schedule editor.
- Excel export is SpreadsheetML of the snapshot text, not a formatted workbook with live formulas.
- Evidence files are stored on disk under `backend/data/evidence`. A read-only serverless disk returns 503 instead of pretending the file was stored.
- The JWT fallback secret is still present so a deployment that does not set `JWT_SECRET` can start. It should be set in production.
- The seed still contains a password used to create the super-admin hash when that user is missing. The login path itself checks the stored hash.
- Legacy measurement, depreciation, salvage, and PDF routes are still callable and still have their old weaknesses, including write-on-GET. New cases do not use them.
- No second real gut from the field booklet has been entered as a finished valuation. The engine test only proves an empty shed is not given the house bill.
- There is no validated production golden suite, because no formula has been signed off.

## Domain validation required

Unchanged from the list above. In code these stay draft, blocked, or confined to `SOURCE_REPLAY`:

- Useful life, including 10 and 45
- Salvage
- 50 kg/m³ of steel
- Centre-line adjustments
- Page 1 versus page 3 of gut 193
- Opening sizes
- Column rate item 6 versus item 26
- Plaster and ceiling formulas
- Which schedule a rate row belongs to
- Who may approve, as distinct from the provisional administrator finalize check
- Rounding as government policy (`UNVALIDATED_HALF_UP_RUPEE` is recorded on platform snapshots; `WORKBOOK_193_REPLAY` is recorded on the fixture)

## Legacy behaviour

- Case 165, its 18 measurement groups, CSR 2014-15 rates, salvage, and final amount stay on the old records and the old wizard.
- Legacy depreciation fallback and 10% salvage remain in the old controllers.
- The two salvage test figures (183981 and 189048) were not reconciled.

## Deployment validation

- Backend `tsc`: success.
- Backend `npm test`: 35 passed. `db.json` was not rewritten.
- Frontend `npm run build` (`tsc` and Vite): success.
- Health route, port, `vercel.json` rewrite, and `api/index.ts` entry are still the deployment contract.
- No GitHub Actions workflow exists in the repository, so CI was not run.
- No new required environment variable.

## Known limitations

- `db.json` is still the system of record. A failed disk write on serverless still drops the change when the process ends.
- The field drawing is not measured by the software. The engineer types the facts.
- Source replay can be started from the documents screen of any building case. The result is labelled `SOURCE_REPLAY` and is not the generate path.
- Official documents for a new case exist only after a snapshot is calculated.
- The detailed engineering specification `.docx` named in the request was not in the workspace, so it was not applied.

## UX correction after the first building screens

The first building screens still asked the engineer to fill blank text, type an item number, and guess which fact a calculation needed. `UX_DATA_ENTRY_AUDIT.md` records each field.

What the code does now:

- Case attention is returned with the workflow bundle. It does not write quantities.
- `analyzeStructure` reports `MISSING_DATA`, `NOT_APPLICABLE`, or `DRAFT_RULE`. It does not return `READY` while `VALIDATED_RULES` is empty.
- Room area, wall volume, opening area, and member volume can be previewed from facts already saved. The preview is not a measurement-sheet line.
- Catalogue search is `GET /api/v1/workflow/cases/:caseId/catalogue?q=`. Selecting a row sends `catalogueItemId`. The unit is taken from that row.
- Duplicate item numbers are listed and are not auto-selected.
- Openings and members are entered with count and sizes. A missing count is still not zero.
- Gut 193 source replay is unchanged.

`Government_Building_Valuation_Detailed_Engineering_Derivation_Spec.docx` is still not in the repository. Plaster, steel, centre-line, salvage, and useful life remain unvalidated.

Checked in the browser against a temporary case (readonly database):

- Case completeness chips and per-structure chips (profile, rooms, wall confirmation, openings, members) are visible.
- Building definition uses millimetres for wall thickness, metres for height and room sizes, and a derived room area. Enclosed / Open / Not sure stay readable on a narrow column.
- Catalogue search for “excavation” returned the pinned seed row. Selecting it locked the unit to Cum and did not ask for an item number. Adding 10.33 Cum with a measurement note created a measured line.
- Screen 3 does not write a quantity. With no rooms or walls it reports that there is nothing on this structure to measure.
- Evidence types are labelled in ordinary words. The finalize screen shows the schedule name, not the stored id.

## Grid structure input and 2D check sketch

### CURRENT IMPLEMENTATION

Building Definition (`BuildingGuide.tsx` / unused `BuildingScreen`) asks for rooms one by one: code, length, breadth, optional row/bay. Walls come from `POST .../geometry/candidates` via `proposeWallRuns`, which invents a candidate per room face and can duplicate shared boundaries. There is no overall long/short input, no columns×rows grid, and no live 2D sketch. Auth, roles, legacy `CASE/2008-09/165`, and gut-193 source replay stay outside this screen.

### TARGET IMPLEMENTATION

Engineer enters long side, short side, columns, and rows (equal grid by default; optional unequal spans). The UI draws a check sketch immediately. Source layout facts are stored on the structure. Generated rooms and non-duplicated wall runs persist through `PUT .../structure-layout`. Confirm marks walls `ENGINEER_CONFIRMED`. No new valuation formulas.

### FILES TO CHANGE

- `IMPLEMENTATION_CHANGE_MAP.md` (this section)
- `backend/src/workflow/types.ts` — layout source fields; room/wall generated metadata
- `backend/src/controllers/workflowController.ts` — apply layout endpoint; structure create defaults
- `backend/src/routes/workflowRoutes.ts` — route
- `frontend/src/pages/valuation/BuildingGuide.tsx` — structure-first UI
- `frontend/src/pages/valuation/ValuationWorkspace.tsx` — wire save/confirm layout
- `docs/BUILDING_WORKFLOW.md` — describe the structure workflow

### FILES TO ADD

- `backend/src/workflow/gridGeometry.ts` — deterministic generator (authoritative)
- `backend/test/grid_geometry.test.ts`
- `frontend/src/pages/valuation/gridGeometry.ts` — same algorithm for live preview
- `frontend/src/pages/valuation/StructureSketch.tsx` — SVG check sketch

### SCHEMA / MODEL CHANGES

`BuildingStructure` gains: `shape`, `overallLengthM`, `overallBreadthM`, `gridColumns`, `gridRows`, `spanMode`, `columnSpansM`, `rowSpansM`, `geometryStatus` (`NONE` | `DRAFT_GENERATED` | `CONFIRMED`).

`RoomFact` gains: `generated`, `boundaryWallIds` `{ north, south, east, west }`.

`WallRunFact` gains: `generated`, optional `axis` (`LONG` | `SHORT`), optional `role`.

Existing room/wall collections remain. Legacy cases have no building structures.

### API CHANGES

`PUT /api/v1/workflow/structures/:id/structure-layout`

Body: layout source + `confirm` + optional `acknowledgeRegenerate` when already confirmed.

Writes structure source fields, replaces that structure’s rooms, replaces non-manual walls with generated runs. Confirmed → wall origin `ENGINEER_CONFIRMED`; draft → `CANDIDATE`. Marks dependent measurement blocks for review when regenerating after confirmation.

### UI CHANGES

Structure Information first: shape Rectangle, long/short metres, columns×rows, live total rooms, live SVG check sketch, derived room table. Construction facts below. Room-by-room primary entry removed for grid structures. Manual wall add remains for exceptions.

### GEOMETRY GENERATION LOGIC

Equal: `columnSpan = L/C`, `rowSpan = B/R`. Unequal: spans must sum to L and B within tolerance. Walls: 2 outer long + 2 outer short + (C−1) full-height vertical shared + (R−1) full-width horizontal shared. Adjacent rooms share one wall id. Room codes R1… row-major.

### SAVE / LOAD IMPACT

Preview is client-side. Persist only through the layout endpoint. Reload from case bundle. Changing confirmed layout requires acknowledgement.

### LEGACY COMPATIBILITY

`workflow !== 'BUILDING'` still rejected by workflow routes. Case 165 unchanged. Auth/roles/deploy unchanged. No valuation rule promotion.

### TEST PLAN

Grid counts for 4×2, 1×4, 4×1, 1×1; unequal span sums; invalid inputs; regeneration; shared wall identity; save/load via API; legacy case still opens.

### RISKS

Frontend and backend generators can drift if edited separately — tests lock the backend; frontend copies the same formulas. Huge grids capped. Existing hand-entered rooms on a structure are replaced when a layout is saved.

## Next required actions

1. An engineer or the office decides the open items in the domain-validation list before any of them become `VALIDATED_RULE`.
2. Import the full rate catalogue, with schedule, version, and string item numbers. Do not go live on the 18-row seed.
3. Choose the Year’s Purchase table for new cases and leave blank years blank.
4. Confirm who may review, approve, and finalize, then replace the provisional administrator-only finalize check.
5. Set `JWT_SECRET` in the deployment environment and remove the fallback after that is confirmed.
6. Enter a second real property from the field booklet, including a shed, and finish it without copying the house.

