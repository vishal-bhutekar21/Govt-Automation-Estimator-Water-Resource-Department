# Background and Problem Statement

## 1. Domain background

Irrigation projects under the Water Resources Department acquire land and structures that fall in submergence or project footprints. For residential and allied buildings, departmental practice expects:

1. **Measurement** of construction items (excavation, masonry, RCC, plaster, flooring, woodwork, etc.).
2. **Rate application** from a published **PWD CSR** (or project-approved) schedule for the relevant year.
3. **Abstract** aggregation → **present cost** of the structure.
4. **Depreciation** using **Year’s Purchase (Y.P.)** factors (commonly at 7% compound interest, and in some workbooks also 10% tables) based on useful life and remaining / future life.
5. Formal **panchanama / inspection evidence** and a signed valuation document for further LA processing.

The pilot office for this platform is **Jigaon Major Irrigation Project — Sub-Division No. 2, Nandura**, Dist. Buldhana.

## 2. Existing practice (before this system)

Typical field practice relied on:

- Spreadsheet workbooks (measurement sheets, abstracts, Y.P. lookup).
- Manual copy of CSR item numbers and rates.
- Separate files per case with weak version control.
- Limited shared visibility for checkers / executive engineers.
- Difficult audit of *who changed quantity, rate, or depreciation*.

## 3. Problem statement

**Manual, spreadsheet-centric building valuation for irrigation land acquisition is error-prone, slow to review, and hard to audit.** Quantity rules, rate binding, and Y.P. depreciation are not enforced in one controlled system, so different officers can produce inconsistent abstracts for similar structures, and finalized figures can be altered without a clear freeze point.

## 4. Consequences of the problem

| Area | Impact |
|---|---|
| Accuracy | Float / rounding mistakes; wrong Y.P. row; mismatched CSR item |
| Time | Re-keying dimensions and rates for every case |
| Transparency | Hard to show how present cost and depreciated value were derived |
| Continuity | Spreadsheets live on individual machines; office handovers lose context |
| Compliance posture | Weak evidence trail for review against CSR / Y.P. circular practice |

## 5. Need for a software solution

The office needs a **single platform** that:

- Captures case identity and structure facts once.
- Derives measurement drafts from those facts (with engineer review).
- Binds rates from a **pinned schedule**, not free-typed numbers alone.
- Computes abstract and depreciation with **documented formulas**.
- Freezes a **finalized snapshot** for PDF/Excel export.
- Keeps an **audit trail** of material actions.

That need is the motivation for this project.
