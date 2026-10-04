# Measurement Generation Change Map (Phase 2)

Written after auditing Screen 3, `guidance.ts`, `engine.ts`, workflow APIs, models, Eknath `SOURCE_REPLAY`, catalogue matching, and tests. Phase 1 plan creation is treated as done. No Phase 1 redesign unless a concrete bug blocks generation.

`Government_Building_Valuation_Detailed_Engineering_Derivation_Spec.docx` was not found. Nothing from it was guessed.

---

## PHASE 2 STATUS

Implemented in this pass: `MEASUREMENT_GENERATION_CHANGE_MAP.md`; rule registry (12 Eknath `DRAFT` + 4 generic; 0 validated); derived-fact graph; `POST .../generate-measurement`; Screen 3 generate button; guidance from registry; tests for Gut-193-like nets + accept protection + replay unchanged.

## CURRENT

```
Confirmed plan / facts (Phase 1)
        ↓
GET bundle + guidanceFor()  → preview only (4 generic draft helpers)
        ↓
POST draft-lines (one rule at a time) → MeasurementBlockFact REQUIRES_CONFIRMATION, UNMAPPED
        ↓
Review accept / override / manual-block
        ↓
POST calculate → PLATFORM snapshot from accepted nets
```

Parallel money path (not from case geometry):

```
POST source-replay → hardcoded REPLAY_LINES (12 items) → ₹10,73,836 / ₹8,23,876
```

| What exists | Detail |
|---|---|
| Draft rules | `draft.room-floor.v1`, `draft.confirmed-wall-volume.v1`, `draft.opening-area.v1`, `draft.member-volume.v1` |
| Validated rules | **None** (`VALIDATED_RULES = []`) |
| Foundation facts | Stored (`foundationWidthM`, `groundBeamDepthM`, `solingDepthM`) — **unused by any rule** |
| Wall volume draft | Uses structure thickness/height only; ignores wall-level overrides |
| Screen 3 | Displays the four helpers; never auto-writes; no excavation/plaster/ceiling/steel |
| Catalogue bind on draft | Not wired; drafts start `UNMAPPED` |
| case193_e2e | Proves money via **manual** 12 lines or replay — not facts→generate |

---

## TARGET

```
SOURCE FACTS (entered once)
  rooms, confirmed walls, thickness, height, foundation section,
  openings, columns/posts/rafters/Pauli, finishes
        ↓
DERIVED FACT GRAPH
  room areas, foundation run lengths, wall volumes, opening volumes,
  member volumes, plaster faces (where rule defined)
        ↓
RULE REGISTER (applicability + formula + status)
        ↓
GENERATED MEASUREMENT SHEET (draft / replay-only blocks)
        ↓
ENGINEER REVIEW (accept / override+reason / exclude / pin rate)
        ↓
ABSTRACT + depreciation snapshot
```

Product rules:

1. Engineer enters physical facts; platform derives quantities.
2. No re-entry of thickness/height/room L×B/opening sizes for dependent items.
3. UI does **not** hardcode “if RA 19.1 …”. It renders `ApplicabilityResult` / `QuantityResult`.
4. Only `VALIDATED_RULE` may auto-generate a **production** quantity. Eknath source formulas ship as `DRAFT` or `REPLAY_ONLY`.
5. Source replay remains available and stays labeled; it is not replaced as the universal default.

---

## RULE MODEL

```ts
MeasurementRule {
  ruleId: string
  catalogueItemNumber: string | null   // e.g. "19.1", "1" — string, never float
  name: string
  status: 'DRAFT' | 'VALIDATED_RULE' | 'REPLAY_ONLY' | 'DISABLED'
  unit: string
  applicability: (ctx) => ApplicabilityResult
  requiredFacts: FactKey[]
  dependencies: FactKey[]              // derived facts this rule reads
  formulaText: string
  evidenceNote: string                 // workbook / field reference
  compute: (ctx) => QuantityResult | MissingFacts
}
```

| Status | Meaning |
|---|---|
| `DRAFT` | May generate a **candidate** measurement block marked draft; not production-valid |
| `REPLAY_ONLY` | Used only inside named source-replay / source-profile generation; never ordinary default |
| `VALIDATED_RULE` | May auto-generate production quantities when applicable |
| `DISABLED` | Hidden |

Eknath twelve-item formulas: **`DRAFT`** for generate-from-facts path, and the existing **`SOURCE_REPLAY`** fixture remains for money parity. None are auto-promoted to `VALIDATED_RULE`.

---

## DEPENDENCY MODEL

### Source facts (Phase 1 + schedules)

- Structure: overall / spans / grid / `wallThicknessM` / `storeyHeightM` / foundation width / ground-beam depth / soling depth / excavation depth (add if missing)
- Rooms: code, L, B, enclosure, row/col
- Walls: confirmed runs, length, kind, thickness/height override, zones
- Openings: kind, count, W, H, host wall
- Members: kind, count, L, B, D, room
- Finishes: floor / roof / plaster text (applicability hints only until validated)

### Derived facts (computed, not re-typed)

| Derived | From |
|---|---|
| `room.area` | room L × B |
| `floor.area.sum` | applicable rooms (enclosure policy explicit) |
| `foundation.longLength` | workbook-style: sum(column spans) + thickness×(C+1) + edge term when profile = EKNATH_SOURCE — **profile-bound**, not universal |
| `foundation.shortLengthA/B` | short spans ± thickness adjustments per source profile |
| `foundation.excavationDepth` | groundBeamDepth + solingDepth (or explicit excavation depth) |
| `wall.volume` | confirmed wall length × effective thickness × effective height |
| `opening.area` / `opening.volume` | count × W × H [× thickness] |
| `member.volume.byKind` | count × L × B × D grouped by kind |
| `steel.qtl` | RCC cum × factor (source profile only; factor not universal) |
| `plaster.external` / `internal` | faces × height − deductions per rule |

Missing required source facts → rule = `INPUT_REQUIRED`, no invented zero.

---

## DATA FLOW

1. Engineer confirms geometry + saves construction + openings + members.
2. `POST /structures/:id/generate-measurement` (or case-level generate) builds derived facts → evaluates registry → upserts draft blocks.
3. Guidance / Screen 3 lists every rule result (applicable / missing facts / draft quantity / formula / sources).
4. Engineer accepts blocks; pins catalogue row when `UNIQUE` match on item number, or chooses when `AMBIGUOUS`, or enters manual.
5. `POST calculate` builds abstract from accepted nets × pinned rates.
6. Optional: `POST source-replay` still stores workbook fixture snapshot for comparison — separate label.

---

## API CHANGES

| Endpoint | Change |
|---|---|
| `POST /structures/:id/generate-measurement` | **New.** Generate/refresh draft blocks from registry for that structure |
| `POST /cases/:caseId/generate-measurement` | **New.** All included structures |
| `POST /structures/:id/draft-lines` | Keep; optionally route through registry by `ruleId` |
| `GET` bundle guidance | Expand to registry results (12 Eknath + generic helpers) |
| `POST .../source-replay` | Unchanged label/totals; may share formula constants with `REPLAY_ONLY` defs |
| `POST /blocks/:id/rate` | **New or wire existing pin** so draft blocks can bind catalogue without becoming manual-only |
| Auth / roles / deploy / CI | **No change** |

---

## UI CHANGES

Screen 3 (`MeasurementGuide`):

- **Generate measurement sheet** button (writes draft blocks).
- List driven by server rule results — not hardcoded RA rows in React.
- Each row: name, status chip (`DRAFT` / missing facts / not applicable), formula, source facts used, preview quantity, Create/Refresh line, go-to missing fact.
- Show that candidate ≠ accepted quantity.

Screen 4:

- Accept draft lines; bind rate by item number search; ambiguous stays unselected.

Screen 2:

- Small UX: warn if equal grid used when measured spans expected (optional); ensure openings/members entry points remain visible so Eknath deps can be satisfied.
- Add excavation depth field if not present (or derive and show as derived).

No React `if (item === '19.1')` formula branches.

---

## CALCULATION CHANGES

New modules (proposed):

- `backend/src/workflow/rules/types.ts` — rule + result types; extend `RuleStatus`
- `backend/src/workflow/rules/registry.ts` — register + list
- `backend/src/workflow/rules/eknathSourceDraft.ts` — 12 source-profile draft rules
- `backend/src/workflow/derivedFacts.ts` — fact graph builders
- `backend/src/workflow/measurementGenerate.ts` — orchestration / block upsert
- Keep generic drafts; migrate them onto the registry
- `engine.sourceReplay` stays; share quantity literals/constants where safe without merging paths

Rounding: abstract quantity `ROUND(..., 2)` for money path parity when accepting Eknath draft nets; document profile `WORKBOOK_193_DRAFT` vs production.

---

## EKNATH REPLAY VS GENERATION

| | SOURCE_REPLAY | GENERATE-FROM-FACTS (Phase 2) |
|---|---|---|
| Trigger | Documents → Source replay | Screen 3 → Generate |
| Inputs | Hardcoded workbook cells | Confirmed case facts + source-profile draft rules |
| Status on blocks | Snapshot label `SOURCE_REPLAY` | Blocks `ruleStatus: DRAFT` |
| When facts incomplete | Still returns full 12 | Partial sheet + INPUT_REQUIRED |
| Production default | Never | Never (until VALIDATED_RULE) |
| Target parity | Always ₹10,73,836 / ₹8,23,876 | Match nets when facts complete; test against workbook quantities |

Twelve items (catalogue item numbers as strings):

1. `1` Excavation  
2. `4` Soling  
3. `21` RCC M-20 beams  
4. `121` TMT FE-500  
5. `19.1` AAC masonry  
6. `6` RCC columns (as used in workbook)  
7. `68` Jungle wood  
8. `112` Ceramic tiles  
9. `98` Wood plank ceiling  
10. `30` External plaster  
11. `29` Internal plaster  
12. `97` Jungle-wood frames  

---

## TEST PLAN

1. Registry lists 12 Eknath draft rules + 4 generics; none `VALIDATED_RULE`.
2. Missing foundation depth → excavation `INPUT_REQUIRED`, no fake quantity.
3. Complete Gut-193-like facts (unequal spans, thickness, height, foundation, openings, members) → generate → nets within tolerance of workbook (10.33, 2.58, 7.75, 4.29, 28.37, 0.84, 5.14, 168.93, 184.53, 107.76, 95.27, 15.74) **or** documented intentional deltas with evidence notes.
4. Floor/masonry reuse room and wall facts — no duplicate inputs required.
5. Opening deduction uses opening schedule + wall thickness once.
6. Shed structure: house rules not copied; empty applicable set unless shed facts exist.
7. Generate does not mark blocks ACCEPTED.
8. Accept + pin unique rates + calculate → present cost path works.
9. Source replay still 1073836 / 823876.
10. Legacy case 165 unchanged.
11. Item `19.1` remains string throughout.
12. Ambiguous catalogue match → AMBIGUOUS, no auto-pick.

---

## LEGACY SAFETY

- No change to auth, JWT, roles, Vercel, CI, salvage, YP seed tables, or legacy wizard.
- Case 165 remains LEGACY.
- Draft rules never become READY/VALIDATED by this phase.
- Candidate walls remain non-quantities until confirmed.
- Source replay label and conflicts preserved.

---

## LIMITATIONS / DOMAIN GATES

- Workbook defects (ceiling −R2 not in total formula; internal plaster range dropping R7/R8; typed 12.10) stay in evidence notes; generation must either follow engineer-confirmed options or mark REQUIRES_CONFIRMATION.
- Steel 50 kg/m³ and item 6 vs 26 are source-profile choices, not universal PWD law.
- Page 1 vs page 3 conflicts remain engineer-confirmed facts + notes.
- Full catalogue import still required before production go-live.
- True “similar cases without issues” for **all** field booklet guts needs Phase 10 validation on a second real file after office signs formulas.

---

## FILES AFFECTED (implementation)

- `MEASUREMENT_GENERATION_CHANGE_MAP.md` (this file)
- `backend/src/workflow/types.ts` — RuleStatus extension
- `backend/src/workflow/rules/*` (new)
- `backend/src/workflow/derivedFacts.ts` (new)
- `backend/src/workflow/measurementGenerate.ts` (new)
- `backend/src/workflow/engine.ts` / `guidance.ts` — integrate registry
- `backend/src/controllers/workflowController.ts` / `routes/workflowRoutes.ts`
- `frontend/.../ValuationWorkspace.tsx` — MeasurementGuide
- `backend/test/measurement_generation.test.ts` (new)
- `docs/BUILDING_WORKFLOW.md`
