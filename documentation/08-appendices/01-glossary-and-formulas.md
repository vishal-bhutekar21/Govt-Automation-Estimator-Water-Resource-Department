# Appendix A — Glossary and Formulas

## Glossary

| Term | Meaning |
|---|---|
| WRD | Water Resources Department |
| PWD CSR | Public Works Department Common Schedule of Rates |
| CSR 2014-15 | Schedule year commonly referenced in the pilot UI |
| Y.P. | Year’s Purchase factor (compound interest valuation table) |
| MS | Measurement Sheet — item-wise quantities |
| Abstract | Costed summary → present cost |
| Present cost | Undepreciated estimated cost from abstract |
| Depreciated value | Present cost adjusted by Y.P. ratio |
| Gut / Survey No. | Land parcel identifier (e.g. 193) |
| LA | Land Acquisition |
| BUILDING workflow | Six-screen modern case path |
| LEGACY workflow | Older wizard for historical cases |
| Draft line | Suggested quantity not yet accepted |
| Pinned schedule / table | Version locked on the case for rates or Y.P. |
| Snapshot | Frozen finalized payload used for export |
| Panchanama | Joint inspection / evidence practice (domain) |
| Submergence | Structures affected by reservoir / project waters |

## Core formulas

### Depreciation (BUILDING)

\[
\text{Depreciated value} = \mathrm{ROUND}\left(P \times \frac{\mathrm{YP}(r)}{\mathrm{YP}(D)},\, 0\right)
\]

| Symbol | Meaning |
|---|---|
| \(P\) | Present cost |
| \(D\) | Useful life (years), typed |
| \(r\) | Future / balance life (years) derived from construction year, valuation date, and \(D\) |
| \(\mathrm{YP}(n)\) | Factor from pinned table for period \(n\) |

Equivalent statement on the standards UI:

`Depreciated Value = Present Cost × [ Y.P.(future balance life) ÷ Y.P.(total useful life) ]`

### Abstract line amount (conceptual)

\[
\text{Line amount} = \text{Accepted quantity} \times \text{Bound catalogue rate}
\]

Present cost is the aggregation of accepted line amounts (plus any accepted measured items), as implemented by the calculate / abstract step.

## Units commonly seen

| Unit | Typical use |
|---|---|
| cum | Excavation, masonry, concrete |
| sqm | Plaster, flooring, ceiling, frames |
| qtl | Steel |
| rmt / No. | Running metre / numbers (catalogue dependent) |
