# Measurement Sheet, Abstract, and Depreciation

## 1. Measurement sheet (MS)

**Input:** Confirmed structure layout, construction facts, openings, members.  
**Output:** Draft (then accepted) quantity lines with units.

### Ordinary residential draft pack (`draft.*`)

Typical suggestion families (when facts exist):

- Excavation / soling / ground beam from confirmed wall runs + foundation depths  
- Wall masonry from wall material + confirmed walls  
- Floor / roof-ceiling from room areas when finishes selected  
- Plaster from walls / rooms  
- Columns / timber from member schedule  

### Gut-193 / Eknath profile (`eknath.*`)

When the confirmed plan matches the workbook pattern (4×2 unequal spans), the platform can emit **source-draft** lines aligned to the Gut-193 workbook (with length adjustments). Ordinary `draft.*` lines are not mixed into that sheet for that profile.

### Engineer controls

- Generate sheet explicitly.  
- Accept drafts only after rate uniqueness rules are satisfied.  
- Override quantity with reason, exclude, or reset.  
- Add measured catalogue items when a selected item has no validated formula.

**Status note for report:** There are no fully validated production quantity rules for all CSR items in this release; suggestions are marked **DRAFT**.

---

## 2. Abstract (present cost)

**Definition:** Sum of accepted measurement lines × bound catalogue rates (and any accepted measured items), aggregated to **present cost** of the structure / case.

**Process:**

1. Bind each line to a catalogue row (unit + rate from schedule).  
2. Accept drafts.  
3. Prepare abstract.  
4. Present cost becomes the input to depreciation.

**Demo present cost:** ₹ **10,73,836**

---

## 3. Depreciation (Year’s Purchase)

### Formula used by the BUILDING workflow

\[
\text{Depreciated value} = \mathrm{ROUND}\left(\text{Present cost} \times \frac{\mathrm{YP}(\text{future life})}{\mathrm{YP}(\text{useful life})},\, 0\right)
\]

- Computed **per structure**.  
- Uses the **pinned Y.P. table only** (no silent fallback factor).  
- Missing Y.P. factor **blocks** depreciation.  
- Useful life is **typed**; not auto-filled with 10 or 45.  
- New BUILDING cases have **no salvage step**.

### UI copy (standards page)

The Y.P. factors page also states the departmental principle:

> Depreciated Value = Present Cost × [ Y.P. for Future Balance Life (r) ÷ Y.P. for Total Useful Life (D) ]

### Demo depreciated value

₹ **8,23,876** for `CASE-193-EKNATH-DEMO` when workbook rates + Y.P. rows are pinned and life/year facts match the seed (construction **2023**, useful life **10**).

---

## 4. Finalize and export

| Step | Behavior |
|---|---|
| Finalize | ADMIN freezes snapshot; not updated in place |
| PDF | COVER / FS / DEP / ABSTRACT / MS from snapshot |
| Excel | Text dump of same snapshot |
| Recalculation | Exports do **not** recalculate |

---

## 5. Source replay (advanced)

`POST .../source-replay` remains a **separate fixture** labelled `SOURCE_REPLAY`. It is for workbook verification alongside the normal generate → accept → calculate path. Both paths target the same demo money totals when pins match.
