# Dual Workflows: BUILDING vs LEGACY

## 1. Why two workflows exist

The product evolved from an earlier multi-step “legacy wizard” used by seeded historical cases (notably `CASE/2008-09/165`). A newer **BUILDING** workflow was introduced for new cases: multi-structure, plan-first geometry, fact-driven measurement drafts, pinned rates/YP, and snapshot finalize without the old salvage-first narrative.

Both remain in the product so that:

- New work uses the clearer BUILDING path.
- Older cases continue to open without forced conversion of old measurement lines into rooms.

## 2. Selection rule

| Condition | Workflow |
|---|---|
| Case created as new valuation case (current product) | `workflow: "BUILDING"` |
| Case has `workflow: "BUILDING"` | Six-screen building UI |
| Case has no `workflow` field, or is legacy seed | LEGACY wizard |
| Explicit legacy example | `CASE/2008-09/165` (Mohan Vishwanath Gai) |

A case with no `workflow` field is treated as legacy. Its old measurement lines are **not** converted into rooms.

## 3. BUILDING workflow (primary for the report)

Six screens:

1. Case and structures  
2. Building definition  
3. Generated measurement  
4. Review, rates, abstract  
5. Depreciation and finalize  
6. Documents  

Server calculations for new cases live under `/api/v1/workflow`. Quantities are written only by explicit generate / manual / decision / calculate / source-replay requests.

**Important product facts:**

- Useful life is **typed** by the engineer (not auto-filled with 10 or 45).
- New BUILDING cases have **no salvage step**.
- Missing Y.P. factor **blocks** depreciation.
- Finalize is limited to **ADMIN** until the office confirms the role matrix.
- A finalized snapshot is **not** updated in place.
- PDF/Excel export from the frozen snapshot; neither recalculates.

## 4. LEGACY workflow (compatibility)

Older documentation describes a longer wizard including measurement groups, abstract, Y.P. depreciation, second valuation / salvage materials abstract, recapitulation with salvage adjustment, panchanama evidence, and PDF certificate editing.

For the academic report:

- Describe LEGACY briefly as **backward compatibility**.
- Put detailed screenshots and narrative emphasis on **BUILDING** + the Eknath demo.

## 5. Report recommendation

Title the proposed system around the BUILDING workflow. Mention LEGACY in “system analysis / migration” so reviewers understand why two UIs exist without treating the old wizard as the future design.
