# UX data-entry audit

Audited from the building workspace as it stood before this correction: `frontend/src/pages/valuation/ValuationWorkspace.tsx`, `frontend/src/pages/cases/CaseCreationModal.tsx`, and the workflow API.

`Government_Building_Valuation_Detailed_Engineering_Derivation_Spec.docx` is not in the repository. It was not used. No formula in this audit is treated as a validated government rule.

Labels:

- KEEP AS USER INPUT — the engineer is the source.
- DERIVE AUTOMATICALLY — show it from facts already saved. Do not ask again.
- SELECT FROM MASTER — choose from data the platform already holds.
- SHOW ONLY WHEN NEEDED — hide until the engineer is on that fact.
- REMOVE — the control asks the engineer to do the platform’s job.
- COMPUTED / READ-ONLY — display only.
- ENGINEER CONFIRMATION — the engineer accepts or rejects a proposal.
- DOMAIN VALIDATION REQUIRED — no approved list or formula exists yet.

There are no validated production rules. Draft suggestions stay draft.

## How a case opens

A new case is blank except the inspection date and the valuation date, which start as today. Village, taluka, district, and case number are not prefilled. House number is optional. An older case with no building workflow, including case 165, still opens the previous wizard.

## Create-case form

| Field | Control | Default | Mandatory | Kind | Already known elsewhere | Engineer can know it | Classification |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Project | Select | First project in the list | Yes | Select | Project registry | Yes | SELECT FROM MASTER |
| Case number | Text | Empty | Yes | String | No | Yes, it is the file number | KEEP AS USER INPUT |
| Owner | Text | Empty | Yes | String | No | Yes | KEEP AS USER INPUT |
| House number | Text | Empty | No | String | No | Yes, when the house has one | SHOW ONLY WHEN NEEDED |
| Village, taluka, district | Text | Empty | No | String | No approved place list | Yes, from the site | KEEP AS USER INPUT. A place master is DOMAIN VALIDATION REQUIRED |
| LA case number | Text | Empty | No | String | Sometimes conflicts with the cover sheet | Yes | KEEP AS USER INPUT |
| Survey / gut number | Text | Empty | No | String | No | Yes | KEEP AS USER INPUT |
| Inspection date | Date | Today | No | Date | No | Yes | KEEP AS USER INPUT |
| Valuation date | Date | Today | No | Date | Its year is the depreciation year | Yes | KEEP AS USER INPUT. Valuation year is DERIVE AUTOMATICALLY |

## Screen 1 — Case and structures

| Field | Control | Default | Mandatory | Kind | Classification |
| --- | --- | --- | --- | --- | --- |
| Owner, gut, house, village, taluka, district, LA case | Text | Values from creation | Owner already required | String | KEEP AS USER INPUT. Do not ask again on later screens |
| Valuation date | Text, not a date picker | Saved date | No | String today | KEEP AS USER INPUT, but the control must be a date |
| Conflicting identity notes | Text | Empty | No | String | SHOW ONLY WHEN NEEDED, when two identifiers disagree |
| Rate schedule | Select | Not pinned | Needed before money | Select of imported schedules | SELECT FROM MASTER. There is no screen to type a rate |
| Year’s Purchase table | Select | Not pinned | Needed before depreciation | Select of imported tables | SELECT FROM MASTER |
| Structure name | Text | “Main house” | A structure is needed before screen 2 | String | KEEP AS USER INPUT, with the names the plan already uses: main house, tin shed, open shed, store, or a typed name |
| Evidence type | Select | Field drawing | File required only if attaching | Select | SELECT FROM MASTER |
| Evidence file and note | File and text | Empty | No | File | KEEP AS USER INPUT. Dimensions are not read from the file |

The screen does not say what is still missing. The engineer has to open every later screen to find out.

## Screen 2 — Building definition

| Field | Control | Default | Mandatory | Kind | Classification |
| --- | --- | --- | --- | --- | --- |
| Structure picker | Select | First structure | Yes if one exists | Select | SELECT FROM MASTER |
| Type | Blank text | Empty | No | String | KEEP AS USER INPUT. No approved type list. DOMAIN VALIDATION REQUIRED for a material master |
| Wall material | Blank text | Empty | No | String | KEEP AS USER INPUT. Not a rate selection |
| Wall thickness | Blank text | Empty | Needed for wall volume | Number stored as metres, unit not shown on the control | KEEP AS USER INPUT, with metres or millimetres visible |
| Storey height | Blank text | Empty | Needed for wall volume | Number, unit not on the control | KEEP AS USER INPUT, labelled height, unit metres |
| Construction year | Blank text | Empty | Needed for depreciation | Number | KEEP AS USER INPUT as a year. Do not assume 2023 |
| Useful life | Blank text | Empty | Needed for depreciation | Number | KEEP AS USER INPUT. Do not assume 10 or 45. A life table is DOMAIN VALIDATION REQUIRED |
| Floor, roof | Blank text | Empty | No | String | KEEP AS USER INPUT. They do not select a rate |
| External and internal finish | Not shown | Empty on the record | No | String | SHOW ONLY WHEN NEEDED. Hidden is acceptable until a validated finish rule exists |
| Room code, length, breadth | Blank text | One empty row | Code required to save | Mixed | KEEP AS USER INPUT. Show the unit. Floor area is DERIVE AUTOMATICALLY |
| Row and bay | Blank text | Empty | No | Number | SHOW ONLY WHEN NEEDED, under layout. Empty means no wall plan is invented |
| Enclosure | Select Unknown / Enclosed / Open | Unknown | No | Select | KEEP AS USER INPUT as a segmented control |
| Candidate wall confirm / reject | Buttons | None until proposed | No | Action | ENGINEER CONFIRMATION. A candidate is not a quantity |
| Manual wall label and length | Text | Empty | Both required to add | String and number | KEEP AS USER INPUT. The old one-metre wall is already gone |
| Opening code | Text default D1 | D1 | The button adds a door immediately | String | REMOVE the one-click add. Ask kind, count, width, and height together |
| Opening count, width, height | Not on the screen | Null | Needed before an opening quantity | Number | KEEP AS USER INPUT. Today they are missing, so the engineer cannot finish an opening |
| Member kind | Select of internal names such as RAFTER_X | Column | The button adds a member with a null count | Select | SHOW ONLY WHEN NEEDED after the engineer picks columns, beams, or roof members. Use engineering words |
| Member count and three sizes | Not on the screen | Null | Needed before a volume | Number | KEEP AS USER INPUT. A missing count is not zero |

Nothing on this screen shows room areas, wall volume, or which later items can use these facts.

## Screen 3 — Generated measurement

| Control | What it does | Classification |
| --- | --- | --- |
| Check what can be measured | Lists four draft suggestions and writes no quantities | KEEP. It must say what is missing in engineering words |
| Create draft line | Builds one suggestion that still needs acceptance | ENGINEER CONFIRMATION. Not an automatic production line |
| Line list | Title, status, derived quantity | COMPUTED / READ-ONLY |

The four drafts are floor area, confirmed wall volume, opening area, and member volume. Plaster, ceiling, steel, soling, and excavation are not produced here. Inventing those formulas is DOMAIN VALIDATION REQUIRED.

The list uses rule status text and does not say “add a wall” or “add a door size”.

## Screen 4 — Review

| Control | Default | Problem | Classification |
| --- | --- | --- | --- |
| Accept | — | Clear | ENGINEER CONFIRMATION |
| Override quantity and reason | Quantity starts from the derived value | Reason is required by the API for a real override | ENGINEER CONFIRMATION |
| Exclude and reason | Empty reason | Reason required | ENGINEER CONFIRMATION |
| Reset | — | Returns the line to review | ENGINEER CONFIRMATION |
| Item number text | Empty, placeholder 19.1 | The engineer must know the catalogue number | REMOVE as the normal path. SELECT FROM MASTER by description |
| Match rate | Uses the typed number | Duplicate numbers select nothing | SELECT FROM MASTER. Ambiguous rows stay unselected |
| Add measured item: title, quantity, unit, reason | Unit starts as cum | The engineer types the unit and the title with no catalogue | Unit is COMPUTED / READ-ONLY after an item is chosen. Quantity and reason stay KEEP AS USER INPUT |

Rate amount is not shown until the abstract. The rate itself should be read-only after selection.

## Screen 5 — Depreciation

| Shown | Classification |
| --- | --- |
| Present cost, depreciated value, abstract lines, formula, rounding profile, blockers | COMPUTED / READ-ONLY |
| Recalculate | Action. Does not change a finalized snapshot |
| Accept depreciation | ENGINEER CONFIRMATION |
| Finalize | Administrator only. Refused while a blocker remains |

Future life is the typed useful life minus the years between construction and the valuation date. It is DERIVE AUTOMATICALLY. There is no salvage field. Useful life is not defaulted.

## Screen 6 — Documents

PDF and Excel are COMPUTED / READ-ONLY copies of one snapshot. Opening them does not recalculate. Source replay is a separate fixture. It is not the next house’s rule.

## Duplicates the engineer is asked to retype

| Fact already saved | Asked again today | Should be |
| --- | --- | --- |
| Room length and breadth | Not asked again for floor area, but floor area is also not shown | Show the area. Do not ask for it |
| Wall thickness and height | Not copied onto a masonry form, because masonry is not a guided item | When a draft wall line is considered, show the saved thickness and height |
| Opening sizes | Cannot be entered, so they also cannot be reused | Enter once on the opening |
| Valuation year | Not asked separately | Read from the valuation date |
| Catalogue unit and rate | Typed or matched by item number | Locked after the engineer picks the description |
| Item number | Typed | Hidden as an input. Visible on the chosen item |

## What this correction will not do

It will not add a validated masonry, plaster, steel, or centre-line rule. It will not copy one structure onto another. It will not select an ambiguous rate. It will not put a draft quantity on the abstract until the engineer accepts that line. It will not fill useful life, salvage, or a sample village.
