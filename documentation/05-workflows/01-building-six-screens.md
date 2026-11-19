# BUILDING Workflow — Six Screens (narrative)

This is the primary end-to-end story for the project report.

## Preconditions

- Officer signed in.  
- Case exists with `workflow: "BUILDING"` (or open demo `case-eknath-gut193-demo`).  
- Rate schedule and Y.P. table available to pin.

---

### Screen 1 — Case and structures

**Goal:** Identify the property and list structures.

1. Enter owner, gut/survey, village / taluka / district, LA case number, valuation & inspection dates.  
2. Pin **rate schedule** and **Y.P. table**.  
3. Add structures (main house, shed, porch, store, …).  
4. Optionally attach evidence files.  
5. Continue when progress checklist allows.

**Figure:** `03-screen1-case-structures.png`

---

### Screen 2 — Building definition

**Goal:** Capture geometry and construction facts.

1. Select a structure.  
2. For main house / store: enter clear overall size and column×row grid (equal or unequal spans). Confirm structure so wall runs are engineer-confirmed.  
3. Review SVG check sketch (clear dimensions; wall thickness drawn separately).  
4. Enter construction type, wall material/thickness, height, **construction year**, **useful life**, floor, roof, foundation depths.  
5. Enter openings and structural members.  
6. Save each section.

**Demo (Eknath):** 14.5 × 11.65 m, 4×2 unequal spans, year **2023**, life **10**, AAC / wood plank profile.

**Figure:** `04-screen2-building-definition.png`

---

### Screen 3 — Generated measurement

**Goal:** Produce draft MS lines from facts.

1. Click **Generate measurement sheet**.  
2. Review draft items and preview quantities.  
3. If gaps exist, return to Screen 2 and save missing facts.  
4. Continue when drafts exist for review.

Ordinary cases use `draft.*` suggestions. The Gut-193 matching plan uses `eknath.*` source-draft formulas aligned to the workbook.

**Figure:** `05-screen3-measurement.png`

---

### Screen 4 — Review, rates, abstract

**Goal:** Bind CSR rates and form present cost.

1. **Bind rates** — search catalogue; select unique rows.  
2. **Accept all drafts** (only lines with unique rates).  
3. Override / exclude lines if needed (with reason).  
4. **Prepare abstract** — aggregate to present cost.

**Demo target present cost:** ₹10,73,836

**Figure:** `06-screen4-review-abstract.png`

---

### Screen 5 — Depreciation and finalize

**Goal:** Apply Y.P. and freeze (admin).

1. System computes  
   `Depreciated = ROUND(present × YP(future life) / YP(useful life), 0)`  
   per structure using the **pinned** table only.  
2. Recalculate / accept depreciation.  
3. **ADMIN** finalizes → snapshot frozen.

**Demo target depreciated value:** ₹8,23,876  
(With year 2023 and life 10 on the demo valuation date, future life is non-zero so Y.P. ratio is defined.)

**Figure:** `07-screen5-depreciation.png`

---

### Screen 6 — Documents

**Goal:** Export and optional verification.

1. Download **PDF** (COVER / FS / DEP / ABSTRACT / MS from snapshot).  
2. Download **Excel** dump of the same snapshot.  
3. Advanced: run **source replay** fixture for workbook comparison (labelled separately).

**Figure:** `08-screen6-documents.png`

---

## Engineer experience summary

The engineer describes the property; the case header lists what still needs attention. Nothing on Screen 3 invents walls that were never confirmed. Rates come from the catalogue, not free-typed item numbers alone. Exports do not recalculate after finalize.
