# Final Implementation Plan

Government of Maharashtra — building valuation and estimation platform  
Status: blueprint only. No application code is changed by this document.  
Evidence date: 3 October 2026. Revised after visual inspection of the 14-page field booklet and the section sketch.

This plan is the master brief for implementation. It is based on the current repository, one completed engineer workbook, and the field drawings for that office’s Bondgaon measurements. It does not treat the current software, the workbook, or a drawing as a government rule by itself.

The chain the platform must keep visible is:

```
Field evidence (drawing, section, photos, source workbook)
        → engineer-confirmed structured facts
        → calculation rules (draft until validated)
        → derived quantities
        → measurement sheet
        → abstract
        → depreciation
        → one immutable calculation snapshot
        → official documents
```

The software does not parse a PDF and trust every handwritten dimension. The drawing stays attached to the case. The engineer enters or confirms the structured facts. Every generated quantity must be able to answer “where did this come from?” by pointing at the rule, the source facts, and the evidence document.

Evidence labels used throughout:

- **CONFIRMED FROM CODE** — read from the current repository.
- **SOURCE-DERIVED** — read from the engineer workbook cells or formulas. A source-derived formula is a replay fact, not a production rule.
- **FIELD-EVIDENCE** — read from the 14-page field booklet or the section sketch. Handwriting is recorded as observed. It is not auto-accepted as the measurement.
- **ENGINEERING INFERENCE** — a reading of how facts might fit together. Not a rule to code until validated.
- **DOMAIN VALIDATION REQUIRED** — the software must not choose a value or a formula until an engineer or an official source confirms it.

---

## 1. Executive summary

The engineer’s sequence, as shown by the field drawings and the completed workbook, is:

observe the property → field drawing → physical facts → repetitive quantities → engineer review → measurement sheet → rate check → abstract → depreciation / Year’s Purchase → finalized snapshot → official sheets.

The target system keeps that sequence. It removes repeated typing. It does not replace engineering judgement.

```
Enter physical facts once, reuse them everywhere,
automate repetitive arithmetic, keep engineering control.
```

The supplied gut-193 workbook, taken as stored, ends at:

- Present estimated cost **₹ 10,73,836**
- Depreciated value **₹ 8,23,876**
- No salvage line on any sheet

Those two figures are the **source-replay benchmark** of this workbook. They are not, by themselves, the production engineering specification. Spreadsheet defects are preserved in a replay fixture so the source artifact can be audited. They become production behaviour only after an engineer or an official source validates the disputed formulas. See section 6.

The current software’s case (House 165, net ₹ 2,38,687.20, 10% salvage, useful life 45) is a **legacy regression fixture**. It is not the specification for a new valuation.

**Catalogue source missing from repository; full catalogue must be imported and verified before a production release.** The workbook rate sheet is a 127-row extract. The face sheet names four schedules and does not tag rows to a book, page, or date. The repository seed is a different 18-row PWD CSR 2014-15 list.

---

## 2. Evidence inspected

| Source | What it is | Label |
|---|---|---|
| Repository `frontend/`, `backend/`, `api/`, `backend/data/db.json`, `backend/test/` | Running platform | CONFIRMED FROM CODE |
| `ANALYSIS.md` | Prior reverse-engineering of that code | Not a government rule |
| `README.md`, `output/USAGE_GUIDE.md`, `output/*.png` | Description and screenshots of the current app | Not field measurements |
| `FinalProject - Automation of Estimation Process.pdf` | Present. Text extraction returned no text | Not used as a rule source |
| `evidance docs/Copy of 193 eknath pandurang tharkar (1).xlsx` | Completed valuation. Sheets COVER, FS, DEP, ABSTRACT, MS, RA, YP | SOURCE-DERIVED |
| `evidance docs/uuuuuuuuuuuuuu.pdf` | 14-page field booklet, Jigaon Rehabilitation Sub-Division No. 1, Shegaon. Each page is a site sketch for a gut in Bondgaon | FIELD-EVIDENCE |
| `evidance docs/WhatsApp Image 2026-09-30 at 11.11.45 (1).jpeg` | Section through siporex/ciporex wall, ground beam, soling, and excavation | FIELD-EVIDENCE |
| Workbook embedded `xl/media` images | Office emblems only | Not a building drawing |

The 14-page PDF is a formal source document for this plan. It is attached case evidence. It is not missing, optional, or irrelevant.

The previous edition of this plan said no separate field drawing existed, because only the workbook emblems had been seen. That statement is withdrawn.

The PDF is a scan. Dimensions below were read from the pages visually. Where two pages of the same gut disagree, or a page disagrees with the workbook, both readings are kept and marked **DOMAIN VALIDATION REQUIRED**. The software does not pick the winner.

---

## 3. Current-state findings

### 3.1 Platform facts (CONFIRMED FROM CODE)

- React + Vite frontend, Express API, persistence in `backend/data/db.json` through `backend/src/database/db.ts`.
- Wizard: Case → Property → Structure → Measurements → Abstract → Depreciation → Salvage → Final → Panchanama → Report (`CaseStepper.tsx`).
- Quantity types: `VOLUME`, `AREA`, `RUNNING_LENGTH`, `COUNT` in `backend/src/utils/decimal.ts`.
- Line amount is quantity × rate, rounded half-up to 2 decimal places in the estimate controller.
- Depreciation in `depreciationController.ts` then rounds the depreciated value to a whole rupee with `Math.round`.
- If a Year’s Purchase year is missing, the code substitutes **13.394** and **13.606**.
- New cases do not receive measurement groups or estimate lines (`caseController.ts` `createCase`).
- One property and one structure per case.
- `builtUpArea`, `plinthArea`, and `numberOfRooms` are stored and are not inputs to quantity formulas.
- Rates are copied onto estimate lines. Later edits to the rate master do not rewrite those copies.
- `GET` depreciation, salvage, final valuation, and PDF generation recalculate and save. A salvage percentage other than 10 is reset when those reads omit a percentage (`salvageController.ts` defaults to `10.0`).
- Step 10 on screen and the JSON export in `PdfReportStep.tsx` print the fixed sample amounts 261669, 257592, 192040, 189048, 18904.80, and 238687.20.
- `calculationVersions` is never written. Measurement, rate, depreciation, and salvage edits are not audited.
- Roles `CHECKER` and `VIEWER` are not enforced. Case status is not moved to approved when a final amount is calculated. A new final-valuation row is inserted with status `APPROVED`.
- Tests lock the seed case of Mohan Vishwanath Gai, House 165, Dadulgaon, CSR 2014-15, useful life 45, age 4, net ₹ 2,38,687.20, including a 10% salvage deduction.
- `backend/test/decimal.test.ts` uses salvage depreciated **183981** and adjustment **18398.10**. `backend/test/depreciation_salvage.test.ts` expects salvage depreciated **189048** and adjustment **18904.80**. The two tests do not describe the same salvage figure.

### 3.2 What the current design must not carry forward

| Current behavior | Target |
|---|---|
| Engineer types each bill line independently | Engineer enters plan, construction, openings, and members once. The system proposes quantities and the engineer reviews them |
| 18 seed rows treated as the schedule | Versioned, source-aware rate master. Full catalogue import before production |
| Hardcoded Year’s Purchase fallback | Stop the calculation when the factor row is missing. Do not interpolate blank years |
| 10% salvage on every valuation | No salvage stage unless a validated rule says it applies. This workbook has none |
| Useful life default 45 | Useful life comes from a confirmed classification, or is typed for that case. Do not adopt 45 from the software or 10 from this workbook as the default |
| One structure, one standard house | A case holds many structures. Each structure has its own profile, geometry, and bill |
| Report literals and a second money formula | Every sheet reads one calculation snapshot |
| Read endpoints that write | Reads do not mutate |
| “Calculated” stored as approved | Preparation, review, approval, and finalization are separate events |
| JSON file as the system of record | A database that can store versions, overrides, evidence, and frozen snapshots |
| Engineer must type every wall because the sheet did | Room placement and thickness may propose candidate walls. Quantities use only walls the engineer has confirmed |

Retain the idea of a measurement line as number × length × breadth × depth, because both the software and the workbook use that product. Retain Decimal-style arithmetic so rounding is explicit. Retain case, owner, village, gat/survey, and LA-case identifiers. Retain panchanama only as an optional annex: it is in the software and not on this workbook, so it must not change the amount.

---

## 4. Field booklet — what the 14 pages actually show

**FIELD-EVIDENCE.** All 14 pages were inspected. They are not one house drawn fourteen ways. They are a set of site sketches on the same printed form:

- Title: Jigaon Project, Tal. Nandura, Dist. Buldhana
- Village line: Bondgaon, Tal. Shegaon, Dist. Buldhana
- Printed LA case on the form: **01/2022-23**
- Plinth-area blank on the pages inspected
- Footer: Subdivisional Engineer, Jigaon Rehabilitation Subdivision No. 1, Shegaon; AE-2 / JE signature block
- Each page names an owner and a gut number, then a plan, wall notes, and often a member schedule

The domain model must represent this diversity. A single 8-room rectangular house is only one of the sketches (and even that gut is drawn twice, differently).

| Page | Gut (as read) | What the sketch contains | Why it matters to the model |
|---|---|---|---|
| 1 | 193, Eknath Pandurang Tharkar | 2×4 rooms. R7/R8 written **3.60** m wide. Siporex 0.15 m. Plaster inside and outside. 19 columns 0.15×0.15. Height note **1.95 m**. Posts 0.08×0.10, R2 written **8+4**. Y-rafters 0.10×0.12, R2 written **1+2**. X-rafters 0.06×0.08, R2 written **13**, R8 written **13** | Same gut as the workbook, different sizes and member counts from page 3 and from the sheet |
| 2 | 161 | 2×4 rooms about 3.70×5.80, height **2.00 m**, 19 columns, plus a separate finished GI-sheet structure about 4.85×10.00, height 1 m, 0.15 m block wall, MS angles and vertical posts | A property can contain a house and a second structure. Do not copy the house bill onto the shed |
| 3 | 193, same owner | Same 2×4 layout. R7 **3.80×5.90**, R8 **3.80×5.75**. R2 marked **open**. Height **1.97 m**. Posts R2 = **8**. Y-rafter R2 = **1**. X-rafter R2 = **3**, R8 = 13 with a note of 6 rafters at half length 1.9 m | This page is the drawing that lines up with the workbook room sizes and most member counts. It still conflicts with page 1 |
| 4 | 4 | GI-sheet room 6.10×3.90 beside a 2×2 siporex house. Posts, rafters, ballies, GI pipe / MS pipe, GI mesh on the front wall. Room height 2.10 m. Shed heights written separately | Mesh, pipe, balli, and a shed are first-class facts, not “other” leftovers |
| 5 | 06 | Small GI shed 3.45×2.10, mud, height 1.95, and a two-room GI building with different heights (about 2.41 m and 2.70 m), porch wall, MS angles and vertical angles | Open porch, unequal room heights, truss-like angle notes |
| 6 | 95 | Six-room house, height 2.35 m, mud and WP, plus a large GI shed 10.10×7.55, walls 0.15 m to 1 m, mesh above the block, MS angles, GI pipe, 1.40×1.80 angle frame | Low wall plus mesh is a different wall profile from full-height siporex |
| 7 | 4 (different owner from page 4) | 2×4 rooms, mixed 3.60 and 3.85 m, height 1.90 m, 16 columns 0.15×0.15, posts, rafters, pauli | Column count is not always 19. Gut numbers repeat across owners |
| 8 | 04 | Four rooms 4.00×5.20, height 2 m, cement tiles, plus an open shed 7.60×3 m with GI sheet and ballies | Open shed with almost no “rooms” in the house sense |
| 9 | 92 | 2×4 rooms 3.50×6.20 / 6.25, height 1.95 m, 25 columns, siporex 0.15 m | Another column count and another room module |
| 10 | 02 | Two brick rooms, wall **0.23 m**, GI sheet, mud. Heights about 3.45 m. MS-angle sections drawn. No AAC note | Wall material and thickness are per structure. 0.15 m is not universal |
| 11 | 161 (second sketch) | GI shed 4.00×10.50 beside an 8-room siporex house, height 2 m, 25 columns, posts including MS angles | Same gut number as page 2, different drawing. Identity is owner + gut + sheet, not gut alone |
| 12 | 07 | Six rooms, tiles, height 1.96 m, siporex 0.15 m. Post section changes by room (0.10×0.08, 0.10×0.10). Year-of-construction line is blank | Member section is not one size for the whole building. Year can be unknown |
| 13 | 07 (second sketch) | Four rooms, one marked open, height 1.90 m. Several rafter counts are 0 or 1 | A room can be open. A member count can be zero. Do not invent rafters |
| 14 | 96 | 2×4 rooms, mud / WP, height 2.10 m, 25 columns 0.15×0.15, posts, rafters, pauli | Same family of plan as 193, different sizes and counts |

Recurring facts the model must be able to store, because they appear on these pages:

- More than one structure on one sheet (house, tin/GI shed, open shed, porch)
- Room count from 1 to 8, not a fixed 8
- One room marked open while neighbours are enclosed
- Wall thickness 0.15 m siporex/ciporex and, on another sheet, 0.23 m brick
- Wall height that is not the room height (1 m block wall, mesh above, dwarf wall)
- Plaster inside and outside called out in words; some sheets do not say both
- Floor notes: ceramic tile (CT), tiles, mud, WP
- Roof notes: GI sheet, wood plank ceiling is not on every page
- Columns 0.15×0.15 with counts 16, 19, or 25, or absent
- Timber: posts, rafters in two directions, pauli, balli, with per-room counts and sometimes a zero
- Steel sections: MS angle, GI pipe, GI mesh, vertical angles
- Different construction year, sometimes blank
- A printed LA number and village on the form that can be compared with the valuation sheets

The purpose of this list is not to build CAD. It is to stop the design assuming one standard house.

### 4.1 Section sketch

**FIELD-EVIDENCE.** The attached section image shows, in metres:

| Element | Size on the sketch |
|---|---|
| Siporex / ciporex wall above ground | 0.15 thick |
| Ground beam | 0.30 |
| Soling | 0.10 |
| Depth from ground to underside of soling | 0.40 |
| Foundation breadth | 0.25 |

Those five numbers are the same sizes the gut-193 measurement sheet uses for wall thickness, beam depth, soling depth, excavation depth, and foundation breadth. The sketch labels the wall **siporex/ciporex**. The workbook depreciation cell types “Block masonary+ wooden plank” and the masonry rate line is AAC item 19.1. All three wordings are kept. None is renamed to match the others. **DOMAIN VALIDATION REQUIRED.**

The section sketch does not show room lengths, opening sizes, or a useful life.

---

## 5. Gut 193 — drawing compared with the workbook

Pages 1 and 3 of the booklet and the workbook are three records of the same owner and gut. They are not the same record.

| Fact | Page 1 (field) | Page 3 (field) | Workbook MS / DEP | Agreement |
|---|---|---|---|---|
| Owner and gut | Eknath Pandurang Tharkar, 193 | Same | MS `D4`, `D5` | Agree |
| Village | Bondgaon, Tal. Shegaon | Same | MS `D6` Bondgaon; work name Shegaon | Agree with the measurement header. Disagree with the Bhon / Sangrampur sentence on FS and the cached DEP work name |
| LA number printed on the form | 01/2022-23 | Same | MS `L6` = 01/2022-23 | Agree with the measurement sheet. Disagree with COVER / FS cached 03/2021-22 |
| Layout | 2 rows × 4 rooms | Same | Not stored as coordinates. Room list is eight rooms | **ENGINEERING INFERENCE** that the sheet’s repeated lengths are this layout. The engineer must confirm placement. The system may propose it as a candidate. It must not silently adopt it |
| R1–R6 sizes | 3.6×5.90, 3.6×5.75, 3.6×5.90, 3.6×5.75, 3.50×5.90, 3.50×5.75 | Same | Same on the flooring lines | Agree |
| R7, R8 length | **3.60** and **3.60** | **3.80** and **3.80** | **3.8** and **3.8** | Page 3 agrees with the workbook. Page 1 does not. **DOMAIN VALIDATION REQUIRED** |
| R2 marked open | Not read as open on page 1 | Marked open | R2 still has floor area, plaster line, and wood counts | **DOMAIN VALIDATION REQUIRED** whether “open” removes flooring, plaster, or ceiling |
| Wall | Siporex block 0.15 m | Same | AAC item, breadth 0.15 m | Sizes agree. The name does not agree with DEP `C9` |
| Height | **1.95 m** | **1.97 m** | **1.97 m** on masonry, columns, posts, plaster | Page 3 agrees with the workbook. Page 1 does not. **DOMAIN VALIDATION REQUIRED** |
| Columns | 0.15×0.15, 19 nos | Same | 19 × 0.15 × 0.15 × 1.97 | Count and section agree. The rate item used for that volume does not agree with its own heading (section 28) |
| Posts 0.08×0.10 | R2 written 8+4; others 12 | R2 = 8; others 12 | R2 = 8; others 12 | Page 3 agrees with the workbook. Page 1’s “8+4” is unresolved |
| Y-rafter 0.10×0.12 | R2 written 1+2 | R2 = 1 | R2 = 1; others 3 | Page 3 agrees. Page 1 does not |
| X-rafter 0.06×0.08 | R2 = 13, R8 = 13 | R2 = 3, R8 = 13, with a half-length note of 1.9 m | R2 = 3; R8 split 7+6 | Page 3 is close to the workbook and still not identical on the R8 split. **DOMAIN VALIDATION REQUIRED** |
| Opening positions | Doors and windows marked on the plan (D1–D8 and wall openings) | Same kind of marks | Sizes 0.85×1.75 and 0.60×0.80 are on the sheet | Positions are field evidence. **The sizes used in the quantities were not read off these pages.** They stay source-derived from the sheet until the engineer confirms them |
| Foundation section | Not on these plan pages | Not on these plan pages | 0.25 × depths 0.40 / 0.10 / 0.30 | Matches the separate section sketch, not a dimension written on page 1 or 3 |
| Plaster | “Internally and externally” | Same | Internal and external plaster items both measured | The words agree that both exist. The formulas do not agree with each other (section 28) |
| Floor | CT / PL written in rooms | CT, and R2 marked open | Ceramic tile item, sum of eight room areas | **DOMAIN VALIDATION REQUIRED** for the open room |
| Useful life, year, rates, YP | Not on the drawing | Not on the drawing | DEP and RA | Drawing does not validate life 10, year 2023, or any rate |

Traceability example the product must be able to show:

```
Masonry quantity
  → rule: wall runs × thickness × height − opening deductions
  → source facts: accepted wall runs, thickness 0.15, height, opening schedule
  → evidence: field booklet page 3 (or page 1), section sketch, workbook MS
  → status: candidate / accepted / overridden
  → engineer can open the formula
```

If page 1 and page 3 are both attached, the case stores both versions. The structured facts point at the evidence version the engineer confirmed. The other page remains visible as a conflicting source. The system does not delete it and does not average 3.60 and 3.80.

---

## 6. Three benchmark levels

A spreadsheet can omit a room, paste a value, break a reference, or hardcode a year. Replaying that sheet is useful. Adopting its defects as the government method is not.

### A. Source replay fixture

Purpose: reproduce what this workbook actually calculates, including known defects, so audit and regression can show “the file says this”.

It may keep the plaster sum that drops R7 and R8, the ceiling total that ignores its own deduction row, pasted amounts, and the literal year in `2026-D13`.

Label on every result: `SOURCE_REPLAY`. It is not offered as the default for a new village.

Expected stored results, rechecked against `evidance docs/Copy of 193 eknath pandurang tharkar (1).xlsx`:

- ABSTRACT `G24` = `SUM(G11:G23)` = **1073836**
- ABSTRACT `G25` = `ROUNDUP(G24,2)` = **1073836**
- DEP `D24` = `ROUND(1073836 × 5.389 / 7.024, 0)` = **823876**

### B. Validated engineering golden case

Purpose: the benchmark that defines production calculation behaviour.

It exists only after an engineer or an official source has marked each disputed formula accepted, rejected, or “this case only”. Until that sign-off, **there is no validated golden case**, and production generation of those formulas stays off.

A correction of the plaster range or the ceiling deduction is a new snapshot under this level. It must not be silently written back into the source-replay expected values.

### C. Legacy software regression

Purpose: keep the old engine honest while it still exists.

Case `CASE/2008-09/165`, Mohan Vishwanath Gai, Dadulgaon, abstract ₹ 2,61,669, depreciated ₹ 2,57,592, salvage path, net ₹ 2,38,687.20. Useful life 45 and 10% salvage stay inside this fixture.

Legacy behaviour must not become the new engineering specification. The two salvage figures in `decimal.test.ts` and `depreciation_salvage.test.ts` (183981 versus 189048) stay recorded as a test inconsistency. They are not reconciled by choosing one as a government salvage rule.

---

## 7. Source replay of the workbook

**SOURCE-DERIVED** from the in-repository workbook. Not a production rule.

| Fact | Cell | Stored value |
|---|---|---|
| Owner | MS `D4` | Eknath pandurang tharkar |
| Gut / gat | MS `D5` | 193 |
| Village on the measurement header | MS `D6` | Bondgaon |
| LA number typed on the measurement sheet | MS `L6` | 01/2022-23 |
| Work name | MS `A3` | Valuation of properties, Village Bondgaon, Taluka Shegaon, Dist. Buldhana |
| Structure type text | DEP `C9` | Block masonary+ wooden plank |
| Total life typed | DEP `C10` | 10 |
| Year of construction | DEP `D13` | 2023 |
| Present life | DEP `D14` formula `2026-D13` | 3 |
| Future life | DEP `D15` formula `C10-D14` | 7 |
| YP future life | DEP `D16` exact `VLOOKUP` | 5.389 |
| YP total life | DEP `D17` exact `VLOOKUP` | 7.024 |
| Present cost | DEP `D11` = ABSTRACT `G25` | 1073836 |
| Depreciated value | DEP `D24` | 823876 |
| YP citation typed on the sheet | DEP `F16:F17` | PWD handbook Ch. 37, Vol. II, pages 34 and 35 |
| Schedules named in the narrative | FS `A26` | PWD SSR 2021-22, WRD CSR 2022-23, M.J.P. SSR 2021-22, GSDA CSR 2021-22 |
| Office | FS / COVER | Executive Engineer, Jigaon Rehabilitation Division, Khamgaon; Sub-Divisional Engineer, Sub-Division No. 1, Shegaon |
| Names on the sheets | ABSTRACT / DEP | Prepared: V.B. Nagose, JE. Checked line: JE/AE-2. Signed blocks also name A.R. Rathod, SDE, and S.D. Hase, EE |

Workbook calculation order:

```
MS measurement lines
    → ABSTRACT looks up each MS serial and each item number in RA
    → amount = rate × rounded quantity, where a formula exists
    → DEP looks up YP and rounds present cost × YP(future) / YP(total) to a rupee
    → COVER and FS display that depreciated amount
```

There is no salvage sheet and no panchanama sheet. The workbook itself contains one measured structure. The field booklet shows that other guts on the same form have more than one structure. Absence of a second structure in this workbook is not a product limit.

### 7.1 Twelve measured items

Rechecked on the in-repository file. Abstract quantity is `ROUND(...,2)`. Amounts marked “formula” have a `ROUND` element. Amounts marked “pasted” are stored numbers with no formula element.

| Abs | RA item | Quantity | Rate | Unit | Amount | In the file |
|---|---|---|---|---|---|---|
| 1 | 1 Excavation, mechanical, lift to 1.5 m | 10.33 | 202.85 | Cum | 2095 | Formula |
| 2 | 4 Rubble stone soling 15–20 cm | 2.58 | 2130.40 | Cum | 5496 | Formula |
| 3 | 21 RCC M-20 beams and lintels | 7.75 | 12639.70 | Cum | 97958 | Pasted |
| 4 | 121 TMT FE-500 | 4.29 | 7514.20 | Qtl | 32236 | Pasted |
| 5 | 19.1 AAC block masonry | 28.37 | 7152.10 | Cum | 202905 | Pasted. Item cell is numeric and reads back as `19.100000000000001` |
| 6 | 6 RCC M-20, rate text is foundations / footings | 0.84 | 7578.00 | Cum | 6366 | Pasted. MS heading is RCC COLUMNS |
| 7 | 68 Jungle-wood joist and girder | 5.14 | 56662.35 | Cum. | 291244 | Formula |
| 8 | 112 Ceramic tiles 30×30 cm | 168.93 | 507.10 | Sqm. | 85664 | Pasted |
| 9 | 98 Non-teak plank ceiling 12 mm | 184.53 | 1166.00 | Sqm | 215162 | Pasted |
| 10 | 30 External sand-faced plaster | 107.76 | 637.25 | Sqm. | 68670 | Formula |
| 11 | 29 Internal cement plaster 6 mm | 95.27 | 201.40 | Sqm. | 19187 | Pasted |
| 12 | 97 Jungle-wood frame 60×100 mm | 15.74 | 2976.70 | Sqm | 46853 | Formula |

`SUM` of the amount column is 1073836. Item 121 is the steel rate used. Item 27 is another TMT rate (₹ 8823.10 / Qtl) and is not used. Item 26 is an RCC column rate (₹ 14123.40 / Cum) and is not used. Which item is correct is **DOMAIN VALIDATION REQUIRED**.

### 7.2 Geometry and members as typed on the sheet

**Rooms R1–R8**, flooring `length × breadth`:

| Room | Length | Breadth | Floor area |
|---|---|---|---|
| R1 | 3.6 | 5.9 | 21.24 |
| R2 | 3.6 | 5.75 | 20.70 |
| R3 | 3.6 | 5.9 | 21.24 |
| R4 | 3.6 | 5.75 | 20.70 |
| R5 | 3.5 | 5.9 | 20.65 |
| R6 | 3.5 | 5.75 | 20.125 |
| R7 | 3.8 | 5.9 | 22.42 |
| R8 | 3.8 | 5.75 | 21.85 |
| Sum | | | 168.925 |

These R7/R8 lengths match field page 3 and do not match field page 1.

**Long-wall length** MS `F12`:

```
3.6 + 3.6 + 3.5 + 3.8 + 0.15*5 + 0.1 = 15.35
```

**Short-wall lengths:** `5.9 - 0.1 = 5.8` (5 nos) and `5.75 - 0.1 = 5.65` (5 nos).

| Use | Nos | Length | Breadth | Depth / height |
|---|---|---|---|---|
| Excavation long wall | 3 | 15.35 | 0.25 | 0.40 |
| Excavation short wall A | 5 | 5.80 | 0.25 | 0.40 |
| Excavation short wall B | 5 | 5.65 | 0.25 | 0.40 |
| Soling | same nos and lengths | | 0.25 | 0.10 |
| RCC ground beam | same nos and lengths | | 0.25 | 0.30 |
| AAC long wall | 3 | 15.25 | 0.15 | 1.97 |
| AAC short wall A | 5 | 5.90 | 0.15 | 1.97 |
| AAC short wall B | 5 | 5.75 | 0.15 | 1.97 |
| Door deduction D1–D8 | 8 | 0.85 | 1.75 | 0.15 |
| Window deduction W1–W8 | 8 | 0.60 | 0.80 | 0.15 |
| RCC column | 19 | 0.15 | 0.15 | 1.97 |

Wood post counts: R1 and R3–R8 are 12; R2 is 8.  
Rafter-Y counts: R2 is 1; the other rooms are 3. Section 0.10 × 0.12. Length is the room breadth.  
Rafter-X counts: R1 and R3 are 13; R2 is 3; R4, R5, R6 are 14; R7 is 13; R8 is split 7 + 6. Section 0.06 × 0.08. Length is the room length.  
Pauli: 0.10 × 0.10 × 0.50; count 12 except R2 = 8.  
Wood total on the sheet is 5.1372 cum before abstract rounding to 5.14.

Steel:

```
ROUND( RCC_volume_cum × 50 / 100 , 2 )  quintal
```

Ground beam 7.7475 → 3.87 Qtl. Columns 0.842175 → 0.42 Qtl. Sum 4.29 Qtl. The 50 kg/m³ factor is on this sheet only.

External plaster: `2 × 15.25 × 1.97 + 2 × 12.10 × 1.97` = 107.759. No opening deduction.  
`12.10` is typed, not a formula. **ENGINEERING INFERENCE:** 5.9 + 5.75 + 0.15 × 3 = 12.10. Do not apply that sum until the engineer confirms it.

Ceiling: `1 × 15.25 × 12.10` = 184.525. A row of −20.7 for R2 exists. The total formula does not include it.

Internal plaster per room is `(length + breadth) × 1.97`. The subtotal sums a range that drops R7 and R8, then subtracts 11.9 and 3.84, and the net used by the abstract is 95.27.

Frame item 97 is the opening area in square metres (15.74), not the 60 mm × 100 mm section as a volume.

---

## 8. Target architecture

```
Field evidence attached to the case
        │
        ▼
Engineer-confirmed facts
  case, structure inventory, profile, rooms, confirmed geometry,
  openings, members
        │
        ▼
Candidate geometry (suggestions only)
  perimeters, shared walls, wall runs
  nothing here is a quantity until the engineer confirms it
        │
        ▼
Applicability
  AUTO / APPLICABLE only for a VALIDATED_RULE
  otherwise NOT_APPLICABLE, REQUIRES_CONFIRMATION, AMBIGUOUS,
  MANUAL, OVERRIDDEN, or REQUIRES_REVIEW
        │
        ▼
Quantity derivation
        │
        ▼
Draft measurement sheet
        │
        ▼
Engineer review
  accept, edit, override + reason, exclude + reason,
  add manual item, reset to derived
        │
        ▼
Approved measurement sheet
        │
        ▼
Rate verification (unique match, or AMBIGUOUS, or manual)
        │
        ▼
Abstract = approved net × rate from the pinned schedule version
        │
        ▼
Depreciation = present abstract × YP(future) / YP(total)
  only when both factors exist and useful life is an entered or validated input
  no salvage stage unless a validated rule adds one
        │
        ▼
One calculation snapshot, immutable once finalized
        │
        ├── Measurement sheet
        ├── Abstract
        ├── Depreciation
        ├── Recapitulation
        ├── Cover / face sheet
        ├── PDF
        └── Excel
```

One server function builds the snapshot. The browser may preview geometry from confirmed and candidate facts. It must not be a second copy of the money formulas.

`GET` returns stored drafts and snapshots. It does not calculate and it does not save.

An amendment after finalization creates a new snapshot that points at the previous one. The old snapshot stays readable.

---

## 9. Engineer-facing screens

Internal APIs and calculation phases stay as fine-grained as section 23. The engineer does not walk thirteen wizard pages and does not see the words entity, DTO, snapshot, or dependency graph.

Six screens:

### Screen 1 — Case and structure inventory

One record for owner, gut, village, taluka, district, LA case number, inspection date, valuation date, project, and office. Later sheets read these fields. They do not keep a second typed copy.

If evidence or an old sheet contains a second LA number or a second village, the screen shows the conflict and leaves certificate identity unresolved until a person chooses. It does not hide either value.

Structures are a list: main house, tin shed, open shed, store, or a name the engineer types. Adding a shed creates an empty structure. It does not copy the house.

Evidence is attached here or from screen 6: field drawing, section, photographs, source workbook. Each file has a type, uploader, time, version, and an optional note and structure link.

### Screen 2 — Building definition

One screen, with clear sections, per structure:

- Construction profile: type text, wall material, thickness, heights, foundation section if in scope, floor, roof, finishes, construction year, useful life if the engineer is typing it
- Rooms: name, length, breadth, and placement
- Candidate geometry: proposed wall runs and shared walls, each waiting for confirmation
- Openings: code, kind, count, width, height, and the wall they sit in when known
- Members: columns, beams, posts, rafters, pauli, balli, GI pipe, MS angle, mesh, or any other member the drawing shows

A blank fact leaves the dependent item as `INPUT_REQUIRED`. No default thickness, height, life, or steel factor is filled in.

### Screen 3 — Generated measurement sheet

The applicability result and the draft measurement sheet. Each line shows the formula and the source facts. Lines from a draft rule are marked as needing confirmation. An ambiguous rate is not pre-selected.

### Screen 4 — Review, rates, and abstract

Accept, edit, override with a reason, exclude with a reason, add a manual item, or reset to the derived value. Rate verification sits on the same screen: a unique match can be mapped automatically; several matches stay `AMBIGUOUS` until the engineer chooses; a missing item stays `REQUIRES_CONFIRMATION` or `MANUAL`. The engineer is not sent through the whole catalogue for every generated line.

The abstract is the accepted nets times the pinned rates. The quantity is not typed again.

### Screen 5 — Depreciation and finalize

Construction year, valuation date, useful life as entered or as looked up from a validated table, both Year’s Purchase factors, the formula, and the depreciated amount. A missing factor blocks the step. There is no salvage block unless a validated rule has been turned on for that case.

Finalize is a separate action from “the total exists”. Preparation is not review, review is not approval, and approval is not the same event as freezing the snapshot.

### Screen 6 — Documents

Measurement sheet, abstract, depreciation, recapitulation, cover, PDF, and Excel, all from the snapshot. Evidence versions are listed. A finalized package names the snapshot and the evidence versions it used.

The check sketch (rooms, confirmed walls, openings) is part of screen 2, not a seventh wizard step. The banner says it is a check sketch from entered sizes, not a survey drawing.

---

## 10. Building model

```
Case
  project, owner, gutNumber, village, taluka, district
  laCaseNumber
  conflictingIdentifierNotes
  inspectionDate, valuationDate, office
  status: draft / in_review / approved / finalized

CaseEvidence
  caseId, structureId nullable
  documentType:
    FIELD_DRAWING | SECTION_SKETCH | SITE_PHOTO
    | SOURCE_WORKBOOK | RATE_DOCUMENT
    | SUPPORTING_MEASUREMENT | OTHER
  file, originalFilename
  uploadedBy, uploadedAt, version, notes
  supersedesEvidenceId nullable

Structure
  caseId, name, sortOrder
  structureTypeText, wallMaterialText
  wallThicknessM, storeyHeightM
  constructionYear
  usefulLifeYears, usefulLifeSource
    (TYPED | VALIDATED_TABLE | NONE)
  finish and roof notes as facts, not as selected rate items

Room
  structureId, code, lengthM, breadthM
  placement: bayIndex, rowIndex, or offset
  openOrEnclosed

WallRun
  structureId
  origin: CANDIDATE or ENGINEER_CONFIRMED
  kind, count, lengthM, breadthM, depthM
  sourceRoomIds
  confirmedBy, confirmedAt
  quantities read only ENGINEER_CONFIRMED runs

Opening
  structureId, code, kind, count, widthM, heightM
  hostWallRunId nullable

MemberGroup
  structureId
  kind: POST, RAFTER_X, RAFTER_Y, PAULI, COLUMN, BEAM,
        BALLI, GI_PIPE, MS_ANGLE, MESH, OTHER
  roomId nullable, count
  lengthM, breadthM, depthM
  count may be zero; zero is not the same as missing

MeasurementBlock
  structureId, rateItemId nullable, ruleId, ruleStatus
  applicability:
    AUTO | APPLICABLE | NOT_APPLICABLE
    | REQUIRES_CONFIRMATION | AMBIGUOUS
    | MANUAL | OVERRIDDEN | REQUIRES_REVIEW
  derivedNet, engineerNet, overrideReason
  decidedBy, decidedAt

MeasurementLine
  blockId, label, count, lengthM, breadthM, depthOrHeightM
  formulaText, sourceFactIds, evidenceIds
  sign (+ or −)

RateSchedule
  name, authority
  versionLabel, effectiveFrom, effectiveTo
  sourceDocument, importedAt, importStatus

RateItem
  scheduleVersionId
  itemNumber          -- string, never a float
  description, unit, rate
  sourceRow, reference

YpTableVersion
  sourceCitation
  rows of (year, factor) with blanks left blank

CalculationSnapshot
  caseId
  evidenceVersionIds
  inputVersion, geometryVersion
  rateScheduleVersionId, ypTableVersionId
  usefulLife as stored, with its source
  ms, abstract, depreciation, finalAmount
  roundingProfileId
  createdBy, createdAt, finalizedAt
  supersedesSnapshotId
  contentHash
```

Case 1—* Structure 1—* Room, WallRun, Opening, MemberGroup, MeasurementBlock.  
Case 1—* CaseEvidence.  
Snapshot points at the evidence versions, the rate version, and the Year’s Purchase version it used. It does not live-join a later rate edit.

Changing an upstream fact does not overwrite an accepted override. It marks every dependent accepted block `REQUIRES_REVIEW` and shows the list (section 12).

---

## 11. Applicability and rates

Statuses:

| Status | Meaning |
|---|---|
| `AUTO` / `APPLICABLE` | A `VALIDATED_RULE` matched, and the rate match is unique |
| `NOT_APPLICABLE` | A validated rule’s conditions are false for this structure |
| `REQUIRES_CONFIRMATION` | The building might need the item, or the mapping is incomplete |
| `AMBIGUOUS` | More than one rate item fits. Nothing is selected until the engineer chooses |
| `MANUAL` | The engineer added the line and typed the measure |
| `OVERRIDDEN` | An accepted value differs from the derived value, with a reason |
| `REQUIRES_REVIEW` | An input changed after accept, or a draft rule is still in the bill |

Only a `VALIDATED_RULE` with a unique rate match may fill a quantity without a confirmation step. An ambiguous item never becomes the selected item by itself.

Observed formulas for the twelve gut-193 lines stay `DRAFT`. They are listed in section 7 and in Table B as source-derived descriptions. Generalizing them is **DOMAIN VALIDATION REQUIRED**.

Rate matching for a generated line:

- one item in the pinned schedule version matches the confirmed mapping → that item is proposed
- several items match (two TMT rates, two teak-frame rows, item 6 versus item 26) → `AMBIGUOUS`
- no item, or the schedule version is not pinned → `REQUIRES_CONFIRMATION` or `MANUAL`

The engineer is not required to browse the full catalogue for every line the system could already match uniquely.

### 11.1 Rate master is source-aware

A rate row is not `itemNumber + description + rate`.

It is:

- rate schedule (the book or extract)
- schedule version
- item number as a **string** (`19.1`, `19.2`, `90.1` must not become floats)
- description
- unit
- rate
- source (file, page, import row)
- effective / validity dates when known, otherwise null
- evidence reference

The gut-193 RA sheet is imported as an extract, for example `CASE-193-RA-EXTRACT`, with the workbook file as its evidence. It is not labeled “PWD SSR 2021-22” as a whole. The face sheet names four books and the rows are untagged. Splitting rows by book is **DOMAIN VALIDATION REQUIRED**.

The importer stores the original token and a canonical string. For the cell whose XML number is `19.100000000000001`, the canonical string is `19.1` only as a data-cleanup of float noise, recorded in the import log. It is not a decision about which AAC rate is correct. Item numbers that are already strings, including `19.2`, stay as written.

Units seen on the sheet (`Cum`, `cum`, `Cum.`, `Sqm.`, `Qtl.`, `Rmt.`) normalize to canonical `cum`, `sqm`, `qtl`, `rmt`, `no`, `m`. The original text is kept.

Duplicate rows (RA 45 and 105; RA 107 and 113) are imported as duplicates and flagged. They are not merged.

The 18-row PWD CSR 2014-15 seed remains a separate version for the legacy case. New valuations do not default to it. Effective date 2014-04-01 from that seed is not copied onto the gut-193 extract.

No production release depends on a guessed or partial catalogue. Full catalogue import, validation, normalization, schedule mapping, versioning, duplicate detection, unit normalization, string item numbers, and an audit trail are a go-live gate.

### 11.2 Items with no measurement in this case

RA items other than the twelve measured lines have no measurement block in this workbook. Descriptions include brick, mud, fly-ash, UCR, CGI sheet, pipes, angles, ballies, other floors, and other frames. The field booklet shows that other guts use some of those. Their presence on another sketch does not make them applicable to gut 193, and gut 193’s bill is not copied onto a shed.

They are searchable and can be added as `MANUAL`. They are not auto-generated.

---

## 12. Input once, and what happens when it changes

| Fact entered once | Reused for | Must not be re-typed |
|---|---|---|
| Room length and breadth | Floor; candidate perimeter; rafter lengths where the member is tied to the room | Floor area and those lengths |
| Storey height | Masonry, columns, posts, plaster, where those rules apply | Those heights |
| Wall thickness | Masonry breadth; opening deduction depth; candidate wall width on the sketch | Those breadths |
| Opening width and height | Masonry deduction, plaster deduction where the rule includes it, frame quantity | Separate opening entries per item |
| Confirmed foundation plan | Excavation, soling, ground beam, each with its own depth | The plan, three times |
| Beam volume and column volume | Reinforcement, where a steel rule applies | A second typing of those volumes |
| Roof member sizes and counts | Member quantity and the roof assembly that sums them | The same post entered again as wood |
| Owner, gut, village, LA number | Cover, face sheet, abstract, depreciation | A second identity |

When the engineer changes a fact, the system shows the impact before it changes accepted work.

Example: wall thickness changes.

- Candidate wall geometry is regenerated and shown again for confirmation
- Masonry quantity is recalculated as a proposal
- Plaster lines that depend on thickness or on the same walls are listed
- Opening deductions that use thickness are listed
- Any block already accepted or overridden becomes `REQUIRES_REVIEW`
- The previous accepted value stays visible beside the new proposal
- An override is not replaced

The engineer accepts the new derived value, keeps the override, or edits again. Silence does not accept the new number.

The same pattern applies to a room size (floor, linked rafters, linked walls), an opening (deductions and frames), a column section (column quantity and steel), and a roof member (that member and the wood total).

---

## 13. Candidate geometry

Correct sequence:

```
Room placement + dimensions + wall thickness
        → candidate perimeter, shared walls, and wall runs
        → engineer confirms or edits
        → accepted wall runs
        → quantity rules
```

The system may propose:

- the perimeter of a placed room
- a shared wall where two placed rooms touch
- a long-wall or short-wall run suggested by a row of rooms

Every proposal is `CANDIDATE` until confirmed. Quantities do not read candidates.

If rooms have no placement, the screen shows a labeled list and does not invent a two-row plan. The gut-193 booklet happens to show two rows of four. That is a candidate the engineer can accept. It is not an automatic layout for every eight-room building.

The workbook’s adjustments (`+0.1`, `−0.1`, `±0.05`, three long walls, five short walls) are not applied silently to a candidate. They can be offered as a named, still-draft suggestion for this replay, clearly marked, and they stay **DOMAIN VALIDATION REQUIRED** before any other building uses them.

Never invent a wall, a column, or a rafter count from a spacing the file does not contain. Member counts on these sheets are written per room. The screen asks for the count.

---

## 14. Calculation engine

One server module produces the snapshot. Suggested home: `backend/src/calculation/` (new). The current split across measurement, estimate, depreciation, and salvage controllers is retired for new cases.

PDF, Excel, the measurement sheet, the abstract, depreciation, the recapitulation, and the cover read that snapshot. They do not contain their own rupee formulas. Templates contain no sample totals.

`GET` does not call this module and does not write.

Rounding is **DOMAIN VALIDATION REQUIRED** as a platform policy. What the workbook does and what the software does are different:

| Step | This workbook | Current software |
|---|---|---|
| Line product | Full float stored; some quantity cells have no formula | Half-up to 2 decimal places |
| Abstract quantity | `ROUND(ms total, 2)` | Stored net, already at 2 decimal places |
| Abstract amount | `ROUND(rate×qty, 0)` where a formula exists; other amounts are pasted and match that round on this file | Half-up to 2 decimal places |
| Depreciation | `ROUND(cost × YPf / YPt, 0)` | `Math.round`, and a missing year falls back to 13.394 and 13.606 |
| “Say” total | `ROUNDUP(total, 2)`, which does not change 1073836 | Not present |

The source-replay fixture uses a named rounding profile `WORKBOOK_193_REPLAY`. Production uses a rounding profile only after validation. The snapshot records which profile produced it.

Depreciation inputs stored on the snapshot:

- valuation date (the year is taken from this date)
- construction year
- present life and future life, with the formula text
- useful life and whether it was typed or taken from a validated table
- Year’s Purchase table version
- both factors
- the formula
- the depreciated amount

The workbook expression `2026-D13` is evidence that a valuation year was subtracted. It is not a rule that production hardcodes 2026. If the valuation date is missing, depreciation is blocked.

If the Year’s Purchase factor for a year is missing, depreciation is blocked. Years 93–100 on this sheet are blank. They are not interpolated and they are not replaced with 13.394 or 13.606.

There is no salvage stage in the default new-case pipeline. The workbook has no salvage deduction. The software’s 10% default is not applied.

---

## 15. Review and override

Every generated quantity can be reviewed.

| Action | Effect |
|---|---|
| Accept | Engineer value equals derived value |
| Edit | Changes a source fact or a line input, then dependents go to `REQUIRES_REVIEW` |
| Override | Engineer value differs. Reason required |
| Exclude | Line stays out of the abstract. Reason required |
| Add manual item | A manual block with a typed measure and a reason |
| Reset to derived | Restores the derived value and keeps the override in history |

Stored for an override: generated value, engineer value, user, time, reason, rule id and rule version, snapshot or draft version.

The row shows the formula and the source facts. Reset does not delete the earlier decision.

---

## 16. Depreciation, Year’s Purchase, and salvage

Construction year + valuation date + useful life + an exact Year’s Purchase row produce depreciation.

Useful life:

- The software default of 45 years is **CONFIRMED FROM CODE** and is not the new default
- This workbook types 10 beside “Block masonary+ wooden plank”. That is **SOURCE-DERIVED** for this file only
- No classification table in the workbook or the field booklet shows why the life is 10
- Until a validated table exists, the engineer types the life, the snapshot stores `TYPED`, and the screen says the life was entered, not looked up
- Do not infer that every AAC or wood-plank building has life 10 or life 45

Year’s Purchase import from this workbook: years 1–92 with their factors, citation as printed on the depreciation sheet, years 93–100 empty. Exact match only. A second official table can be imported later as another version. New cases do not silently use the software seed table.

Salvage: none, unless a later validated rule says so. If that rule appears, it is a component on the snapshot, not a hidden percentage in the exporter.

---

## 17. Multiple structures

The field booklet is the evidence that one property can contain more than one structure, and that neighbouring guts are not copies of gut 193.

```
Case
  Structure 1   main house     own profile, rooms, walls, openings, members, bill, depreciation inputs
  Structure 2   GI / tin shed  own facts; INPUT_REQUIRED where facts are missing
  Structure 3   open shed
```

A shed does not inherit AAC masonry, ceramic tiles, or wood-plank ceiling from the house. If the shed drawing shows GI sheet, mesh, and a 1 m wall, those are the shed’s facts. If a count or a size is not on the drawing and not entered, the line is `INPUT_REQUIRED`. The system does not invent a quantity.

The gut-193 workbook measures one structure. Do not add a fictional shed to that replay. Other pages are the reason the product supports a structure list. They are not extra golden totals.

Case total is the sum of structure finals under the snapshot’s rounding profile, after each structure is included. An empty structure is not zero; it is unfinished, and it blocks finalize.

---

## 18. Measurement sheet, abstract, reports

Measurement columns: item number, description, heading, nos, length, breadth, depth or height, formula, gross, deduction, net, unit, source facts, evidence, rule, status.

Abstract columns: serial, quantity, description, rate, unit, item number, schedule version, amount.

The link from an abstract line to a measurement block is a reference, not a spreadsheet range. The workbook’s pattern of a different `MS!$B$9:O###` end row on every abstract line is a defect of that file. It is not copied. The source-replay fixture may reproduce the numbers the file stored. The production linker does not reproduce the range bug.

Reports:

| Output | Reads |
|---|---|
| Measurement sheet | Snapshot lines |
| Abstract | Snapshot amounts |
| Depreciation | Snapshot years, factors, formula, amount |
| Recapitulation | Snapshot present cost and depreciated cost. No salvage row unless the snapshot has a validated salvage component |
| Cover and face sheet | Case identity from the case record, amount from the snapshot |
| PDF and Excel | The same snapshot. Excel formulas, if any, point at a Values sheet inside that file |

If the snapshot is missing, export fails. Signature names are data. Who must sign is **DOMAIN VALIDATION REQUIRED**.

---

## 19. Evidence, audit, and versions

A case holds versioned evidence:

- the 14-page field booklet, or the single page that belongs to the gut, as `FIELD_DRAWING`
- the section sketch as `SECTION_SKETCH`
- site photographs
- supporting measurement sheets
- the source workbook
- rate-schedule documents
- anything else, typed `OTHER`

Each document stores type, file, uploaded by, timestamp, version, optional structure link, and notes. Replacing a file creates a new version. The previous file remains.

The finalized snapshot stores the evidence version ids and the structured input version that produced it. Opening a quantity shows the rule, the facts, and the evidence.

Money-affecting changes also record input version, geometry version, rule version, rate version, Year’s Purchase version, generated value, engineer value, user, and time.

Finalize freezes the snapshot and stores a content hash. Later edits are a new draft and then a new snapshot with `supersedes`. There is no update-in-place of a finalized amount.

Reopen is an explicit action by a role that is allowed to reopen. It does not delete history.

---

## 20. Approval

Do not treat the current role names as an office rule just because they exist in code.

Separate events:

| Event | What it is |
|---|---|
| Preparation | Estimator enters facts and reviews quantities |
| Review | Another person marks the draft reviewed. This does not change quantities by itself |
| Approval | The office sanction, if the validated role matrix requires it |
| Finalization | The snapshot becomes immutable |

A generated total is not approval. The current code inserting a final row as `APPROVED` is not copied.

The role matrix is a **go-live gate**. Until it is validated, any matrix in configuration is marked provisional. A provisional matrix must not be described as the department’s delegation.

Proposed only as a temporary development default, not as a government rule: estimator prepares; checker comments; a configured role finalizes; viewer reads. Viewer cannot write. That proposal exists to stop the current defect where viewer and checker can mutate. It is not sign-off.

---

## 21. Blocks that stop calculation

The server refuses to finalize when:

- A required dimension is missing, negative, or zero
- A wall run is still only a candidate and a quantity needs it
- Wall thickness or height is missing for a masonry line the engineer included
- An opening deduction is larger than the gross (warn, and block finalize)
- Units cannot be normalized
- Two openings in one structure share a code
- The rate is missing, ambiguous, or in a different unit from the measure
- The schedule version is not pinned
- Valuation date is missing, or is before the construction year, unless age is overridden with a reason
- Useful life is empty or future life is negative
- A Year’s Purchase factor is missing
- An override or an exclusion has no reason
- Any included block is `REQUIRES_REVIEW` or `AMBIGUOUS`
- A structure in the case is still `INPUT_REQUIRED`
- The client sends a final amount instead of asking the server to compute it

The system does not fill these with life 45, year 2012, Year’s Purchase 13.394 / 13.606, salvage 10%, or 50 kg of steel per cubic metre.

---

## 22. Schematic preview

Drawn from entered rooms and from candidate or confirmed walls:

- Room rectangle at the entered length and breadth, labeled with the room code and the size
- Candidate walls in a different style from confirmed walls
- Openings only on a wall the engineer attached them to
- No thickness drawn for a wall that is still unconfirmed
- If placement is missing, a list, not a fake plan
- Banner: check sketch from entered sizes, not a survey drawing

Warnings, not silent corrections:

- Missing length or breadth
- Zero or negative size
- Overlap once coordinates exist
- Opening wider than its wall
- A confirmed wall length that does not match the sum of the bays the engineer linked to it

---

## 23. Data and API map

### Current types

| Current | Action |
|---|---|
| `Project` | RETAIN |
| `ValuationCase` | MODIFY: status is not “a total exists” |
| `PropertyDetails` | MODIFY: single identity, plus a conflict note when sources disagree |
| `StructureDetails` | REPLACE: one row becomes a structure list and a profile |
| `MeasurementGroup` / `MeasurementItem` | REPLACE for new cases. Keep readable for legacy cases |
| `RateSchedule` / `RateItem` | MODIFY: schedule, version, string item number, canonical unit, source |
| `EstimateItem` | REPLACE: abstract lines are a view of accepted blocks |
| `DepreciationFactor` | MODIFY: versioned table, no fallback |
| `DepreciationCalculation`, `SalvageEstimate`, `FinalValuation` | REPLACE by the snapshot. Salvage omitted unless a validated component exists |
| `Panchanama`, `EvidencePhoto` | RETAIN as annex evidence, not as an input that changes the amount by itself |
| `AuditLog` | REPLACE with the event model in section 19 |
| `CalculationVersion` | REPLACE; it is unused |
| `DocumentRecord` | MODIFY: generated files and uploaded evidence, each tied to a snapshot or a case version |
| JSON `db.json` | REPLACE as the system of record |

### API shape

Reads do not save.

| Method and path | Purpose | Writes? |
|---|---|---|
| `POST /cases` | Create a case | Case only |
| `POST /cases/:id/evidence` | Attach a field drawing, photo, or workbook | Evidence version |
| `POST /cases/:id/structures` | Add an empty structure | Structure |
| `PUT /structures/:id/profile` | Construction facts | Profile |
| `PUT /structures/:id/rooms` | Rooms and placement | Rooms |
| `POST /structures/:id/geometry/candidates` | Propose wall runs from confirmed rooms | Candidates only |
| `POST /structures/:id/wall-runs/:id/confirm` | Accept or edit a candidate | Confirmed run |
| `PUT /structures/:id/openings` | Opening schedule | Openings |
| `PUT /structures/:id/members` | Member schedule | Members |
| `POST /structures/:id/generate` | Draft measurement sheet | Draft blocks |
| `POST /measurement-blocks/:id/decision` | Accept, override, exclude, reset | Decision |
| `POST /structures/:id/calculate` | Abstract and depreciation from accepted blocks | Draft snapshot |
| `POST /snapshots/:id/finalize` | Freeze | Final snapshot |
| `GET /snapshots/:id` | Read | No |
| `GET /snapshots/:id/pdf` and `/xlsx` | Export | No |
| `GET /rate-schedules/:version/items` | Search | No |
| `POST /rate-schedules` | Import a version | New version only |
| `GET /yp-tables/:version` | Read factors | No |

Impact of an edit is returned with the save: which blocks moved to `REQUIRES_REVIEW`, and the previous accepted value beside the new proposal.

---

## 24. Migration

| Data | Treatment |
|---|---|
| Seed case 165 | Legacy snapshot under benchmark level C, including its salvage component tagged `LEGACY_SOFTWARE_RULE`. Do not re-derive it from rooms that were never stored |
| Old wizard cases | Freeze the estimate lines that exist. Do not invent rooms from built-up area |
| Seed rates | Version `PWD-CSR-2014-15-SEED` |
| Seed Year’s Purchase rows | A legacy table. The workbook table is a separate version. Neither is “the” table until validation says which new cases use |
| Workbook case 193 | Source-replay fixture, not a migrated production award, until the discrepancies are decided |
| Field booklet and section sketch | Evidence on that fixture. Not parsed into facts automatically |
| Panchanama defaults that name Dadulgaon and 2016 | Not copied onto new cases |
| Users | Migrate accounts. Force password reset. Remove the hardcoded login bypass before go-live |

Rollback: legacy cases keep their snapshot ids. New tables are additive. A flag chooses the new screens. Turning it off shows the old wizard for legacy ids only.

---

## 25. Security

- JWT secret only from the environment. The fallback secret in `auth.ts` is not used in production.
- No password in source and no login bypass.
- Role checks on write, rate import, finalize, and export. The production matrix is the go-live gate in section 20.
- Finalized snapshots are not updated by PUT.
- Exports are authorized and tied to a snapshot id.
- Evidence uploads are typed files, not an arbitrary URL that a PDF later pretends is a site photo.
- Rate import is audited.
- Snapshot content hash stored on finalize.
- Production data is a backed-up database, not `db.json` on a disk that ignores write errors.
- Validation errors do not echo stack traces.

---

## 26. QA

### Unit

- Unit alias to canonical unit
- Product, deduction, net
- Named rounding profiles, kept separate
- Year’s Purchase exact match, and a missing year must fail
- Steel `× 50 / 100` only inside the source-replay fixture
- Override keeps both values
- Abstract amount from approved net × pinned rate
- Candidate wall runs do not enter a quantity
- Ambiguous rate match selects nothing
- Case sum of two structures, and a missing shed fact blocks rather than copying the house

### Integration

- Generate does not run on GET
- Finalize writes one snapshot; a second GET returns the same amounts and writes nothing
- PDF and Excel totals equal the snapshot
- A rate-master edit does not change a finalized snapshot
- Changing thickness marks masonry `REQUIRES_REVIEW` and leaves an override in place

### Three benchmark suites

1. **Source replay, case 193.** Inputs are the cells in section 7. Expected abstract ₹ 10,73,836 and depreciated ₹ 8,23,876. The suite also asserts the known defects as recorded discrepancies. It is named `SOURCE_REPLAY`. It is not the production default.
2. **Validated golden.** Added only when a Phase 0 decision in sections 28 and 36 has accepted that formula. Expected values are the validated ones, which may differ from the workbook. Until then this suite is empty on purpose.
3. **Legacy case 165.** Old amounts, including salvage, under `LEGACY_SOFTWARE_RULE`. Not the specification for new houses.

Do not synthesize an AAC house, a tin shed, and an RCC house and call the results government figures.

### UI

- Six screens, not a thirteen-step wizard
- Sketch shows candidate walls differently from confirmed walls
- Missing height blocks masonry and says why
- Override and exclude require a reason
- An ambiguous TMT choice is not pre-filled
- A room edit shows the impact list
- A case-193 report does not contain the literals 261669 or 238687.20

### End to end

Create case, attach the field drawing, add the house, enter or confirm the gut-193 facts, confirm wall runs, generate, accept, verify rates, calculate, finalize, export. Amounts match the snapshot. A second structure with no facts cannot be finalized.

---

## 27. Performance

- The sketch is drawn in the browser from facts already on screen.
- Money calculation runs when the engineer generates, calculates, or finalizes. It does not run on GET.
- One calculate request returns measurement sheet, abstract, and depreciation together.
- A long measurement sheet is paged by block.
- PDF generation reads the snapshot. It does not call depreciation again.

---

## 28. Discrepancies — domain validation required

Do not pick a winner in code. The safe software behaviour is to store both, show both, and block certificate identity or a disputed formula until a person decides.

| # | Where | What is stored | Why it is unresolved |
|---|---|---|---|
| 1 | LA number | Field form and MS `L6`: 01/2022-23. COVER `F25`, FS narrative, and cached external cells: 03/2021-22. ABSTRACT `D5` is an external link | Field evidence supports the measurement-sheet number and does not cancel the other text. Certificate identity stays unresolved |
| 2 | Village and taluka | Field form, MS, and FS `C14`: Bondgaon, Taluka Shegaon. FS narrative and cached DEP work name: Bhon, Taluka Sangrampur | Same. Do not overwrite the narrative from the drawing or the reverse |
| 3 | Office letterhead versus site | COVER and the field form header: Taluka Nandura. Property village taluka: Shegaon or, in the narrative, Sangrampur | The letterhead can stay the office. The property taluka is one confirmed field |
| 4 | Present life | DEP formula is the literal `2026-D13` | Do not hardcode 2026. Use the valuation date after confirmation |
| 5 | Useful life 10 | Typed. No classification table on the sheet or the drawing | Not a default for this construction type |
| 6 | What the building is | DEP text “Block masonary+ wooden plank”. MS item 19.1 AAC. Field notes say siporex block. Section sketch says siporex/ciporex. Wood is item 68 | Keep every wording. Do not rename |
| 7 | Columns | MS heading RCC COLUMNS, 19 nos, also on pages 1 and 3. Rate used is RA 6, whose text is foundations and footings. RA 26 is an RCC column rate and is unused | Do not remap 6 to 26 automatically |
| 8 | Ceiling deduction | `L127` is −20.7. Total is `SUM(L125:L125)` | Replay keeps 184.53. Production does not “fix” this until validated |
| 9 | Internal plaster formula | `(L+B)×H`, not `2×(L+B)×H` | May be shared-wall practice or a one-face shortcut |
| 10 | Internal plaster range | `SUM(L142:L147)` drops R7 and R8. Room labels `A142:A149` are `#REF!` | Replay keeps 95.27. Including R7 and R8 is a different rule |
| 11 | External plaster and openings | No opening deduction, while internal plaster has one. Field notes say plastered inside and outside and do not say whether openings are deducted | Do not subtract doors from external plaster unless a validated rule says so |
| 12 | Pasted MS quantities | Several `L` cells have cached numbers and no formula, beside lines that use `PRODUCT` | Replay uses the cached numbers and records the missing formula |
| 13 | Pasted abstract amounts | `G13`, `G14`, `G15`, `G16`, `G18`, `G19`, `G21` have no formula element | They match round-to-rupee on this file. They would not follow a later rate edit inside Excel |
| 14 | Broken references | COVER `A22` is `#REF!`. Plaster labels are `#REF!` | Do not invent the missing label |
| 15 | External links | COVER, FS, DEP, and ABSTRACT contain links to other workbooks and cached values that disagree with formulas in this file | Do not prefer the cache over the local formula, or the reverse |
| 16 | Item number 19.1 | Stored as a binary float | Store `19.1` as text. That is data handling, not a rate decision |
| 17 | YP years 93–100 | Year present, factor blank | Block. Do not interpolate |
| 18 | Duplicate RA rows | 45 and 105; 107 and 113 | Flag as duplicates. Do not merge |
| 19 | Two TMT items | 27 at ₹ 8823.10 and 121 at ₹ 7514.20. This case uses 121 | `AMBIGUOUS` until a mapping is validated. Replay of this case may record that the file used 121 |
| 20 | Software defaults | Life 45, salvage 10%, YP fallback | Not applied to this case or to new cases |
| 21 | Two drawings of gut 193 | Page 1: R7/R8 at 3.60 m, height 1.95 m, R2 posts 8+4, R2 X-rafters 13. Page 3: R7/R8 at 3.80 m, height 1.97 m, R2 posts 8, R2 X-rafters 3. Workbook matches page 3 on those sizes and counts, and still splits R8 rafters 7+6 | Attach both pages. Structured facts follow the page the engineer confirms. Replay of the workbook follows the workbook |
| 22 | R2 marked open on page 3 | Floor, plaster, and wood for R2 still exist on the sheet | Do not drop R2 from the replay. Do not ignore the word “open” |
| 23 | Opening sizes | Positions are on the plan. 0.85×1.75 and 0.60×0.80 are on the sheet and were not read as dimensions on the 14 pages | Sizes stay engineer-confirmed facts |
| 24 | Half-length rafter note on page 3 | “6 rafters, half length 1.9 m” against the workbook’s R8 split of 7+6 | Do not equate them automatically |
| 25 | Gut numbers reused | Gut 4, 161, and 07 each appear on more than one page, with different owners or different plans | A case is not identified by gut number alone |

These are not automatically errors in the engineering. They are conflicts the software must not settle.

---

## 29. Implementation phases

Generation of ordinary cases waits on validated rules. The replay fixture may be built earlier because it is labeled as replay.

### Phase 0 — Domain validation

- Objective: an engineer or the responsible office marks each row in section 28 and each formula in section 7 as accepted, rejected, or this-case-only.
- Deliverable: written decisions. “Not yet known” is an acceptable answer and leaves the rule in draft.
- Acceptance: decisions recorded for LA number, village, life, item 6 versus item 26, plaster, ceiling, steel factor, salvage, the page-1 versus page-3 drawing, and who may finalize.
- Risk if skipped: workbook defects or software defaults become the specification.

### Phase 1 — Store, cases, structures, evidence, rate import

- Database; case; many structures; evidence versions; import of the RA extract and YP 1–92 as unverified versions.
- UI: screen 1.
- Tests: item `19.1` round-trips as the string `19.1`; a case can hold a house and an empty shed; legacy case 165 still reads.
- Rollback: flag off; JSON path still serves legacy.

### Phase 2 — Building definition and candidate geometry

- Screen 2. Facts save without producing money.
- Tests: no quantity from a candidate wall; negative size rejected; a shed does not receive the house profile.
- Acceptance: gut-193 facts and both drawings can be stored.

### Phase 3 — Rule register

- Section 7 formulas stored as `DRAFT`, bound to the RA extract, each with an evidence note.
- Acceptance: a draft rule does not run unless the request is the named source-replay fixture.

### Phase 4 — Source replay

- Server replay produces the twelve nets, including the defective ranges, labeled `SOURCE_REPLAY`.
- Acceptance: ₹ 10,73,836 and the twelve quantities. Not offered as the default for a new case.

### Phase 5 — Review, rates, impact

- Accept, override, exclude, add, reset. Ambiguous rate stays unselected. Thickness change shows impact and does not clobber an override.
- Acceptance: masonry override keeps 28.37 as the generated value beside the new value.

### Phase 6 — Abstract, depreciation, snapshot

- Replay fixture can reach ₹ 8,23,876 with rounding profile `WORKBOOK_193_REPLAY`.
- A missing Year’s Purchase year returns an error.
- Production path still refuses draft rules.
- Acceptance: one snapshot object; PDF not involved yet.

### Phase 7 — Exports

- PDF and Excel from the snapshot only.
- Acceptance: exported depreciated value equals the snapshot. Template source contains no `238687` and no `823876` literal.

### Phase 8 — Approval separate from calculation

- Prepared, reviewed, approved, finalized are different events.
- Prerequisite: the Phase 0 role answer, or an explicitly provisional matrix.
- Acceptance: a calculated snapshot can exist without `finalizedAt`.

### Phase 9 — Legacy freeze and security

- Case 165 stored as a legacy snapshot. Open registration closed. GET no longer saves. Login bypass removed.
- Acceptance: legacy tests pass against the frozen snapshot; new-case GET writes nothing.

### Phase 10 — Validated rules on a second real file

- Only rules Phase 0 marked validated may auto-generate.
- The second file should be one of the other guts in the field booklet, or another engineer workbook, so a shed or a non-193 plan is tried.
- Acceptance: the engineer can finish that property without a seeded bill, every auto line shows its formula, and missing shed facts block instead of copying the house.

---

## 30. Acceptance criteria

- A new case starts with no hidden 18-line bill and no hidden life, rate, salvage, or Year’s Purchase fallback.
- The field drawing is attachable evidence and is cited from generated lines.
- Each physical fact used by more than one line is stored once.
- Candidate geometry is visible and is not a quantity until confirmed.
- Every generated quantity opens to a formula, the inputs, the rule, and the evidence.
- Draft rules do not run on ordinary cases.
- The engineer can accept, edit, override, exclude, add, and reset. Override and exclude require a reason.
- An ambiguous rate is not auto-selected.
- Changing a fact shows the dependent lines and does not silently replace an override.
- Abstract quantity is the approved measurement-sheet net.
- Measurement sheet, abstract, depreciation, cover, PDF, and Excel for one snapshot show the same totals.
- A finalized snapshot is unchanged by a later rate edit or by GET.
- A missing Year’s Purchase year blocks depreciation.
- Source replay of case 193 matches ₹ 10,73,836 and ₹ 8,23,876 without treating that match as the production rule.
- There is no validated production golden until Phase 0 decisions exist.
- Case 165 remains a legacy snapshot only.
- More than one structure can exist. A shed is not a copy of the house.
- Calculated is not finalized.
- Reads do not write.
- The engineer sees about six screens. Internal routes may still be granular.
- Item numbers are strings.
- Full catalogue import is required before production go-live.

---

## 31. Risks

| Risk | Why it matters | What this plan does |
|---|---|---|
| Treating workbook formulas as the statewide method | The plaster range, the ceiling sum, life 10, and 50 kg/m³ may be local or wrong | They live in the source-replay fixture. Production rules stay draft until validated |
| Treating the field drawing as machine truth | Page 1 and page 3 disagree, and opening sizes are not dimensioned on the plan | Drawing is evidence. Facts are confirmed by the engineer |
| Assuming one house shape | The booklet has sheds, mesh, brick, open rooms, and different column counts | Structure list and member kinds cover that diversity. Missing facts block |
| Mixing the 2014-15 seed with the later schedules | Excavation is ₹ 120 versus ₹ 202.85 | Separate schedule versions. No production release on 18 rows |
| Forcing the engineer to type every wall | The room layout already suggests a perimeter | Candidates are proposed and must be confirmed |
| Forcing a catalogue browse on every line | Slow and error-prone | Unique match can map; ambiguity stays unresolved |
| Copying GET-and-save | Opening a page changes history | Calculate and finalize are explicit |
| Hardcoded certificate totals | The current step 10 already does this | Export test forbids embedded sample totals |
| Float item numbers | 19.1 already fails equality as a number | Store item numbers as strings |
| Adopting a temporary role matrix as office law | The code’s roles are not a delegation order | Role matrix is a go-live gate |

---

## 32. Open questions

All of section 28, plus:

1. Which signed schedule, page, and date belongs to each RA row?
2. Is useful life 10 an instruction for this construction, or only this file?
3. Is 50 kg of steel per cubic metre approved for these beams and columns, or only this sheet?
4. Should internal plaster be `(L+B)×H` or `2×(L+B)×H`, and are R7 and R8 included?
5. Is the R2 ceiling deduction part of the total?
6. Is RA item 6 the correct rate for the 19 columns?
7. Does this office apply salvage at all?
8. Who may review, who may approve, and who may finalize? Can a finalized case be superseded, and by whom?
9. Are panchanama and photographs mandatory?
10. Which of page 1 and page 3 is the measurement the workbook was taken from, and what does “R2 open” change?
11. Are opening sizes 0.85×1.75 and 0.60×0.80 confirmed against the site, given they are not dimensioned on the booklet pages?
12. For a gut that appears twice in the booklet (4, 7, 161), which sketch belongs to which owner?

---

## 33. Final user story

The engineer visits the property with a field sketch: rooms, a shed if there is one, wall thickness, openings, columns, and the roof members they can see. That drawing is kept on the case.

They enter the owner, the gut, the village, and the LA case once. If the drawing and an old sheet disagree, both stay visible until someone resolves them. They add each structure separately. A tin shed starts empty.

On the building screen they record the construction, the year, the rooms and where they sit, the openings, and the members. The sketch proposes walls from that layout. They confirm or correct the walls. They do not retype the same thickness into masonry, plaster, and deductions.

The measurement sheet fills only where a confirmed rule and a unique rate exist. Everything else is marked for confirmation, or left for them to add. They accept a line, change it and say why, or leave it out. The abstract uses those accepted quantities and the rate version pinned to the case. Depreciation uses the valuation date, the construction year, the life they entered or a validated table, and the Year’s Purchase row for that exact year. If the factor is missing, it stops.

When the authorized person finalizes, that set of figures is frozen. The measurement sheet, the abstract, the depreciation sheet, the cover, the PDF, and the Excel file all show that set, and they point back at the drawing and the facts. A later rate-book edit does not move the award. A correction is a new version. The old one remains.

---

## 34. Master tables

### Table A — Engineer workflow

| Screen | Engineer does | System does | Does not do |
|---|---|---|---|
| 1. Case and structures | Identity, dates, structure list, attach drawing | Stores one identity and empty structures | Copy a house onto a shed; hide a conflicting LA number |
| 2. Building definition | Profile, rooms, confirm walls, openings, members | Proposes candidate walls; draws a check sketch | Invent counts; treat a candidate as a quantity |
| 3. Generated measurement sheet | Reads formulas | Fills validated lines; marks the rest | Auto-pick an ambiguous rate |
| 4. Review, rates, abstract | Accept, override, exclude, add, choose a rate | Builds abstract from accepted nets | Retype quantity; overwrite an override silently |
| 5. Depreciation and finalize | Confirms life and date; finalizes if allowed | Exact Year’s Purchase lookup, or blocks | Hardcode 2026; apply salvage; treat a total as approval |
| 6. Documents | Exports | Renders the snapshot and lists evidence | Recalculate |

### Table B — Gut-193 items as observed

Confidence is “seen on this workbook”, not “approved for reuse”. Production status of every row is `DRAFT` / **DOMAIN VALIDATION REQUIRED**.

| Item | Observed formula | Unit | Production status |
|---|---|---|---|
| RA 1 Excavation | 3×15.35×0.25×0.40 + 5×5.80×0.25×0.40 + 5×5.65×0.25×0.40 | Cum | Draft. Replay only |
| RA 4 Soling | Same plan, depth 0.10 | Cum | Draft |
| RA 21 Beam | Same plan, depth 0.30 | Cum | Draft |
| RA 121 Steel | `ROUND(vol×50/100,2)` on beam and column volumes, summed | Qtl | Draft. 50 kg/m³ is not a default. Item 27 remains a possible alternative match |
| RA 19.1 AAC | Wall products minus 8 door and 8 window products | Cum | Draft. Item number stored as text |
| RA 6 used as columns | 19×0.15×0.15×1.97 | Cum | Draft. Description conflicts with the heading and with item 26 |
| RA 68 Wood | Sum of post, rafter, and pauli products | Cum | Draft. Counts are entered, not derived |
| RA 112 Tiles | Sum of eight room areas = 168.925 | Sqm | Draft. Page 3 marks R2 open |
| RA 98 Ceiling | 15.25×12.10. Deduction row not in the total | Sqm | Replay includes the defect. Not a validated rule |
| RA 30 External plaster | 2×15.25×1.97 + 2×12.10×1.97. No opening deduction | Sqm | Draft |
| RA 29 Internal plaster | `(L+B)×1.97` for a range that drops R7 and R8, minus opening areas | Sqm | Replay includes the defect. Not a validated rule |
| RA 97 Frames | 8×0.85×1.75 + 8×0.60×0.80 | Sqm | Draft. Not a frame volume |
| Other RA rows | No measurement in this case | As imported | Manual only |
| 18 seed rows | Legacy case 165 only | As in the seed | Not the new catalogue |

### Table C — Current to target

| Current behaviour | Target |
|---|---|
| Independent measurement lines | Facts once, derived lines, engineer review |
| 18 seed rates | Versioned, source-aware catalogues. Full import before production |
| Year’s Purchase fallback | Exact lookup or stop |
| Salvage 10% | Absent unless a validated rule exists |
| Life default 45 | Typed, or looked up from a confirmed table |
| One structure | Structure list. Shed facts are its own |
| Wall runs only if typed from scratch | Candidates from a confirmed room layout, then engineer confirmation |
| PDF literals | Snapshot export |
| GET calculates and saves | Explicit calculate. GET is read-only |
| Final row inserted as approved | Separate finalize |
| JSON file | Database, evidence versions, immutable snapshots |
| Float item numbers | String item numbers |
| “No field drawing” | Field booklet and section sketch are case evidence |

### Table D — Phases

| Phase | Work | Acceptance |
|---|---|---|
| 0 | Decide section 28 with an engineer or the office | Written decisions, including “not yet known” |
| 1 | Database, cases, structures, evidence, rate and YP import | `19.1` is text; two structures; legacy case still reads |
| 2 | Building definition and candidate geometry | Facts stored; candidates are not quantities |
| 3 | Draft rules | Draft rules do not run on a normal generate |
| 4 | Source replay | 12 quantities and 1073836, defects included, labeled replay |
| 5 | Review, ambiguous rates, impact list | Override history; ambiguity selects nothing |
| 6 | Snapshot | 823876 on the replay profile; missing YP fails; one snapshot |
| 7 | PDF and Excel | Export equals snapshot; no hardcoded totals |
| 8 | Review and finalize events | Calculated is not finalized |
| 9 | Freeze case 165; close write-on-GET and open registration | Old award unchanged; GET is pure |
| 10 | Second real property, validated rules only | A shed is not a copy of the house |

---

## 35. What changed

This revision keeps the previous architecture: one server snapshot, draft rules until validation, no default salvage, no Year’s Purchase fallback, string item numbers, versioned rates, immutable snapshots, and reads that do not write.

It corrects the plan in these ways:

1. The 14-page field booklet and the section sketch are formal case evidence. The statement that no field drawing existed is removed.
2. All 14 pages were read. The model is no longer one standard 8-room house. Sheds, mesh, pipes, angles, ballies, brick, open rooms, and different column counts are in scope. Missing facts block.
3. Gut 193 is cross-checked. Page 3 and the workbook agree on R7/R8 at 3.80 m and height 1.97 m. Page 1 records 3.60 m and 1.95 m. That conflict is left open.
4. The section sketch’s 0.15 / 0.30 / 0.10 / 0.40 / 0.25 m match the workbook section and are still not a renaming of “block masonry” to siporex.
5. Three benchmark levels replace any instruction that production must reproduce spreadsheet defects. Replay may keep the defects. The validated golden case does not exist yet. Legacy case 165 stays a legacy test.
6. Room placement may propose candidate walls. Quantities use confirmed walls only.
7. Applicability includes `AMBIGUOUS`. A unique rate may map. Several matches do not auto-select.
8. Rate rows carry schedule, version, string item number, source, and dates when known.
9. Evidence is versioned and the snapshot cites it. A quantity can show its formula, its facts, and its drawing.
10. An input change shows dependent lines and does not replace an accepted override.
11. The engineer UI is six screens. Internal APIs stay finer.
12. Approval roles are a go-live gate, not an assumption from the current code.
13. Full catalogue import is a go-live gate. Eighteen seed rows are not the catalogue.
14. Useful life 10, useful life 45, salvage 10%, steel 50 kg/m³, and the literal year 2026 are explicitly not production defaults.

---

## 36. Remaining domain validation gates

None of the following is decided by this plan:

- Which LA number and which village go on the certificate
- Whether page 1 or page 3 of gut 193 is the measurement to confirm, and what “R2 open” changes
- Opening sizes, which are on the workbook and not dimensioned on the booklet pages
- Useful life, and any classification table
- Year’s Purchase table to use for new cases, beyond “exact match, no interpolation”
- Salvage, if any office uses it
- 50 kg/m³, or any other steel factor
- Which schedule, version, page, and date each rate belongs to
- Item 6 versus item 26 for the columns
- Internal plaster formula and whether R7 and R8 are included
- Whether external plaster deducts openings
- Whether the R2 ceiling deduction is in the total
- Centre-line adjustments of 0.10 m and 0.05 m
- Rounding policy where the workbook and the software differ
- Who prepares, reviews, approves, and finalizes
- Whether panchanama or photographs are mandatory

Until a row is signed off, the related rule stays draft, and ordinary cases do not auto-generate it.

---

## 37. Source replay benchmark

Fixture id: `SOURCE_REPLAY_CASE_193`.  
File: `evidance docs/Copy of 193 eknath pandurang tharkar (1).xlsx`.  
Label on outputs: `SOURCE_REPLAY`. Not a production default.

| Check | Expected stored result |
|---|---|
| Abstract total | 1073836 |
| Depreciated value | 823876 |
| Excavation | 10.33 cum × 202.85 = 2095 |
| Soling | 2.58 cum × 2130.40 = 5496 |
| RCC beam item 21 | 7.75 cum × 12639.70 = 97958 |
| TMT item 121 | 4.29 qtl × 7514.20 = 32236 |
| AAC item 19.1 | 28.37 cum × 7152.10 = 202905 |
| RCC item 6 | 0.84 cum × 7578 = 6366 |
| Jungle wood item 68 | 5.14 cum × 56662.35 = 291244 |
| Tiles item 112 | 168.93 sqm × 507.10 = 85664 |
| Ceiling item 98 | 184.53 sqm × 1166 = 215162 |
| External plaster item 30 | 107.76 sqm × 637.25 = 68670 |
| Internal plaster item 29 | 95.27 sqm × 201.40 = 19187 |
| Frames item 97 | 15.74 sqm × 2976.70 = 46853 |
| Salvage | Absent |
| Present life formula as stored | `2026-D13` = 3, flagged unverified |
| YP | 5.389 and 7.024, exact lookup |
| Defects asserted, not corrected | Ceiling sum ignores −20.7; internal plaster sum drops R7 and R8; pasted amount cells; `#REF!`; external caches; float item 19.1 |

Field evidence attached to the fixture, not parsed into the fixture inputs: booklet pages 1 and 3, plus the section sketch. The replay inputs are the workbook cells. The drawing conflicts in section 5 are assertions in the test report, not alternate expected totals.

---

## 38. Validated production rules

No engineering formula in this plan is a validated production rule.

Not adopted, even though a source contains them:

- Useful life 45 (software)
- Useful life 10 (this workbook)
- Salvage 10% (software)
- Steel 50 kg per cubic metre (this workbook)
- Hardcoded valuation year 2026
- RA item 6 as the column rate
- Internal plaster `(L+B)×H` with R7 and R8 omitted
- Ceiling total that ignores the R2 deduction
- External plaster without opening deductions, as a general rule
- Any centre-line adjustment of 0.05 m or 0.10 m
- Any rate from the 18-row seed, for a new case
- Any role matrix inferred from the current code

No row in sections 28 or 36 has been signed off. A formula becomes a production rule only when that sign-off exists.

Platform controls that implementation must follow, because they are about traceability rather than a government constant:

- One server snapshot for every official figure
- Reads do not write
- Finalized snapshots are immutable; a change is a new version
- Item numbers are strings
- Missing Year’s Purchase factors block
- Ambiguous rates are not auto-selected
- Candidate geometry is not a quantity
- Evidence stays attached and is cited
- An override is kept when an upstream fact changes, and the line is marked for review

Those controls do not authorize a quantity.

---

## 39. Go-live blockers

1. Phase 0 decisions for the disputed formulas that production would auto-apply. Unanswered items stay manual.
2. A full rate catalogue, imported, normalized, versioned, and mapped to a schedule source. The 18 seed rows and the untagged 127-row extract are not sufficient.
3. A Year’s Purchase table version explicitly chosen for new cases, with blanks left blank.
4. A useful-life rule, or an explicit decision that life is always typed. No default of 10 or 45.
5. A written decision that salvage is out of the new pipeline, or a validated salvage rule. Silence is not 10%.
6. The approval role matrix signed by the office. A provisional developer matrix is not enough.
7. No write-on-GET, no login bypass, no embedded sample totals, no Year’s Purchase fallback, in the build that is released.
8. Source-replay tests green, and legacy case 165 still reproduced only as a legacy snapshot.
9. A second real property, including a non-house structure, finished without copying another structure’s bill.
10. Evidence attached on that trial, and a finalized snapshot that cites the evidence and does not change when the rate master is edited afterwards.

---

## 40. Document control

This file is `FINAL_IMPLEMENTATION_PLAN.md`. It is a plan. It is not an approval of government rates, useful lives, or formulas.

| Layer | What it is allowed to mean |
|---|---|
| Current software | What the repository does today, including defects |
| Workbook | What this engineer file calculates, including defects. Source replay only |
| Field drawing and section sketch | What was observed on the pages. Evidence, not an automatic measure |
| Inference | A possible reading, such as 12.10 m = 5.9 + 5.75 + 0.15×3. Not coded as a rule |
| Validated rule | Only a decision recorded against section 32. None are recorded yet |

Where the workbook and the software disagree, neither becomes the new specification by default. Where the workbook disagrees with itself, or with page 1, or with page 3, neither side is silently preferred.

Catalogue source missing from repository; full catalogue must be imported and verified before implementation of a production release.
