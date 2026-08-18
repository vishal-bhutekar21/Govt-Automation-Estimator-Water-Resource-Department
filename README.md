# Automated House Valuation & Estimation Management System

> **A Deterministic Digital Platform for Government Land Acquisition & Submergence Rehabilitation Property Valuations**  
> *Developed for the Water Resources Department, Government of Maharashtra (Jigaon Major Irrigation Project)*

---

## 🏛️ Executive Summary

The **Automated House Valuation & Estimation Management System** modernizes and digitizes the traditional, manual, Excel-based property valuation process mandated for rural house acquisition in reservoir submergence zones.

Built upon strict PWD Common Schedule of Rates (CSR) guidelines, Land Acquisition Acts, and Government Compound Interest Year's Purchase (Y.P.) valuation circulars, this platform transforms complex multi-sheet calculations into a streamlined, high-precision, transparent 10-step digital workflow.

---

## 📐 Mathematical Models & Valuation Formulations

The calculation engine is strictly authoritative on the backend, implemented using high-precision arbitrary-precision arithmetic (`decimal.js`) with half-up rounding (`ROUND_HALF_UP`) to prevent financial drift.

### 1. Multi-Type Generic Quantity Engine
$$\text{Gross Quantity} = 
\begin{cases}
\text{No.} \times \text{Length} \times \text{Breadth} \times \text{Depth/Height} & \text{(Volume in Cum)} \\
\text{No.} \times \text{Length} \times \text{Depth/Breadth} & \text{(Area in Sqm)} \\
\text{No.} \times \text{Length} & \text{(Running Length in Rmt)} \\
\text{No.} & \text{(Count in No.)}
\end{cases}$$

### 2. Dynamic Opening Deductions Matrix
For superstructure walls, opening deductions (Doors $D_1, D_2$, Windows $W_1, W_2$, archways) are evaluated and subtracted:
$$\text{Net Quantity} = \text{Gross Quantity} - \sum_{k=1}^m \left(\text{No.}_k \times L_k \times B_k \times H_k\right)$$

### 3. Primary Abstract Estimate of Construction
$$\text{Primary Estimated Cost } (C) = \sum_{i=1}^{18} \left( \text{Net Quantity}_i \times \text{Approved CSR Rate}_i \right)$$

### 4. 7% Compound Interest Year's Purchase (Y.P.) Depreciation
$$\text{Depreciated Structure Value } (V_d) = C \times \left( \frac{\text{Y.P. for Balance Future Life } (r)}{\text{Y.P. for Total Useful Life } (D)} \right)$$
* Where:
  - $D = \text{Total Useful Life of Building}$ (e.g. $45\text{ years}$ for Class-B construction)
  - $d = \text{Present Age of Building} = \text{Valuation Year} - \text{Construction Year}$ (e.g. $2016 - 2012 = 4\text{ years}$)
  - $r = D - d = \text{Balance Future Life}$ (e.g. $45 - 4 = 41\text{ years}$)
  - $\text{Y.P. for } r=41\text{ years at } 7\% = 13.394$
  - $\text{Y.P. for } D=45\text{ years at } 7\% = 13.606$
  - $\text{Depreciation Factor} = \frac{13.394}{13.606} \approx \mathbf{0.9844186}$

### 5. Second Valuation (Salvage Abstract & Configurable Deduction)
$$\text{Salvage Abstract Amount } (S) = \sum_{j \in \text{Salvage}} \left( \text{Quantity}_j \times \text{Rate}_j \right)$$
$$\text{Salvage Depreciated Value } (S_d) = S \times \left( \frac{\text{Y.P.}_{41}}{\text{Y.P.}_{45}} \right)$$
$$\text{Salvage Adjustment Deduction } (A) = \frac{\text{Configured Percentage}}{100} \times S_d \quad (\text{Default } 10.0\%)$$

### 6. Master Final Net Payable Valuation
$$\mathbf{V_{\text{Final}}} = V_d - A$$

---

## 🎯 Jigaon Major Irrigation Project — Golden Sample Case

* **Project**: Jigaon Major Irrigation Project (Sub-Division No. 2, Nandura, Dist. Buldhana)
* **Affected Property**: House No. 165, Gat No. 42/1, Village Dadulgaon
* **Owner**: **Shri Mohan Vishwanath Gai**
* **Land Acquisition Case**: LA Case No. 15/2008-09
* **Construction Specification**: Class-B (Burnt Brick Masonry in CM 1:6 + Country Teak Truss + 0.63mm CGI Sheet Roof)

| Step | Valuation Component | Reference Formula | Evaluated Amount |
|---|---|---|---|
| **Step 5** | **Primary Gross Abstract Cost** | Sum of 18 PWD CSR 2014-15 items | **₹ 2,61,669.00** |
| **Step 6** | **Primary Depreciated Structure Value** | $₹ 2,61,669.00 \times \frac{13.394}{13.606}$ | **₹ 2,57,592.00** |
| **Step 7** | **Second / Salvage Abstract Amount** | 6 Reusable items (Teak, CGI, GI, Gates) | **₹ 1,92,040.00** |
| **Step 7** | **Salvage Depreciated Value** | $₹ 1,92,040.00 \times \frac{13.394}{13.606}$ | **₹ 189,048.00** |
| **Step 8** | **Less: 10% Salvage Adjustment** | $10\% \times ₹ 189,048.00$ | **- ₹ 18,904.80** |
| **Step 8** | **Final Net Payable Valuation** | $₹ 2,57,592.00 - ₹ 18,904.80$ | **₹ 2,38,687.20** |

**Amount in Words**:  
*"Rupees Two Lakh Thirty-Eight Thousand Six Hundred Eighty-Seven and Paise Twenty Only"*

---

## 🧭 10-Step Institutional Valuation Workflow

```
[ Step 1: Case Identification & Project Mapping ]
                       │
[ Step 2: Property & Land Acquisition Metadata ]
                       │
[ Step 3: Structural Specifications & Lifecycle Analysis ]
                       │
[ Step 4: Multi-Line Dimensions & Opening Deductions Engine ]
                       │
[ Step 5: Abstract Estimate Generation & PWD CSR Rate Linking ]
                       │
[ Step 6: 7% Compound Interest Y.P. Depreciation Engine ]
                       │
[ Step 7: Second Valuation (Salvage Materials Abstract) ]
                       │
[ Step 8: Master Recapitulation & Configurable Adjustment ]
                       │
[ Step 9: Panchanama Witness Endorsements & Evidence Photos ]
                       │
[ Step 10: Multi-Page Institutional PDF Report & Audit Trail ]
```

---

## 🛠️ Technology Stack & Architecture

### Backend Engine (`backend/`)
* **Runtime**: Node.js v24 + TypeScript (`tsx` execution engine)
* **Web Framework**: Express.js REST API
* **Financial Arithmetic**: `Decimal.js` (Scale 20 internal, Scale 2 output, half-up rounding)
* **Document Generation**: `PDFKit` (Server-side multi-page institutional vector PDF reports)
* **Authentication & Security**: JWT (JSON Web Tokens) with Role-Based Access Control (`ADMIN`, `ESTIMATOR`, `CHECKER`, `VIEWER`) and `bcryptjs` password hashing
* **Persistence Layer**: Relational disk storage engine with automated backup and re-seeding

### Frontend Portal (`frontend/`)
* **Framework**: React 19 + Vite + TypeScript
* **Styling System**: Vanilla CSS Design Tokens + Tailwind CSS with Institutional Government theme (Deep Navy `#123B63`, Professional Teal `#167C80`, Soft Gold `#D99A2B`)
* **Component System**: Accessible custom UI primitives (`Card`, `Button`, `Badge`, `Stepper`, `CalculationModal`)
* **Icons**: Lucide React

---

## 🔌 REST API Specification

### Authentication & User Management
* `POST /api/v1/auth/login`: Authenticate and obtain JWT token
* `GET /api/v1/auth/me`: Get authenticated user profile and roles

### Dashboard & Analytics
* `GET /api/v1/dashboard/stats`: Retrieve aggregate project counts, active cases, total valuation sum, and recent activities

### Projects & Valuation Cases
* `GET /api/v1/projects`: List all irrigation & rehabilitation projects
* `POST /api/v1/projects`: Create new project scheme
* `GET /api/v1/cases`: List valuation cases with search and filtering
* `POST /api/v1/cases`: Initialize new valuation case
* `GET /api/v1/cases/:id`: Get complete case record with property and structural specifications
* `PUT /api/v1/cases/:id/property`: Update property particulars (Owner, survey no, submergence)
* `PUT /api/v1/cases/:id/structure`: Update structural metadata (Year, life cycle, materials)

### Measurements & Deductions (Step 4)
* `GET /api/v1/cases/:id/measurements`: Get all 18 measurement groups with items and deductions
* `POST /api/v1/cases/:id/measurements/groups`: Create new measurement group
* `POST /api/v1/cases/:id/measurements/items`: Add measurement line with dimensions ($L, B, D/H$)
* `POST /api/v1/cases/measurements/items/:itemId/deductions`: Add opening deduction ($D_1, D_2, W_1, W_2$)

### Rates & Abstract Estimation (Step 5 & `/rates`)
* `GET /api/v1/rates`: Search PWD CSR catalog by keyword or unit
* `GET /api/v1/cases/:id/estimate`: Get abstract estimate items with amounts
* `POST /api/v1/cases/:id/estimate/recalculate`: Authoritatively synchronize abstract from measurement groups

### Depreciation & Y.P. Factors (Step 6 & `/depreciation-factors`)
* `GET /api/v1/cases/:id/depreciation`: Get primary depreciation calculation record
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

## 🚀 Quick Start Guide

### Prerequisites
* **Node.js**: v18+ (v20+ or v24 recommended)
* **npm**: v9+

### 1. Clone & Install Dependencies
```bash
# Clone the repository
git clone https://github.com/your-org/FinalYearProject.git
cd FinalYearProject

# Install Backend Dependencies
cd backend
npm install

# Install Frontend Dependencies
cd ../frontend
npm install
```

### 2. Run Locally in Development Mode

```bash
# Terminal 1: Start Backend Engine (Port 5000)
cd backend
npm run dev

# Terminal 2: Start Frontend Web Portal (Port 5173)
cd frontend
npm run dev
```

Open your browser at `http://localhost:5173`.

### 3. Demo Login Credentials

| Role | Email | Password | Quick Access |
|---|---|---|---|
| **Executive Engineer (Admin)** | `admin@jigaon.gov.in` | `Admin@12345` | 1-Click "Administrator" Button on Login |
| **Assistant Engineer (Estimator)** | `engineer@jigaon.gov.in` | `Engineer@12345` | 1-Click "Estimator" Button on Login |

---

## 🧪 Automated Testing & Verification

Run the comprehensive unit and integration test suites:

```bash
cd backend
npx tsx --test test/decimal.test.ts test/api.test.ts test/measurement_estimate.test.ts test/depreciation_salvage.test.ts test/pdf_panchanama_audit.test.ts
```

### Test Suite Execution Output
```
▶ Backend API and Domain Logic Suite
  ✔ Database contains initialized seed case for Mohan Vishwanath Gai
  ✔ JWT token generation and verification
  ✔ Structure lifecycle validation logic
  ✔ Live dashboard stats computation
✔ Backend API and Domain Logic Suite (147.8ms)

▶ DecimalMath calculations
  ✔ calculates volume quantity accurately
  ✔ calculates net quantity after deductions
  ✔ calculates estimate item amount with rounding
  ✔ calculates primary depreciated value using Y.P. factors
  ✔ calculates configured 10% salvage adjustment and final valuation
✔ DecimalMath calculations (5.0ms)

▶ Phase 7 & 8: Depreciation Engine, Salvage Abstract & Final Valuation Suite
  ✔ Verifies Phase 7: Primary Depreciated Value calculation matches ₹ 2,57,592.00
  ✔ Verifies Phase 8: Salvage Abstract calculation matches ₹ 1,92,040.00 and Depreciated ₹ 189,048.00
  ✔ Verifies Phase 8: Configurable 10% Salvage Adjustment & Net Final Valuation ₹ 2,38,687.20
  ✔ Verifies Dynamic Salvage Percentage Recalculation (5% and 15%)
  ✔ Verifies Indian Currency Words Generation
✔ Phase 7 & 8: Depreciation Engine, Salvage Abstract & Final Valuation Suite (241.0ms)

▶ Phase 5 & 6: Measurement Engine, Deductions, and Abstract Estimate Suite
  ✔ Verifies Excavation (Item 1) multi-line volume calculation
  ✔ Verifies Brick Masonry (Item 5) superstructure deductions (D1, D2, W1, W2)
  ✔ Verifies all 18 Measurement Groups calculate correctly
  ✔ Verifies Abstract Estimate items and Grand Total equals ₹ 2,61,669.00
  ✔ Verifies CSR Rate Search by Keyword
✔ Phase 5 & 6: Measurement Engine, Deductions, and Abstract Estimate Suite (171.6ms)

▶ Phase 9 & 10: Panchanama, PDF Engine & Audit Logging Suite
  ✔ Verifies Phase 9: Panchanama retrieval and witness endorsements
  ✔ Verifies Phase 9: Evidence Photo Creation & Storage
  ✔ Verifies Phase 10: Audit Log Trail and Timestamp Sorting
✔ Phase 9 & 10: Panchanama, PDF Engine & Audit Logging Suite (187.7ms)

All 27 Tests Passed (100%).
```

### Production Build Validation
```bash
cd frontend
npm run build
# ✓ built in 2.22s with 0 errors
```

---

## 👥 Authors & Academic Context

* **Project**: Automated House Valuation & Estimation Management System
* **Academic Year**: Final Year Project
* **Domain**: Water Resources & Civil Engineering Automated Valuation / Public Works Department Estimation
* **License**: MIT
