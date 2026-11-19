# Testing and Verification Evidence

## 1. Automated tests

The repository advertises an automated suite (see root README test badge). For the project report:

- State the framework used (as found under `backend` / `frontend` test scripts).  
- Record pass count from a local `npm test` (or project-equivalent) run at submission time.  
- Attach console output as Appendix evidence if the institution requires it.

## 2. Functional verification checklist (manual)

| # | Check | Expected |
|---|---|---|
| 1 | Login with admin / engineer seed | Dashboard loads |
| 2 | Cases registry lists demo + other cases | Search works |
| 3 | Open Eknath demo | Screens 1–6 navigable |
| 4 | Screen 1 identity | Owner Eknath…, Gut 193, Bondgaon |
| 5 | Screen 2 plan | 14.5 × 11.65, 4×2 spans, year 2023, life 10 |
| 6 | Screen 3 generate | Draft lines with quantities |
| 7 | Screen 4 abstract | Present cost **₹10,73,836** (when pins match) |
| 8 | Screen 5 depreciation | Depreciated **₹8,23,876**; future life ≠ 0 |
| 9 | Screen 6 PDF/Excel | Downloads from finalized snapshot |
| 10 | Rates page | CSR items searchable |
| 11 | Y.P. page | Factors searchable; formula visible |
| 12 | Audit trail | Recent actions listed |
| 13 | API health | `/api/health` OK |

## 3. Reference demo results

| Metric | Value |
|---|---|
| Case number | `CASE-193-EKNATH-DEMO` |
| Case id (URL) | `case-eknath-gut193-demo` |
| Owner | Eknath Pandurang Tharkar |
| Gut / survey | 193 |
| Present cost | ₹10,73,836 |
| Depreciated value | ₹8,23,876 |
| Rate pin (demo) | CASE-193-RA-UI-GUIDE |
| Y.P. pin (demo) | Gut 193 workbook YP (7 & 10) |

## 4. Screenshot evidence

All UI figures for the report are under `documentation/screenshots/` with captions in `SCREENSHOT-INDEX.md`.

## 5. Known test nuances (honesty for examiners)

- Draft quantity rules ≠ fully validated production CSR pack.  
- Source replay is a labelled fixture path, parallel to normal generate/accept.  
- Cloud free-tier outages can temporarily break demos until DB/API are restored.
