# Building valuation workflow

New cases are created with `workflow: "BUILDING"`. They open six screens:

1. Case and structures
2. Building definition
3. Generated measurement
4. Review, rates, and abstract
5. Depreciation and finalize
6. Documents

Legacy cases, including `CASE/2008-09/165`, keep the previous wizard. A case with no `workflow` field is treated as legacy. Its old measurement lines are not converted into rooms.

The server calculation for a new case lives under `/api/v1/workflow`. `GET` reads. Quantities are written only by an explicit generate-suggestion, manual line, decision, calculate, or source-replay request.

There are no validated production quantity rules in this release. Suggestions are marked `DRAFT`. The gut-193 workbook totals are available only through `POST /api/v1/workflow/cases/:caseId/source-replay`, which stores a snapshot labelled `SOURCE_REPLAY`.

Candidate wall runs are not quantities. Confirm a wall, or add one manually, before a wall-volume suggestion can be created.

A missing Year’s Purchase factor blocks depreciation. Useful life is typed. It is not filled with 10 or 45. New cases have no salvage step.

Finalize is limited to `ADMIN` until the office confirms the role matrix. A finalized snapshot is not updated in place.

PDF and Excel exports read the snapshot. They do not call the legacy depreciation or salvage calculators.
