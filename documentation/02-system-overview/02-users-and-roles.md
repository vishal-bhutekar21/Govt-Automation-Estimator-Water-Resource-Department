# Users and Roles

## 1. Seed demonstration accounts

| Role label | Typical designation | Email (seed) | Password (seed) |
|---|---|---|---|
| ADMIN | Executive Engineer / Super Admin | `admin@jigaon.gov.in` | `Admin@12345` |
| ESTIMATOR | Assistant Engineer | `engineer@jigaon.gov.in` | `Engineer@12345` |

> **Report note:** Treat these as **demo credentials only**. Production deployments must change passwords and restrict account creation.

## 2. Capability summary

| Capability | ESTIMATOR | ADMIN |
|---|---|---|
| Sign in / sign out | Yes | Yes |
| Dashboard & case list | Yes | Yes |
| Create / edit BUILDING case data | Yes | Yes |
| Generate MS, bind rates, prepare abstract | Yes | Yes |
| Accept depreciation (workflow) | Yes | Yes |
| Finalize case snapshot | Limited / no (office policy) | Yes (current product rule) |
| Create officer accounts | No (public register disabled alone) | Yes (admin token required) |
| Maintain rates / Y.P. (as exposed in UI) | Browse / use | Browse / add where UI allows |
| View audit trail | Yes | Yes |

## 3. User stories (for report / SRS style)

1. As an **estimator**, I want to enter plan dimensions and openings once so that measurement drafts are generated from facts.
2. As an **estimator**, I want to search the CSR catalogue and bind a rate so that I do not invent unit rates.
3. As an **admin**, I want to finalize a case so that PDF/Excel cannot silently recalculate after the fact.
4. As a **reviewer**, I want an audit trail so that material changes are attributable.
5. As an **office**, I want a demo prefilled case so that training does not require retyping Gut-193 workbook data.

## 4. Authentication notes

- JWT / session-based API auth (frontend stores token for API calls).
- Creating an officer account requires an **administrator token**; the public register form alone does not succeed.
- Signing out clears the session for the browser client.
