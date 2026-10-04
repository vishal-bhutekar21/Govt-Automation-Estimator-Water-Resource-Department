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

There are no validated production quantity rules in this release. Suggestions are marked `DRAFT`. Gut-193 workbook nets can also be produced on the platform path: confirm a 4×2 unequal plan → generate-measurement → accept-draft-blocks (unique rates) → calculate. Source replay (`POST .../source-replay`) remains a separate fixture labelled `SOURCE_REPLAY`. Both paths target present cost 1073836 and depreciated value 823876 when the workbook rate extract and YP rows are pinned.

Candidate wall runs are not quantities. Confirm a wall, or add one manually, before a wall-volume suggestion can be created.

A missing Year’s Purchase factor blocks depreciation. Useful life is typed. It is not filled with 10 or 45. New cases have no salvage step.

Finalize is limited to `ADMIN` until the office confirms the role matrix. A finalized snapshot is not updated in place.

PDF export is a single compiled valuation report with COVER / FS / DEP / ABSTRACT / MS sections from the frozen snapshot. Excel export remains a text dump of the same snapshot. Neither recalculates.

## What the engineer sees

The engineer describes the property. The case header lists what still needs attention.

On Building definition, the physical plan comes first. For a main house or store, enter the overall clear size and a columns × rows grid (equal or measured unequal spans). A thick-wall SVG check sketch updates as those values change. Rooms and primary wall runs are derived and saved through `PUT /structures/:id/structure-layout`. Confirming the structure marks generated walls as engineer-confirmed. GI / tin sheds, open sheds, and porches use `PUT /structures/:id/simple-plan` (length × width, open sides, optional attachment) and do not invent rooms. Room and grid spans are clear/internal dimensions; wall thickness is stored and drawn separately. Construction facts (material, thickness, height, life, floor, roof, optional foundation section facts) sit below the plan. Openings and members are entered once, with units on the fields. Floor area is derived from the generated rooms.

Screen 3 reads those facts through the rule registry:

- **Ordinary cases** use a fact-driven residential draft pack (`draft.*`): excavation / soling / ground beam from confirmed wall runs + foundation depths; wall masonry when wall material is selected; floor and roof/ceiling from room areas when finishes are selected; plaster from walls/rooms; columns and timber from the member schedule.
- **Gut-193 Eknath profile only** (confirmed 4×2 unequal spans matching the workbook pattern) uses `eknath.*` source-draft formulas with workbook length adjustments. Ordinary `draft.*` lines are not mixed into that sheet.

Nothing is a production `VALIDATED_RULE` yet. **Generate measurement sheet** writes draft blocks for review. Screen 4 **Accept all draft lines** accepts only lines that already have a unique catalogue rate (ordinary lines often need Bind rates / catalogue search first). Source replay on Documents remains a separate workbook fixture.

On the review screen the engineer searches the pinned rate schedule by words such as AAC or plaster, then selects a row. The item number is not typed. The unit and the rate come from that row. If two rows share an item number, both are shown and neither is chosen automatically. A selected item with no validated formula asks for a measured quantity.

A second structure starts empty. It does not receive the house rooms. Gut 193 source replay is unchanged: present cost 1073836 and depreciated value 823876.

Missing information on screen 3 opens the matching part of the building screen. After that part is saved, the case is read again and the same screen shows the new state. A selected catalogue item is not reopened automatically. Wall material, floor, and roof are typed descriptions. They are not a material master, and they do not choose a rate or a formula.
