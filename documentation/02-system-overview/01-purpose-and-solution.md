# Purpose and Solution Summary

## 1. Purpose

Provide the Water Resources Department (pilot: Jigaon Sub-Division No. 2, Nandura) with a **single web application** to prepare, review, finalize, and export **building valuation estimates** for structures affected by irrigation / land-acquisition work, using official-style **CSR rates** and **Year’s Purchase depreciation**.

## 2. Solution in one paragraph

Officers sign in, open or create a **valuation case**, describe one or more **structures** (plan, construction, openings, members), **generate a measurement sheet**, bind items to a **pinned rate schedule**, prepare the **abstract (present cost)**, apply **Y.P. depreciation** from a pinned table, **finalize** a snapshot (admin), and **download PDF/Excel**. Standards (rates, Y.P.) and an **audit trail** live in the same application.

## 3. Solution map (problem → capability)

| Problem | Solution capability |
|---|---|
| Spreadsheet re-entry | Structured case + structure forms |
| Inconsistent item lists | Fact-driven MS draft + catalogue search |
| Wrong / typed rates | Bind from pinned CSR schedule |
| Opaque depreciation | Documented Y.P. formula + pinned table |
| Editable “final” numbers | Finalize freezes snapshot for export |
| No shared visibility | Cloud SPA + API + case registry |
| No trail | System audit trail |

## 4. High-level modules

1. **Authentication & roles**
2. **Dashboard**
3. **Projects registry**
4. **Valuation cases** (BUILDING + LEGACY)
5. **PWD CSR rate database**
6. **Y.P. factors table**
7. **System audit trail**
8. **Document export** (PDF / Excel)

## 5. Reference demonstration

- Case: `CASE-193-EKNATH-DEMO` (`case-eknath-gut193-demo`)
- Owner: Eknath Pandurang Tharkar
- Gut / Survey: **193**, Village Bondgaon
- Present cost: **₹10,73,836**
- Depreciated value: **₹8,23,876**
- Construction year **2023**, useful life **10** years (demo workbook alignment)

## 6. What “success” looks like operationally

An estimator can complete a new BUILDING case without leaving the app; a reviewer can open the same case and see how MS lines, rates, and depreciation were obtained; an admin can finalize and download a multi-section PDF (COVER / FS / DEP / ABSTRACT / MS) from the frozen snapshot.
