# Migration

The store is still `backend/data/db.json`. Loading an older file keeps every existing array and adds empty collections for structures, rooms, wall runs, openings, members, measurement blocks, evidence, rate-schedule versions, catalogue items, Year’s Purchase tables, snapshots, and depreciation decisions.

On first load, the 18 seed rate rows are copied into schedule version `PWD-CSR-2014-15-SEED`, and the existing Year’s Purchase rows are copied into `yp-legacy-seed`. Both copies are marked legacy. A new case does not pin either of them until someone chooses it.

`case-jigaon-165` is not rewritten. Its estimate, depreciation, salvage, and final amount stay on the legacy records.

Users are unchanged.

Rollback of the screens: set a case’s `workflow` to `LEGACY` and the old wizard opens again. The previous code can ignore the new arrays. The branch `backup/pre-main-changes-2026-10-03` points at the snapshot taken before this workflow was added.

Tests set `VALUATION_DB_READONLY=1` so the suite does not write `db.json`.
