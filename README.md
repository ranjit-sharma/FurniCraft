# FurniCraft — Modern Furniture Workforce & Financial Management System

FurniCraft is an enterprise MERN-stack workforce, payroll, and financial operations platform engineered exclusively for modern furniture manufacturing, assembly, and installation businesses.

The application natively supports specialized craftsmanship workflows:
- **Modular Kitchens** (Acrylic/PU finishes, base/wall carcasses, servo-drive drawers)
- **Sliding-door & Walk-in Wardrobes** (Top-hung tracks, aluminum profiles, internal sensors)
- **TV Units & Entertainment Paneling** (Fluted panels, acoustic battens, veneer finishes)
- **Beds, Headboards & Dressing Units**
- **Office Furniture & Workstations** (Modular desking, raceways, wire management)
- **Cabinets, Shelves & Storage Units**
- **Custom furniture manufacturing, edge-banding, polishing, and site fitting**

---

## 1. Technology Stack

- **Frontend**: React 18, Vite, Tailwind CSS, React Router v6, Axios, Recharts, Lucide Icons
- **Backend**: Node.js, Express.js (ES Modules), MongoDB & Mongoose
- **Security & Auth**: bcryptjs, JWT in HTTP-only cookies, SameSite cookies, CSRF protection, express-rate-limit, Helmet security headers, token revocation / blacklist
- **Validation**: Zod schema validation for all endpoints
- **Reporting & Exports**: PDFKit (official PDF payslips), SheetJS/XLSX (real Excel attendance sheets)
- **Real-Time**: Socket.IO for live notification rooms
- **Automated Testing**: Vitest, Supertest, React Testing Library, JSDOM

---

## 2. User Roles — Exactly Three

1. **OWNER / ADMIN**
   - Full organization governance, thekedars, workers, projects, and central tool inventory.
   - Access to business-wide financial liabilities (advances + unpaid wages).
   - Review append-only tamper-evident audit logs.
   - Suspend user accounts and revoke active login sessions.
   - Download organization-wide Excel and PDF reports.

2. **THEKEDAR**
   - Create and manage modern furniture projects.
   - Register workers, assign workers to multiple projects with project-specific wage overrides.
   - Review, approve, reject, and bulk-approve attendance and correction requests.
   - Review advance requests and record actual cash/UPI disbursements.
   - Preview, finalize, lock immutable monthly payrolls, and allocate salary payments.
   - Issue, transfer, and receive equipment from the central tool inventory.
   - Record material, hardware fittings, and transport expenses.

3. **WORKER**
   - Secure login to worker account.
   - Mark shift attendance for assigned furniture projects.
   - Interactive monthly calendar with color-coded multiplier tags and calculated earnings.
   - Request shift attendance corrections with reasons.
   - Request cash/UPI advances.
   - Track ledger: money received, salary statements, advance balances, and dues.
   - View assigned machinery & hand tools, acknowledge receipt, and report damage/loss.
   - File transparent grievances and disputes.

*(No supervisor role exists).*

---

## 3. Configured Attendance & Payroll Multiplier Rules

Attendance multipliers conform strictly to the modern furniture shop rules:

| Code | Multiplier | Description | Payable Formula |
| :--- | :---: | :--- | :--- |
| **`P`** | **1.0×** | Full normal work day | `1.0 × Daily Wage` |
| **`HALF`** | **0.5×** | Half work day | `0.5 × Daily Wage` |
| **`P1/5`** | **1.5×** | Extended work until 9:00 PM (includes normal day) | `1.5 × Daily Wage` |
| **`PP`** | **2.0×** | Extended work until Midnight (includes normal day) | `2.0 × Daily Wage` |
| **`ABSENT`** | **0.0×** | Unexcused absence | `₹0.00` |
| **`LEAVE`** | **0.0×** | Authorized leave | `₹0.00` |

### Payroll Calculation Engine
- **Gross Earnings**: Approved full-day + approved half-day + approved extended-work earnings + authorized allowances.
- **Remaining Salary Payable**: `Gross Earnings + Allowances - Deductions - Advance Recoveries Allocated - Salary Payments Allocated`.
- **Payroll Immutability**: Once confirmed, payroll enters `FINALIZED` state and is permanently locked. Line items and calculated totals are frozen. Any subsequent adjustment must be recorded as a linked `PayrollAdjustment` audit record (`CREDIT` or `DEBIT`) with authorization reason.

---

## 4. Quick Start & Safe Demo Credentials

### Safe Seed Credentials
The database seed script sets up sample data across all roles:

| Role | Email | Password | Details |
| :--- | :--- | :--- | :--- |
| **Owner / Admin** | `owner@furnicraft.com` | `FurniOwner@2026` | Vikramaditya Sharma (Managing Director) |
| **Thekedar** | `thekedar.rajesh@furnicraft.com` | `Thekedar@2026` | Rajesh Thekedar (Modular Contractor) |
| **Worker** | `worker.ramesh@furnicraft.com` | `Worker@2026` | Ramesh Carpenter (Master Fitter, ₹850/day) |
| **Worker** | `worker.suresh@furnicraft.com` | `Worker@2026` | Suresh Specialist (Edge Bander, ₹900/day) |
| **Worker** | `worker.dinesh@furnicraft.com` | `Worker@2026` | Dinesh Polisher (PU Polish, ₹750/day) |

*The login screen includes 1-click demo buttons to automatically populate these credentials.*

---

## 5. Installation and Setup

### Prerequisites
- Node.js (v18+)
- MongoDB Atlas (Cluster `Clusterfurniturepro` configured) or local MongoDB instance

### Setup Steps

1. **Install Dependencies**
   ```bash
   # In server/
   cd server
   npm install

   # In client/
   cd ../client
   npm install
   ```

2. **Configure Environment Variables**
   Verify `server/.env`:
   ```env
   NODE_ENV=development
   PORT=5000
   MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/furnicraft_db?retryWrites=true&w=majority
   JWT_SECRET=furnicraft_secure_jwt_secret_dev_key_must_be_long_and_robust_2026
   JWT_EXPIRES_IN=7d
   CLIENT_URL=http://localhost:5173
   COOKIE_DOMAIN=localhost
   ```

3. **Seed Database**
   ```bash
   cd server
   npm run seed
   ```

4. **Run Application**
   ```bash
   # Terminal 1 (Backend API on port 5000):
   cd server
   npm run dev

   # Terminal 2 (React Frontend on port 5173):
   cd client
   npm run dev
   ```
   Open `http://localhost:5173` in your browser.

---

## 6. Automated Testing

FurniCraft includes automated integration and component test suites covering authentication, resource-level RBAC, calculation multipliers, financial transactions, and tool inventory controls.

### Run Backend Tests (Vitest + Supertest)
```bash
cd server
npm test
```
**Test Coverage Includes:**
- `auth.test.js`: Valid login, invalid credentials, suspended accounts, logout, token revocation.
- `authorization.test.js`: Prevention of IDOR, worker ledger isolation, role modification prevention, admin-only audit route protection.
- `attendance.test.js`: Verification of all 4 multipliers (P=1.0x, HALF=0.5x, P1/5=1.5x, PP=2.0x), duplicate shift prevention.
- `finance.test.js`: Advance request vs actual disbursement, duplicate finalization prevention, partial salary payment allocation.
- `tools.test.js`: Tool issue, duplicate active assignment prevention, condition tracking.

### Run Frontend Tests (Vitest + RTL + JSDOM)
```bash
cd client
npm test
```

---

## 7. Security Architecture

1. **HTTP-only Cookies**: JWTs are issued exclusively as HTTP-only cookies (`furnicraft_token`). Tokens are never accessible to client-side scripts.
2. **Server-Side Enforcement**: UI button visibility is never used as an authorization mechanism. Every API route verifies roles and resource ownership (`authorizeProjectAccess`, `authorizeWorkerAccess`, `authorizeFinancialTransactionAccess`, `authorizeToolAccess`).
3. **No Direct Object Reference (IDOR)**: Workers can only view their own records; Thekedars can only view projects and workers within their authorized scope.
4. **Rate Limiting**: Express rate limiting on `/api/v1/auth/login`, `/register`, and sensitive endpoints.
5. **Append-Only Audit Log**: Every security event, wage revision, attendance approval, financial disbursement, and tool transfer is recorded in `AuditLog` with actor ID, IP, timestamps, and sanitized payloads.

---

## 8. Backup & Production Deployment

- **Database Backup**:
  ```bash
  mongodump --uri="mongodb://localhost:27017/furnicraft_db" --out="/var/backups/furnicraft_$(date +%F)"
  ```
- **Database Restore**:
  ```bash
  mongorestore --uri="mongodb://localhost:27017/furnicraft_db" /var/backups/furnicraft_<date>/furnicraft_db
  ```
- **Production Build**:
  ```bash
  cd client
  npm run build
  ```
  Serve static assets from `client/dist` via Nginx or Express static serving with HTTPS and `NODE_ENV=production`.
