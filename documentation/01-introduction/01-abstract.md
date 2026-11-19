# Abstract (draft text for the report)

The **Automated Building Valuation & Estimation Platform** is a web-based information system developed for the Water Resources Department, Government of Maharashtra, with a pilot deployment for the **Jigaon Major Irrigation Project, Sub-Division No. 2, Nandura (Dist. Buldhana)**.

Land acquisition and reservoir submergence require consistent building valuations based on **PWD Common Schedule of Rates (CSR)** item quantities and **Year’s Purchase (Y.P.)** depreciation. In the field, this work is often done in spreadsheets: measurements are re-entered, rates are copied by hand, depreciation factors are looked up manually, and audit trails are weak. Errors in quantity, rate binding, or Y.P. lookup directly affect compensation estimates and review time.

This project replaces that ad-hoc process with a **deterministic digital workflow**. Officers authenticate with role-based access, register valuation cases under irrigation projects, describe building geometry and construction facts, generate a **measurement sheet (MS)** from those facts, bind official catalogue rates, prepare an **abstract** (present cost), apply **Y.P. depreciation** from a pinned factor table, finalize a frozen snapshot, and export **PDF / Excel** valuation documents. New cases follow a six-screen **BUILDING** workflow; older cases remain available through a **LEGACY** wizard for compatibility.

The system is implemented as a **React (Vite) SPA** on Vercel and an **Express / TypeScript API** on Render, with durable persistence (Postgres when configured, with file fallback). Arithmetic uses high-precision decimal handling. A seeded demonstration case (**Eknath Pandurang Tharkar, Gut / Survey No. 193**) reproduces workbook-aligned present cost **₹10,73,836** and depreciated value **₹8,23,876**, providing end-to-end evidence for verification and report writing.

**Keywords:** building valuation, PWD CSR, Year’s Purchase, measurement sheet, abstract estimate, land acquisition, irrigation project, web application, Government of Maharashtra.
