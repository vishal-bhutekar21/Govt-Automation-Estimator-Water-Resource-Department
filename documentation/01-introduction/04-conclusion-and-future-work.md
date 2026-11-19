# Conclusion, Limitations, and Future Work

*(Draft text for report Chapter 9.)*

## 1. Conclusion

The Automated Building Valuation & Estimation Platform demonstrates that irrigation-office building valuation can be moved from scattered spreadsheets into a controlled web workflow. By separating **case identity**, **structure facts**, **measurement drafts**, **CSR rate binding**, **abstract (present cost)**, **Y.P. depreciation**, and **finalized document export**, the system improves reproducibility and reviewability.

The six-screen BUILDING workflow is the primary proposed process for new cases. The LEGACY wizard preserves continuity for historical files. Cloud deployment (Vercel + Render) and a seeded Gut-193 / Eknath demonstration case show that the stack is operable end-to-end, including the reference totals of **₹10,73,836** present cost and **₹8,23,876** depreciated value.

## 2. Limitations (honest for the report)

1. **Quantity rules** for ordinary cases are largely **draft suggestions**, not a fully validated production rule library for every CSR item.
2. **Finalize** is currently limited to **ADMIN** until the office confirms the full role matrix.
3. Persistence depends on configured storage (Postgres preferred); free-tier cloud databases can expire and require re-provisioning.
4. UI language is English; Marathi officer UX is future work.
5. The platform supports **departmental estimates**; it does not replace statutory land-acquisition authority determinations.

## 3. Future work

| Direction | Description |
|---|---|
| Validated rule pack | Promote draft formulas to office-approved `VALIDATED_RULE` entries with test vectors |
| Marathi UI | Localize labels and PDF headings |
| Stronger role matrix | Checker / Section Officer finalize & review gates |
| Offline / field mode | Capture dimensions offline, sync later |
| Deeper evidence UX | Panchanama committee capture improvements |
| Reporting dashboards | Village-wise / project-wise compensation aggregates with export |
| Hardened multi-tenant hosting | Dedicated managed Postgres, backups, staging environment |

## 4. Closing statement (optional for report)

The project establishes a practical foundation for transparent, CSR- and Y.P.-aligned building valuation in a WRD sub-division setting, with a clear path from pilot demonstration to broader office adoption as quantity rules and roles are formalized.
