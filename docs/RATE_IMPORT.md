# Rate import

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
