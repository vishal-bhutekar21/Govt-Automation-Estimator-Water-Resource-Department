# Project Report Outline (Standard Structure)

Use this chapter map when drafting the final report. Each chapter maps to a folder in this pack. Suggested figure numbers refer to files in `screenshots/`.

---

## Front matter

| Section | Source in this pack |
|---|---|
| Title page | Product name + WRD / Jigaon context — see `README.md` |
| Certificate / declaration | Institution templates (not supplied here) |
| Acknowledgement | Institution templates |
| Abstract | `01-introduction/01-abstract.md` |
| Table of contents | Generated from chapters below |
| List of figures / tables | Captions in `screenshots/SCREENSHOT-INDEX.md` |

---

## Chapter 1 — Introduction

| Section | File |
|---|---|
| 1.1 Background | `01-introduction/02-background-and-problem.md` |
| 1.2 Problem statement | same |
| 1.3 Objectives | `01-introduction/03-objectives-and-scope.md` |
| 1.4 Scope | same |
| 1.5 Stakeholders | same |
| 1.6 Organization of the report | this outline |

**Figures:** Fig. 1 Dashboard (`01-dashboard.png`)

---

## Chapter 2 — Literature / Domain Context (optional short chapter)

| Topic | Notes from pack |
|---|---|
| PWD CSR rate schedules | `03-features-modules/`, `08-appendices/01-glossary-and-formulas.md` |
| Year’s Purchase (7% / 10%) depreciation | formulas appendix |
| Land acquisition / irrigation submergence valuation practice | introduction + system overview |

*(No external literature review is pre-written; the report writer may add citations.)*

---

## Chapter 3 — System Analysis & Proposed Solution

| Section | File |
|---|---|
| 3.1 Existing (manual / Excel) process | `01-introduction/02-background-and-problem.md` |
| 3.2 Proposed solution | `02-system-overview/01-purpose-and-solution.md` |
| 3.3 Users and roles | `02-system-overview/02-users-and-roles.md` |
| 3.4 Dual workflows (BUILDING vs LEGACY) | `02-system-overview/03-dual-workflows.md` |

**Figures:** Fig. 2 Cases registry; Fig. 3–8 Building screens 1–6

---

## Chapter 4 — Requirements & Features

| Section | File |
|---|---|
| 4.1 Functional requirements / feature catalogue | `03-features-modules/01-feature-catalogue.md` |
| 4.2 Non-functional requirements | same (security, precision, audit) |

---

## Chapter 5 — System Design

| Section | File |
|---|---|
| 5.1 Architecture | `04-technical-design/01-architecture.md` |
| 5.2 Technology stack | `04-technical-design/02-technology-stack.md` |
| 5.3 Data model (high level) | `04-technical-design/03-data-and-apis.md` |
| 5.4 APIs | same |
| 5.5 Security | same |

---

## Chapter 6 — Implementation / Workflows

| Section | File |
|---|---|
| 6.1 BUILDING 6-screen workflow | `05-workflows/01-building-six-screens.md` |
| 6.2 Measurement sheet, abstract, depreciation | `05-workflows/02-ms-abstract-depreciation.md` |
| 6.3 LEGACY wizard (summary) | `05-workflows/03-legacy-workflow.md` |
| 6.4 Exports (PDF / Excel) | building screens doc + documents screenshot |

**Figures:** Screens 1–6, Rates DB, YP table, Login

---

## Chapter 7 — Deployment

| Section | File |
|---|---|
| 7.1 Hosting topology | `06-deployment/01-hosting-and-env.md` |
| 7.2 Environment configuration | same |

---

## Chapter 8 — Testing & Results

| Section | File |
|---|---|
| 8.1 Test approach | `07-testing-evidence/01-verification.md` |
| 8.2 Demo case results (Gut 193 / Eknath) | same |
| 8.3 Screenshots as evidence | `screenshots/` |

**Key result to cite:** Present cost **₹10,73,836**; Depreciated value **₹8,23,876** for `CASE-193-EKNATH-DEMO`.

---

## Chapter 9 — Conclusion & Future Work

| Section | File |
|---|---|
| 9.1 Conclusion | `01-introduction/04-conclusion-and-future-work.md` |
| 9.2 Limitations | same |
| 9.3 Future enhancements | same |

---

## Appendices

| Appendix | File |
|---|---|
| A Glossary & formulas | `08-appendices/01-glossary-and-formulas.md` |
| B Sample numbers / demo case | `08-appendices/02-sample-case-numbers.md` |
| C Report writer checklist | `08-appendices/03-report-writer-checklist.md` |
| D Screenshot index | `screenshots/SCREENSHOT-INDEX.md` |

---

## Writing rules for the report author

1. Do **not** invent features that are not listed in `03-features-modules/`.
2. Prefer the **BUILDING** workflow as the primary “proposed system” narrative; mention LEGACY as compatibility for older cases.
3. Keep compensation / legal claims carefully worded: the platform supports **valuation estimates** for departmental use; it does not replace statutory LA authority decisions.
4. Insert screenshots with the captions from `SCREENSHOT-INDEX.md`.
5. Use decimal/paisa precision and YP formula exactly as stated in the appendices.
