# Plan Creation Change Map (Phase 1)

Written from the current repository after the grid/structure work, the Gut 193 workbook, the 14-page field PDF, and the section JPEG (wall 0.15 m / ground beam 0.30 m / soling 0.10 m / foundation 0.25 m).

`Government_Building_Valuation_Detailed_Engineering_Derivation_Spec.docx` was not found. Nothing from it was guessed. No new valuation formulas are introduced.

## CURRENT PLAN CREATION (before Phase 1)

- New cases use `workflow: "BUILDING"` and `ValuationWorkspace` / `BuildingGuide`.
- Rectangular grid input existed: long side, short side, columns × rows, equal or unequal spans.
- Live SVG check sketch drew thin lines and room labels (no thickness).
- Persist via `PUT /structures/:id/structure-layout`. Confirm → walls `ENGINEER_CONFIRMED`.
- Rooms generated with `boundaryWallIds`. Shared walls are single objects.
- Structure kinds were free-text chips only. GI shed / open shed / porch were not first-class plan modes.
- Wall thickness was a construction field only; dimension convention was not stated in the UI.
- Legacy `CASE/2008-09/165` stays on the wizard. Auth/roles/deploy unchanged.

## PHASE 1 STATUS

Implemented in this pass: structure kinds, thick-wall SVG, CLEAR_INTERNAL convention, equal/unequal grid, simple-plan for sheds/porch, wall/room patches (zones, enclosure, thickness/height override), property strip, Eknath fixture + multi-structure tests, inheritance sync on profile save.

## TARGET PLAN CREATION

Phase 1 = complete physical plan creator:

1. Engineer picks a structure kind.
2. For Main House / Store: overall or measured spans + grid → rooms, walls, relationships, thick-wall sketch.
3. For GI Shed / Open Shed: length × width × height + open sides; no forced rooms.
4. For Porch/Veranda: attach to another structure on a side + size; relative property plan.
5. Click room/wall to inspect inherited vs overridden thickness/height and vertical zones.
6. Confirm plan before walls are eligible as confirmed geometry.
7. Multiple structures in one case stay independent.
8. Source facts vs derived facts stay distinct. No measurement-sheet formulas in this phase.

## DATA MODEL

`BuildingStructure` additions:

| Field | Purpose |
|---|---|
| `structureKind` | `MAIN_HOUSE` \| `GI_SHED` \| `OPEN_SHED` \| `PORCH` \| `STORE` \| `OTHER` |
| `dimensionConvention` | Fixed `CLEAR_INTERNAL` for this release |
| `openSides` | `{ front, rear, left, right }` booleans |
| `attachedToStructureId` | Porch host |
| `attachedSide` | `FRONT` \| `REAR` \| `LEFT` \| `RIGHT` |
| `foundationWidthM`, `groundBeamDepthM`, `solingDepthM` | Optional physical facts from section sketch; not calculation rules |
| `planNotes` / `evidenceConflictNotes` | Engineer notes for page 1 vs page 3 conflicts |

`RoomFact`: keep `enclosure` (`ENCLOSED` \| `OPEN` \| `UNKNOWN`); add `PARTIALLY_OPEN`. Keep `generated`, `boundaryWallIds`.

`WallRunFact` additions:

| Field | Purpose |
|---|---|
| `segmentKind` | `OUTER` \| `INTERNAL` \| `PARTITION` \| `LOW_WALL` \| `OTHER` |
| `thicknessM` | Explicit thickness (inherits structure when null) |
| `heightM` | Explicit height (inherits structure when null) |
| `thicknessSource` / `heightSource` | `INHERITED` \| `OVERRIDE` |
| `verticalZones` | `[{ id, kind: MASONRY\|MESH\|OTHER, heightM, notes }]` |

Opening/member models already exist; UI wires openings to selected wall where practical. No new quantity rules.

## UI CHANGES

- Structure add: choose kind first.
- Kind-specific plan panels (house grid / shed / porch).
- Explicit copy: room/grid spans are clear (internal) dimensions; wall thickness is drawn and stored separately.
- Sketch shows wall thickness, clickable rooms/walls, property inspector.
- Property structures strip: status per structure + simple relative layout.
- Construction facts (material, thickness, height, year, life, floor, roof) remain below the plan.
- Room-by-room primary entry stays removed for rectangular houses.

## GEOMETRY GENERATOR

- Equal: `span = overall / count`.
- Unequal: measured spans; overall clear size = sum(spans).
- Walls: 2 outer long + 2 outer short + (C−1) vertical shared + (R−1) horizontal shared.
- Thickness drawn in SVG from structure or wall override; clear spans are not silently resized.
- Shed/porch: single rectangle geometry, optional open-side gaps, no room grid.
- Gut 193 fixture uses workbook-aligned unequal spans as a regression source example only.

## MULTI-STRUCTURE MODEL

Case → many `BuildingStructure` rows. New structure starts empty. No copy of rooms, spans, thickness, height, or members from another structure. Porch may reference `attachedToStructureId` for relative placement only.

## SAVE / LOAD CHANGES

- Extend `structure-layout` for house grids.
- Add/update endpoints for shed/porch plan save, wall override, room enclosure, structure kind.
- Each save remains independent. Confirmed plan requires acknowledgement to regenerate.

## FILES AFFECTED

- `PLAN_CREATION_CHANGE_MAP.md` (this file)
- `backend/src/workflow/types.ts`
- `backend/src/workflow/gridGeometry.ts`
- `backend/src/controllers/workflowController.ts`
- `backend/src/routes/workflowRoutes.ts`
- `backend/test/grid_geometry.test.ts`, `structure_layout.test.ts`, new plan tests
- `frontend/src/pages/valuation/*` (layout panel, sketch, building guide, workspace)
- `docs/BUILDING_WORKFLOW.md`

## API CHANGES

- `PUT /structures/:id/structure-layout` — house/store grid (extended body)
- `PUT /structures/:id/simple-plan` — shed / open shed / porch rectangle + open sides / attachment
- `PATCH /wall-runs/:id` — thickness/height override, segment kind, vertical zones
- `PATCH /rooms/:id` — enclosure
- `POST /cases/:id/structures` — accepts `structureKind`

## TESTS

Equal 4×2 / 1×4 / 4×1 / 1×1; unequal span sums; thickness source; open room; multi-structure isolation; porch attachment; low wall + mesh zones; save/load; regenerate with ack; Eknath unequal fixture; legacy case 165.

## LEGACY SAFETY

No change to auth, roles, JWT, Vercel, CI, legacy wizard, salvage, YP, or gut-193 money totals. Draft rules stay draft. Candidate/generated walls remain non-quantities until confirmed.

## LIMITATIONS

- No L-shaped freehand CAD.
- No automatic conversion of clear spans into workbook-style outer wall-run formulas (those stay source-specific / domain validation).
- Foundation facts are stored only; excavation/soling/RCC are not calculated here.
- Property layout is relative, not cadastral.
- Page 1 vs page 3 conflicts are notes + engineer confirmation, not auto-merged.
- Grid room codes are row-major (R1… across the first row). The Gut 193 workbook pairs room codes differently against the same clear spans; the fixture asserts spans/topology, not workbook sheet order of L×B labels.
- Sketch regenerates client-side from spans; wall click targets use generated geometry ids matching the server when layout is saved.
