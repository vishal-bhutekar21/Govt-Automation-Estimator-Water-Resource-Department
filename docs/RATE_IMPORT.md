# Rate import

## Built-in schedules (always available)

On every boot (local and Vercel), `ensureWorkflowCollections` seeds:

| Pin on Screen 1 | Contents |
|---|---|
| **CASE-193-RA-UI-GUIDE** | Gut 193 workbook RA extract (12 items: 1, 4, 21, 121, 19.1, 6, 68, 112, 98, 30, 29, 97) |
| **Gut 193 workbook YP (7 & 10)** | YP factors year 7 = 5.389, year 10 = 7.024 (year 93 blocked / null) |
| PWD-CSR-2014-15-SEED | Legacy 18-row CSR seed |
| Legacy software Year’s Purchase rows | Legacy YP factors |

Source: `backend/src/database/workflowSeedCatalog.ts`.

`POST /api/v1/workflow/rate-schedules/import` requires an administrator token.

Body:

```json
{
  "name": "Case extract",
  "authority": "",
  "versionLabel": "unverified",
  "effectiveFrom": null,
  "effectiveTo": null,
  "sourceDocument": "workbook RA sheet",
  "items": [
    {
      "itemNumber": "19.1",
      "description": "AAC block masonry",
      "unit": "cum",
      "rate": 7152.1,
      "sourceRow": "21",
      "reference": ""
    }
  ]
}
```

`itemNumber` must be a JSON string. A numeric `19.1` is rejected.

Duplicate item numbers in one import are stored and returned as `duplicateItemNumbers`. They are not merged. Matching a duplicated number returns `AMBIGUOUS` and does not select a rate.

The 18-row PWD CSR 2014-15 seed remains available as its own legacy version. It is not the default schedule for a new case.

`POST /api/v1/workflow/yp-tables/import` accepts `{ name, citation, rows: [{ year, factor }] }`. Use `factor: null` for a year that has no factor. Lookup of a null factor blocks depreciation. Factors are not interpolated.
