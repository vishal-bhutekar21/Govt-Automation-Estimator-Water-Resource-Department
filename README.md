# Automated House Valuation & Estimation Management System

<div align="center">
  <img src="frontend/src/assets/icon.png" alt="Government of Maharashtra Official Emblem" width="130" />
  <h3>Government of Maharashtra • Water Resources Department</h3>
  <p><strong>Jigaon Major Irrigation Project (Sub-Division No. 2, Nandura, Dist. Buldhana)</strong></p>
  <p><em>A Deterministic Digital Platform for Rural Submergence House Valuations & Land Acquisition Compensation</em></p>

  [![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev/)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
  [![Vite](https://img.shields.io/badge/Vite-6.4-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
  [![Express.js](https://img.shields.io/badge/Express.js-4.21-000000?logo=express&logoColor=white)](https://expressjs.com/)
  [![Decimal.js](https://img.shields.io/badge/Arithmetic-Decimal.js%20(Scale%2020)-10B981)](https://mikemcl.github.io/decimal.js/)
  [![PDFKit](https://img.shields.io/badge/PDF%20Engine-PDFKit-E11D48)](https://pdfkit.org/)
  [![Test Suite](https://img.shields.io/badge/Tests-27%2F27%20Passing%20(100%25)-22C55E)](#-automated-testing--verification)
  [![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
</div>

---

## 🏛️ Executive Overview

The **Automated House Valuation & Estimation Management System** transforms the legacy manual, Excel-driven property valuation process mandated for land acquisition and submergence rehabilitation into a structured, highly transparent, tamper-evident digital platform.

Built strictly in accordance with **Maharashtra Public Works Department (PWD) Common Schedule of Rates (CSR 2014-15)**, **Land Acquisition Acts**, and **Government 7% Compound Interest Year's Purchase (Y.P.) Depreciation Circulars**, this system enables civil engineers and division heads to perform end-to-end valuation workflows with mathematical precision down to the exact paisa.

---

## 📖 Complete "How To Use" Guide (Step-by-Step)

```
┌────────────────────────────────────────────────────────────────────────────────┐
│                          10-STEP VALUATION WORKFLOW                            │
├────────────────────────────────────────────────────────────────────────────────┤
│ [Step 1] Case Identification & Project Mapping                                 │
│    │                                                                           │
│ [Step 2] Property & Land Acquisition Metadata (Owner, Village, Gat No.)        │
│    │                                                                           │
│ [Step 3] Structural Specifications & 45-Year Lifecycle Model                   │
│    │                                                                           │
│ [Step 4] Multi-Line Dimensions & Opening Deductions Engine (D1, D2, W1, W2)    │
│    │                                                                           │
│ [Step 5] Abstract Estimate Generation & PWD CSR Rate Linking (₹ 2,61,669.00)   │
│    │                                                                           │
│ [Step 6] 7% Compound Interest Y.P. Depreciation Engine (₹ 2,57,592.00)         │
│    │                                                                           │
│ [Step 7] Second Valuation / Salvage Materials Abstract (₹ 1,89,048.00)         │
│    │                                                                           │
│ [Step 8] Master Recapitulation & 10% Salvage Adjustment (₹ 2,38,687.20)        │
│    │                                                                           │
│ [Step 9] Panchanama Joint Inspection Committee & Photographic Evidence         │
│    │                                                                           │
│ [Step 10] Official Multi-Page Government PDF Certificate & Live Editor         │
└────────────────────────────────────────────────────────────────────────────────┘
```

---

### Step 1: Officer Sign-In & Role Authentication
1. Navigate to `/login`.
2. Sign in using your official credentials or use the 1-Click Fast Demonstration Presets:
   - **Assistant Engineer (`ESTIMATOR`)**: `engineer@jigaon.gov.in` / `Engineer@12345`
   - **Executive Engineer (`ADMIN`)**: `admin@jigaon.gov.in` / `Admin@12345`
3. If new officer accounts are needed, click **`"Super Admin: Create New Officer Account →"`** (or go to `/register`) to create accounts for Executive Engineers, Assistant Engineers, Checkers, and Section Officers.

---

### Step 2: Executive Dashboard Overview
* Review real-time aggregate statistics:
  - **Active Irrigation Projects** (e.g., Jigaon Major Irrigation Project)
  - **Total Valuation Cases** (In-progress, Under Review, Sanctioned)
  - **Total Sanctioned Compensation Sum**
  - **Live Workflow Status Distribution** & Recent Officer Activity Audit Feed

---

### Step 3: Case Selection or Initialization
1. In the sidebar, click **Valuation Cases** (`/cases`).
2. Open an existing case (e.g., **`CASE/2008-09/165` - Mohan Vishwanath Gai**) or click **`"New Valuation Case"`** to register a new property under a project.

---

### Step 4: Step 1 to Step 3 — Case & Structural Setup
* **Step 1 (Case Info)**: Verifies Case Number, Sub-Division, and Valuation Date.
* **Step 2 (Property Details)**: Enter Owner Name, Village, House No., Gat/Survey No., Property Boundaries (East, West, North, South), and Submergence Status.
* **Step 3 (Structure Specs & Lifecycle)**: Configure Building Class (Class-B BBM Wall + CGI Roof), Built-up Area, Year of Construction (e.g. 2012), Total Useful Life ($D = 45\text{ years}$), Present Age ($d = 4\text{ years}$), and Balance Future Life ($r = 41\text{ years}$).

---

### Step 5: Step 4 — Multi-Line Measurements & Superstructure Deductions
1. Navigate through all **18 PWD CSR Construction Work Groups** (Excavation, Murum Filling, UCR Masonry, BBM in Superstructure, CGI Roofing, Woodwork, Teakwood Doors, Plastering, Painting, Electrification, Sanitation, etc.).
2. Enter individual measurement lines with dimensions:
   $$\text{Quantity} = \text{Number} \times \text{Length} \times \text{Breadth} \times \text{Depth/Height}$$
3. For superstructure walls (Item 5), apply opening deductions for doors and windows:
   - Doors $D_1$ ($1.00 \times 2.10\text{ m}$), $D_2$ ($0.90 \times 2.10\text{ m}$)
   - Windows $W_1$ ($1.20 \times 1.20\text{ m}$), $W_2$ ($0.90 \times 1.20\text{ m}$), $W_3$ ($0.60 \times 0.90\text{ m}$)
4. Click **`"Formula Breakdown"`** on any item to view live algebraic calculations and unit conversions.

---

### Step 6: Step 5 — Abstract Estimate of Construction
1. Review the generated **Abstract Estimate Sheet**.
2. Each item links its net measurement quantity to the authoritative **PWD CSR 2014-15 Rate Schedule**:
   $$\text{Item Amount} = \text{Net Quantity} \times \text{Approved Unit Rate}$$
3. Gross Abstract Present Construction Cost evaluates to: **₹ 2,61,669.00**.

---

### Step 7: Step 6 — 7% Compound Interest Y.P. Depreciation Engine
1. The platform executes the government compound interest formula:
   $$\text{Depreciated Value } (V_d) = \text{Gross Cost} \times \left( \frac{\text{Y.P. for Balance Life } (r=41\text{y})}{\text{Y.P. for Total Life } (D=45\text{y})} \right)$$
   $$\text{Depreciation Ratio} = \frac{13.394}{13.606} \approx 0.9844186$$
2. Evaluated Primary Depreciated Value: **₹ 2,57,592.00**.
3. Click **`"Inspect 7% Y.P. Table"`** to verify the standard 100-year compound schedule.

---

### Step 8: Step 7 — Second Valuation (Salvage Materials Abstract)
1. Evaluates all reusable structural components (Teakwood frames, CGI corrugated roofing sheets, GI pipes, M.S. security gates).
2. Salvage Abstract Total: **₹ 1,92,040.00**.
3. Salvage Depreciated Value ($r=41\text{y}, D=45\text{y}$): **₹ 189,048.00**.

---

### Step 9: Step 8 — Master Recapitulation & Salvage Adjustment
1. Computes the final net payable compensation:
   $$\text{Less 10% Salvage Adjustment} = -10.0\% \times ₹ 189,048.00 = \mathbf{-₹ 18,904.80}$$
   $$\text{Final Net Payable Valuation} = ₹ 2,57,592.00 - ₹ 18,904.80 = \mathbf{₹ 2,38,687.20}$$
2. Automatically generates formal Indian Currency words:
   *"Rupees Two Lakh Thirty-Eight Thousand Six Hundred Eighty-Seven and Paise Twenty Only"*.

---

### Step 10: Step 9 — Panchanama & Evidence Upload
1. Record the on-site **Joint Inspection Committee**:
   - Executive Engineer (Chairman / E.E.)
   - Assistant Engineer (A.E. Gr-I)
   - Sectional Engineer (S.E.)
   - Talathi / Revenue Inspector (Land Records)
2. Enter Panchas / Local Citizen Witnesses (Name, Age, Occupation, Address).
3. Upload and annotate photographic evidence (Front elevation, wall joints, roof truss, foundation).

---

### Step 11: Step 10 — Official PDF Report & In-Place Editor
1. Preview the complete **Multi-Page Government Valuation Report**:
   - **Page 1**: Official Sanction Certificate & Financial Highlight
   - **Page 2**: Property Characteristics & Lifecycle Specs (FC Sheet)
   - **Page 3**: Detailed Abstract Estimate (AB Sheet)
   - **Page 4**: Recapitulation & Panchanama Endorsements (Final RA Sheet)
2. Click **`"Edit Notes"`** to customize certificate remarks or officer signatories in real time.
3. Click **`"Print"`** to print directly or **`"Download PDF"`** to stream a server-side vector PDF document.
4. Click **`"Share"`** to copy a secure case link or export structured JSON summaries.

---

## 🎯 Golden Sample Benchmark Case

| Parameter | Government Case Value |
| :--- | :--- |
| **Project** | Jigaon Major Irrigation Project (Sub-Division No. 2, Nandura) |
| **Property** | House No. 165, Gat No. 42/1, Village Dadulgaon |
| **Owner** | **Shri Mohan Vishwanath Gai** |
| **Land Acquisition Case** | LA Case No. 15/2008-09 |
| **Specification** | Class-B (Burnt Brick Masonry in CM 1:6 + Country Teak Truss + CGI Sheet Roof) |
| **Total Life / Age / Balance** | $D = 45\text{ years}$, $d = 4\text{ years}$ (Built 2012), $r = 41\text{ years}$ (Valued 2016) |

### Authoritative Recapitulation Table

| Stage | Valuation Component | Mathematical Expression | Evaluated Amount |
| :--- | :--- | :--- | :--- |
| **Step 5** | **Gross Abstract Construction Cost** | $\sum_{i=1}^{18} (\text{Qty}_i \times \text{CSR}_i)$ | **₹ 2,61,669.00** |
| **Step 6** | **Primary Depreciated Structure Value** | $₹ 2,61,669.00 \times \frac{13.394}{13.606}$ | **₹ 2,57,592.00** |
| **Step 7** | **Second / Salvage Abstract Amount** | 6 Reusable salvage items | **₹ 1,92,040.00** |
| **Step 7** | **Salvage Depreciated Value** | $₹ 1,92,040.00 \times \frac{13.394}{13.606}$ | **₹ 189,048.00** |
| **Step 8** | **Less: 10% Salvage Adjustment** | $10.0\% \times ₹ 189,048.00$ | **- ₹ 18,904.80** |
| **Step 8** | **Final Net Payable Valuation** | $₹ 2,57,592.00 - ₹ 18,904.80$ | **₹ 2,38,687.20** |

---

## 🔑 Pre-Configured Official Logins

| Officer Role | Access Level | Email | Password |
| :--- | :--- | :--- | :--- |
| **Super Admin / Division Head** | **Executive Engineer (`ADMIN`)** | `admin@jigaon.gov.in` | `Admin@12345` |
| **Field Estimator / Officer** | **Assistant Engineer (`ESTIMATOR`)** | `engineer@jigaon.gov.in` | `Engineer@12345` |

> [!TIP]
> **Super Admin Officer Creation Portal**: Navigate to `/register` or click the bottom link on the login screen to provision additional officer logins on the fly.

---

## 🛠️ Technology Stack & Architecture

### Backend Engine (`backend/`)
* **Runtime**: Node.js v24 + TypeScript (`tsx` execution engine)
* **Web Framework**: Express.js REST API
* **Financial Precision**: `Decimal.js` (Scale 20 internal, Scale 2 output, `ROUND_HALF_UP`)
* **PDF Document Engine**: `PDFKit` (Server-side multi-page vector PDF certificate generator)
* **Security & Auth**: JWT (JSON Web Tokens) with Role-Based Access Control (`ADMIN`, `ESTIMATOR`, `CHECKER`, `VIEWER`) and `bcryptjs` hashing
* **Persistence & Auditing**: Relational JSON disk storage engine with automated backup and immutable audit logging

### Frontend Web Portal (`frontend/`)
* **Framework**: React 19 + Vite 6 + TypeScript
* **Layout**: Fixed non-scrolling Header & Sidebar layout with smooth content scrolling
* **Styling**: Vanilla CSS Design Tokens + Tailwind CSS with Institutional Government theme (Midnight Navy `#0C1A2F`, Deep Teal `#0F766E`, State Saffron `#E09F3E`)
* **Component Library**: Custom accessible UI primitives (`Card`, `Button`, `Badge`, `Stepper`, `GovtEmblem`)
* **Icons**: Lucide React

---

## 🔌 REST API Endpoints

### Authentication & Officer Provisioning
* `POST /api/v1/auth/login`: Authenticate and obtain JWT token
* `POST /api/v1/auth/register`: Provision new officer account (Super Admin)
* `GET /api/v1/auth/me`: Get authenticated user profile and permissions

### Dashboard & Analytics
* `GET /api/v1/dashboard/stats`: Retrieve aggregate project counts, active cases, total valuation sum, and recent activities

### Projects & Valuation Cases
* `GET /api/v1/projects`: List all irrigation & rehabilitation schemes
* `POST /api/v1/projects`: Create new project
* `GET /api/v1/cases`: List valuation cases with search and filter
* `POST /api/v1/cases`: Initialize new valuation case
* `GET /api/v1/cases/:id`: Retrieve complete case record with property and structure specs
* `PUT /api/v1/cases/:id/property`: Update property particulars (Owner, survey no, submergence)
* `PUT /api/v1/cases/:id/structure`: Update structural metadata (Year, life cycle, materials)

### Measurements & Deductions (Step 4)
* `GET /api/v1/cases/:id/measurements`: Get all 18 measurement groups with items and deductions
* `POST /api/v1/cases/:id/measurements/groups`: Create new measurement group
* `POST /api/v1/cases/:id/measurements/items`: Add measurement line with dimensions ($L, B, D/H$)
* `POST /api/v1/cases/measurements/items/:itemId/deductions`: Add opening deduction ($D_1, D_2, W_1, W_2$)

### Rates & Abstract Estimate (Step 5 & `/rates`)
* `GET /api/v1/rates`: Search PWD CSR catalog by keyword or unit
* `GET /api/v1/cases/:id/estimate`: Get abstract estimate items with calculated amounts
* `POST /api/v1/cases/:id/estimate/recalculate`: Synchronize abstract from measurement groups

### Depreciation & Y.P. Factors (Step 6 & `/depreciation-factors`)
* `GET /api/v1/cases/:id/depreciation`: Get primary depreciation record
* `POST /api/v1/cases/:id/depreciation/calculate`: Recompute depreciation via 7% Y.P. table
* `GET /api/v1/cases/rates/yp-factors`: Full 100-year government Y.P. table

### Salvage & Final Valuation (Steps 7 & 8)
* `GET /api/v1/cases/:id/salvage`: Get salvageable items and second valuation total
* `POST /api/v1/cases/:id/salvage/update`: Update salvage items and adjustment percentage ($0\%$ to $25\%$)
* `GET /api/v1/cases/:id/final-valuation`: Get master recapitulation summary and words

### Panchanama & Evidence (Step 9)
* `GET /api/v1/cases/:id/panchanama`: Get joint inspection committee, panchas, and remarks
* `POST /api/v1/cases/:id/panchanama`: Update panchanama details
* `POST /api/v1/cases/:id/panchanama/photos`: Upload inspection photo evidence

### PDF Document Engine & Audit Trail (Step 10 & `/audit-logs`)
* `GET /api/v1/cases/:id/report/download`: Download official 7-page government PDF report
* `GET /api/v1/audit`: Query system audit trail and version history

---

## 🚀 Quick Start Guide (Local Setup)

### Prerequisites
* **Node.js**: v18+ (v20+ or v24 recommended)
* **npm**: v9+

### 1. Clone & Install Dependencies
```bash
# Clone the repository
git clone https://github.com/vishal-bhutekar21/Govt-Automation-Estimator-Water-Resource-Department.git
cd Govt-Automation-Estimator-Water-Resource-Department

# Install Backend Dependencies
cd backend
npm install

# Install Frontend Dependencies
cd ../frontend
npm install
```

### 2. Run Development Servers
```bash
# Terminal 1: Start Backend Engine (Port 5000)
cd backend
npm run dev

# Terminal 2: Start Frontend Web Portal (Port 5173)
cd frontend
npm run dev
```

Open your browser at `http://localhost:5173`.

---

## 🧪 Automated Testing & Verification

Run all backend unit and integration test suites:

```bash
cd backend
npx tsx --test test/decimal.test.ts test/api.test.ts test/measurement_estimate.test.ts test/depreciation_salvage.test.ts test/pdf_panchanama_audit.test.ts
```

### Test Suite Execution Output
```
📦 Database loaded from disk: backend/data/db.json
▶ Backend API and Domain Logic Suite
  ✔ Database contains initialized seed case for Mohan Vishwanath Gai
  ✔ JWT token generation and verification
  ✔ Structure lifecycle validation logic
  ✔ Live dashboard stats computation
✔ Backend API and Domain Logic Suite (6.3ms)

▶ DecimalMath calculations
  ✔ calculates volume quantity accurately
  ✔ calculates net quantity after deductions
  ✔ calculates estimate item amount with rounding
  ✔ calculates primary depreciated value using Y.P. factors
  ✔ calculates configured 10% salvage adjustment and final valuation
✔ DecimalMath calculations (5.9ms)

▶ Phase 7 & 8: Depreciation Engine, Salvage Abstract & Final Valuation Suite
  ✔ Verifies Phase 7: Primary Depreciated Value calculation matches ₹ 2,57,592.00
  ✔ Verifies Phase 8: Salvage Abstract calculation matches ₹ 1,92,040.00 and Depreciated ₹ 189,048.00
  ✔ Verifies Phase 8: Configurable 10% Salvage Adjustment & Net Final Valuation ₹ 2,38,687.20
  ✔ Verifies Dynamic Salvage Percentage Recalculation (5% and 15%)
  ✔ Verifies Indian Currency Words Generation
✔ Phase 7 & 8: Depreciation Engine, Salvage Abstract & Final Valuation Suite (70.5ms)

▶ Phase 5 & 6: Measurement Engine, Deductions, and Abstract Estimate Suite
  ✔ Verifies Excavation (Item 1) multi-line volume calculation
  ✔ Verifies Brick Masonry (Item 5) superstructure deductions (D1, D2, W1, W2)
  ✔ Verifies all 18 Measurement Groups calculate correctly
  ✔ Verifies Abstract Estimate items and Grand Total equals ₹ 2,61,669.00
  ✔ Verifies CSR Rate Search by Keyword
✔ Phase 5 & 6: Measurement Engine, Deductions, and Abstract Estimate Suite (6.2ms)

▶ Phase 9 & 10: Panchanama, PDF Engine & Audit Logging Suite
  ✔ Verifies Phase 9: Panchanama retrieval and witness endorsements
  ✔ Verifies Phase 9: Evidence Photo Creation & Storage
  ✔ Verifies Phase 10: Audit Log Trail and Timestamp Sorting
✔ Phase 9 & 10: Panchanama, PDF Engine & Audit Logging Suite (10.1ms)

ℹ tests 27 | pass 27 | fail 0 (100% Pass)
```

### Production Build Validation
```bash
cd frontend
npm run build
# ✓ built in 2.25s with 0 errors
```

---

## 👥 Academic & Departmental Context

* **Project Title**: Automated House Valuation & Estimation Management System
* **Client / Domain**: Water Resources Department, Government of Maharashtra
* **Target Project**: Jigaon Major Irrigation Project, Sub-Division No. 2, Nandura (Dist. Buldhana)
* **Standard Specifications**: PWD Common Schedule of Rates (CSR 2014-15) & 7% Compound Interest Y.P. Tables
* **License**: MIT
