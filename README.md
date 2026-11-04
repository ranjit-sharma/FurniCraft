# FurniCraft — Modern Furniture Workforce & Financial Management ERP

[![Node.js](https://img.shields.io/badge/Node.js-v18+-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-5.4-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB_Atlas-Mongoose-47A248?logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![Vitest](https://img.shields.io/badge/Testing-Vitest-FCC72B?logo=vitest&logoColor=black)](https://vitest.dev/)
[![License](https://img.shields.io/badge/License-ISC-blue.svg)](LICENSE)

**FurniCraft** is an enterprise-grade MERN-stack workforce, attendance, payroll, and workshop financial operations platform engineered exclusively for modern interior furniture manufacturing, cabinetry workshops, and modular installation businesses.

The application natively supports specialized interior carpentry craft scopes:
- **Modular Kitchens** (Base & wall carcasses, acrylic/PU finishes, tandem boxes, servo-drive drawers)
- **Sliding & Walk-in Wardrobes** (Top-hung tracks, aluminum profiles, soft-close dampers, sensor LED channels)
- **TV Units & Acoustic Paneling** (Fluted panels, veneer/laminate finishes, concealed cable conduits)
- **Workstations & Office Desking** (Raceway wiring, modular partitions, pedestal storage)
- **Beds, Headboards & Dressing Units** (Hydraulic storage beds, upholstered fluting, dresser mirrors)
- **Workshop Operations** (Edge-banding, panel-saw cutting, PU polishing, site assembly & hardware fittings)

---

## 1. System Architecture

The following diagram illustrates the end-to-end system architecture of FurniCraft, separating client delivery, security middleware, API services, and data layers:

```mermaid
flowchart TD
    subgraph Client["Frontend Client (Port 8080)"]
        UI["React 18 SPA (Vite)"]
        TC["ThemeContext (Light / Dark / System)"]
        LC["LanguageContext (EN / HI / Hinglish)"]
        AC["AuthContext (JWT Session)"]
        AX["Axios Client (/api/v1)"]
        UI --> TC
        UI --> LC
        UI --> AC
        AC --> AX
    end

    subgraph Gateway["API Gateway & Reverse Proxy"]
        VP["Vite Dev Proxy (Port 8080)"]
        CORS["CORS & Helmet Security Headers"]
        RL["Rate Limiters (Auth / OTP / API)"]
        AX --> VP
        VP -->|Proxy /api| CORS
        CORS --> RL
    end

    subgraph Backend["Express Backend Server (Port 5001)"]
        APP["Express Application (ES Modules)"]
        AUTH_MW["Authentication & RBAC Middleware"]
        ROUTES["Modular REST Routers"]
        SERVICES["Core Business Engines"]
        
        RL --> APP
        APP --> AUTH_MW
        AUTH_MW --> ROUTES
        ROUTES --> SERVICES
    end

    subgraph CoreEngines["Specialized Business Services"]
        PE["Payroll & Wage Engine"]
        AE["Attendance & Multiplier Engine"]
        FE["Finance & Advance Recovery Engine"]
        SE["Email & OTP Service (Nodemailer)"]
        EE["Export Engine (PDFKit & SheetJS)"]
        STE["Help & Support Service (Nodemailer)"]
        
        SERVICES --> PE
        SERVICES --> AE
        SERVICES --> FE
        SERVICES --> SE
        SERVICES --> EE
        SERVICES --> STE
    end

    subgraph Storage["Data & Realtime Layer"]
        MDB[("MongoDB Atlas Database")]
        SIO["Socket.IO Server (Real-time Rooms)"]
        SERVICES -->|Mongoose ODM| MDB
        APP --> SIO
    end
```

---

## 2. Core Business Workflows & Flowcharts

### A. Authentication & Role-Based Access Control (RBAC)
FurniCraft enforces a strict 3-role governance model with protected workforce provisioning:

```mermaid
flowchart TD
    Start([User Visits App]) --> Decision{Has Account?}
    
    Decision -- No --> RegCheck{Is Contractor?}
    RegCheck -- Yes --> RegForm["Register as Thekedar (/register-thekedar)"]
    RegForm --> OtpGen["Generate 6-Digit Email OTP"]
    OtpGen --> VerifyOtp["Verify OTP & Create Account"]
    VerifyOtp --> LoginPrompt["Redirect to Login"]
    RegCheck -- No --> DenyWorkerReg["Public Worker Registration Blocked<br/>(Workers provisioned only by Thekedar/Owner)"]
    
    Decision -- Yes --> LoginForm["Submit Credentials (Email/Phone + Password)"]
    LoginForm --> AuthCheck{Credentials Valid & Active?}
    AuthCheck -- No --> Lockout["Record Failed Attempt / Display Error"]
    AuthCheck -- Yes --> IssueToken["Issue HTTP-Only JWT Cookie + CSRF Token"]
    
    IssueToken --> RoleSwitch{Identify Role}
    RoleSwitch -- OWNER --> OwnerDash["Executive Dashboard (/audit, /members, /thekedars)"]
    RoleSwitch -- THEKEDAR --> ThekedarDash["Contractor Dashboard (/projects, /workers, /attendance)"]
    RoleSwitch -- WORKER --> WorkerBlock["Login Rejected (403)<br/>(Worker records are managed by their Thekedar)"]
```

---

### B. Shift Attendance & Multiplier Calculation Lifecycle
Attendance accurately records daily work multipliers and calculates daily earned wages:

$$\text{Calculated Earnings} = \text{Wage Multiplier} \times \text{Default Daily Wage}$$

```mermaid
flowchart LR
    WMark["Thekedar Logs Shift from Worker Card<br/>(P=1.0x, HALF=0.5x, P1/5=1.5x, PP=2.0x)"] --> StatusPending["Attendance Status: PENDING"]
    StatusPending --> TReview["Thekedar Reviews on Calendar / List"]
    
    TReview --> TAction{Approval Action}
    TAction -- Approve --> Approved["Status: APPROVED"]
    TAction -- Reject --> Rejected["Status: REJECTED"]
    
    Approved --> CalcEarn["Compute Calculated Earnings:<br/>Multiplier × Daily Wage"]
    CalcEarn --> Unprocessed["isPayrollProcessed: false"]
    Unprocessed --> TotalIncome["Accrues to Worker's Total Income"]
```

---

### C. Financial Balance & "Pay Net Wages" Settlement Engine
All financial balances strictly obey the golden accounting formula:

$$\text{Net Balance} = \text{Total Income (Approved Earnings)} - \text{Outstanding Advance Balance}$$

When paying net wages, contractors can deduct outstanding advances directly from both base earnings and bonuses:

```mermaid
flowchart TD
    subgraph LedgerStatus["Live Worker Card Metrics"]
        TI["Total Income: Approved Attendance Shifts (₹)"]
        ADV["Outstanding Advance Balance (₹)"]
        NB["Net Balance = Total Income − Advance"]
        TI --- NB
        ADV --- NB
    end

    subgraph PayNetModal["Pay Net Wages Workflow"]
        OpenModal["Thekedar Opens 'Pay Net Wages' Modal"]
        Inputs["Inputs: Base Earned + Bonus + Food/Room Deductions"]
        BonusDeductToggle{"Deduct Bonus from Advance?<br/>(Default: YES)"}
        
        OpenModal --> Inputs --> BonusDeductToggle
        
        BonusDeductToggle -- Checked --> MaxCut["Max Advance Cut = min(Base + Bonus, Advance)"]
        BonusDeductToggle -- Unchecked --> BaseOnlyCut["Max Advance Cut = min(Base, Advance)"]
        
        MaxCut --> NetFormula["Net Cash Paid = (Base + Bonus) − Advance Cut − Deductions"]
        BaseOnlyCut --> NetFormula
        
        NetFormula --> Confirm["Confirm Payment & Generate Voucher"]
    end

    subgraph Persistence["Database Ledger Impact"]
        Confirm --> CreateTxn["Create SALARY_PAYMENT FinancialTransaction"]
        Confirm --> RedAdv["WorkerProfile: outstandingAdvanceBalance −= Advance Cut"]
        Confirm --> MarkAtt["Attendance: isPayrollProcessed = true"]
        Confirm --> GenBill["Download PDF Payment Bill / Excel Summary"]
    end
```

---

### D. Help & Support Center Ticket & Exclusive Email Routing Lifecycle
Contractors and Owners can submit inquiries, site assistance queries, or technical issue reports directly through the built-in Help & Support modal in the navigation bar:

```mermaid
flowchart TD
    UserNav["User Clicks Help & Support in Navbar"] --> OpenModal["HelpCenterModal Slides Open"]
    OpenModal --> FormInput["Fill Inquiry Details:<br/>• Category (General Inquiry 1st/default, Attendance, Payment, Project, Access)<br/>• Urgency / Priority (Low, Normal, High, Urgent)<br/>• Subject & Description (Up to 2000 chars)"]
    
    FormInput --> Submit["Click 'Submit Request'"]
    Submit --> AnimSpin["Animated Submitting State (Button Disabled & Spinner Active)"]
    
    AnimSpin --> ServerRoute["POST /api/v1/support/tickets"]
    ServerRoute --> GenTicket["Generate Formatted Tracking ID:<br/>TKT-YYYY-XXXX (e.g., TKT-2026-0001)"]
    GenTicket --> SaveDB["Persist to SupportTicket Collection"]
    
    SaveDB --> EmailDispatch["emailService.sendSupportTicketNotification()<br/><b>Strictly & Exclusively to: furnicraft.erp@gmail.com</b>"]
    EmailDispatch --> SuccessAnim["Animated Success Modal:<br/>Scale-In Green Checkmark + Ticket Number + One-Click Copy"]
```

---

## 3. Technology Stack

### Mobile-First & Responsive Desktop Interface

FurniCraft is designed primarily for contractors on their phones, while providing a powerful multi-column workspace on desktop:

- **Sticky Desktop Navigation**: Navbar and Sidebar remain fixed (`sticky top-0`) on desktop view, keeping brand identity, theme/language toggles, Help & Support access, and section navigation permanently accessible while workspace content scrolls.
- **Bottom tab bar** (below 768px): the four most-used screens per role plus a **More** sheet for the rest. The sidebar is shown from 768px up.
- **Bottom sheets**: every dialog (`Modal.jsx`) slides up from the bottom on phones, locks background scroll, and closes on backdrop tap or ESC.
- **Single-Line Filter Pills**: Project status tabs and transaction categories stay strictly on a single line on all devices (`overflow-x-auto no-scrollbar touch-pan-x whitespace-nowrap`) with touch-friendly horizontal swipe.
- **Compact Mobile Transaction Ledger**: On mobile view, matching transaction records display in a 3-card scrollable viewport (`max-h-[352px] overflow-y-auto`) so the official voucher card below remains instantly visible without excessive scrolling. On desktop, it expands to a dual-column ledger with `lg:max-h-[700px]`.
- **4-Item Dashboard Recency Capping**: Dashboard cards (`Recent payments & advances` and `Active projects`) show at most the 4 latest records, with an `All ↗` link directing to full records.
- **Stacked tables**: any table inside `.overflow-x-auto` turns into labelled cards below 640px; labels are copied from the `<th>` headers automatically (`AppLayout.jsx` + `index.css`), so new tables get this for free.
- **Touch & readability**: 44px primary buttons, 36px minimum for pills/selects, 16px inputs (no iOS zoom), no 9-10px text on phones, pinch-zoom allowed.
- **Smooth motion**: route fade-in, sheet slide-up and press feedback, all disabled under `prefers-reduced-motion`.
- **Installable**: `manifest.webmanifest` + safe-area insets (`viewport-fit=cover`) so "Add to Home Screen" opens it full-screen like an app.

To try it on a real phone on the same Wi-Fi, run the client with `npm run dev -- --host` and open the printed Network URL.

### Frontend Architecture
| Technology | Version | Purpose |
| :--- | :--- | :--- |
| **React** | `v18.3.1` | Declarative component UI library |
| **Vite** | `v5.4.21` | High-speed frontend build tool & development server |
| **Tailwind CSS** | `v3.4.13` | Utility-first CSS framework with custom slatewood palette |
| **React Router** | `v6.26.2` | Client-side routing, protected routes, and layout hierarchies |
| **Lucide React** | `v0.446.0` | Modern SVG iconography |
| **FontAwesome** | `v6.5.2` | Industry-standard user & brand vector icons |
| **Axios** | `v1.7.7` | HTTP client with automatic language headers and response interceptors |
| **Socket.IO Client** | `v4.8.0` | Real-time WebSocket room subscriptions |
| **Vitest & RTL** | `v1.6.1` | Unit & integration testing with JSDOM environment |

### Backend Architecture
| Technology | Version | Purpose |
| :--- | :--- | :--- |
| **Node.js** | `v18+ / v24` | Modern asynchronous JavaScript runtime (ES Modules) |
| **Express.js** | `v4.21.0` | Web application framework for modular RESTful routing |
| **MongoDB & Mongoose** | `v8.6.3` | Cloud NoSQL database with schema validation & aggregations |
| **Zod** | `v3.23.8` | Strict runtime request schema validation |
| **JSON Web Token (JWT)**| `v9.0.2` | Stateless authentication tokens stored in HTTP-only cookies |
| **bcryptjs** | `v2.4.3` | Strong password hashing with salt rounds |
| **PDFKit** | `v0.15.0` | Server-side programmatic PDF payment voucher generation |
| **XLSX (SheetJS)** | `v0.18.5` | Exporting clean tabular attendance and ledger sheets |
| **Nodemailer** | `v6.9.15` | Automated OTP email delivery via transactional SMTP |
| **Helmet & Rate Limit**| `v7.1.0` | HTTP security headers and IP-based rate limiting |

---

## 4. Complete Project File Structure

```
FurniCraft/
├── package.json                         # Root package workspace scripts
├── .gitignore                           # Git exclusions (node_modules, .env, dist, logs)
├── README.md                            # Comprehensive system documentation
│
├── client/                              # Frontend React Single Page Application (Port 8080)
│   ├── index.html                       # HTML entry point with early theme bootstrap
│   ├── vite.config.js                   # Vite configuration (Port 8080, /api proxy to 5001)
│   ├── tailwind.config.js               # Tailwind CSS configuration with darkMode: 'class'
│   ├── postcss.config.js                # PostCSS autoprefixer plugins
│   ├── package.json                     # Client dependencies & scripts
│   ├── public/                          # Static brand icons & favicon assets
│   │   ├── furnicraft-logo.png          # Signature FC wood/blue monogram logo
│   │   ├── furnicraft-icon.svg          # Vector furniture monogram mark
│   │   └── favicon.ico                  # Browser tab icon
│   └── src/
│       ├── main.jsx                     # Application bootstrap & DOM root mounting
│       ├── App.jsx                      # Route definitions, ProtectedRoute guards & Layout
│       ├── index.css                    # Tailwind directives, custom scrollbars, dark theme rules
│       ├── api/
│       │   └── client.js                # Central Axios instance with credentials & interceptors
│       ├── context/
│       │   ├── AuthContext.jsx          # User login state, role helpers & logout handler
│       │   ├── LanguageContext.jsx      # Language state (en, hi, hinglish) & t() translation helper
│       │   └── ThemeContext.jsx         # Theme state (light, dark, system) & DOM class toggler
│       ├── locales/
│       │   └── translations.js          # Tri-lingual localization dictionaries (EN / HI / HINGLISH)
│       ├── components/
│       │   ├── common/                  # Reusable UI component library
│       │   │   ├── Badge.jsx            # Status indicators (Approved, Pending, Suspended)
│       │   │   ├── BrandLogo.jsx        # Responsive official FurniCraft emblem
│       │   │   ├── Button.jsx           # Accessible button with loading spinners & variants
│       │   │   ├── Card.jsx             # Themed content card container
│       │   │   ├── ErrorBoundary.jsx    # Graceful React crash fallback container
│       │   │   ├── HelpCenterModal.jsx  # Interactive Help & Support ticket submission with animated success modal
│       │   │   ├── LanguageSelector.jsx # Pill & button variants for language switching
│       │   │   ├── LoadError.jsx        # User-friendly failed network request retry card
│       │   │   ├── Modal.jsx            # Bottom sheet on phones, centered dialog on desktop (ESC, scroll lock)
│       │   │   ├── PageHeader.jsx       # Standardized page title, subtitle & action controls
│       │   │   └── ThemeSelector.jsx    # Light / Dark / System mode switch controls
│       │   ├── layout/                  # Shell layout components
│       │   │   ├── AppLayout.jsx        # Shell: Sticky Navbar + Sticky Sidebar/BottomNav + animated page outlet, phone table stacking
│       │   │   ├── Navbar.jsx           # Sticky top bar with BrandLogo, Help & Support trigger & profile (theme, language, sign out)
│       │   │   ├── Sidebar.jsx          # Sticky desktop sidebar (sticky top-0) + shared role-filtered nav links (useNavLinks)
│       │   │   └── BottomNav.jsx        # Phone bottom tab bar with "More" sheet
│       │   └── attendance/
│       │       └── AttendanceCalendar.jsx # Interactive monthly grid with multiplier badges
│       ├── pages/                       # Dedicated application views
│       │   ├── LoginPage.jsx            # Sign in, demo credentials & Email OTP reset modal
│       │   ├── ThekedarRegisterPage.jsx # Public self-registration for contractors
│       │   ├── OwnerDashboard.jsx       # Owner overview: net payable, unpaid wages, 4-item recent payments & activity cards with All links
│       │   ├── ThekedarDashboard.jsx    # Contractor operations: 4-item active projects & recent transactions cards with All links
│       │   ├── ProjectsPage.jsx         # Furniture project list, single-line status filters across all devices, milestones & creation
│       │   ├── ProjectDetailPage.jsx   # Project money received & site summary
│       │   ├── WorkersPage.jsx          # Worker cards + tap-to-open sheet: Pay Net Wages, Give Advance, Edit, and attendance statement PDF
│       │   ├── ExpensesPage.jsx         # Project money received & site material expenses
│       │   ├── TransactionSearchPage.jsx# Search ledger: 3-card mobile viewport with vertical scroll, 2-column desktop voucher inspection
│       │   ├── DisputesPage.jsx         # Grievances & transparent issue resolution
│       │   ├── AuditLogsPage.jsx        # Tamper-evident immutable system security logs
│       │   ├── MembersOverviewPage.jsx  # Organization roster & active workforce visits
│       │   └── ThekedarsPage.jsx        # Owner contractor oversight & account suspension
│       └── tests/                       # Vitest client test suites
│           ├── setup.js                 # JSDOM matchMedia mock & test configuration
│           ├── ThemeMode.test.jsx       # Dark/Light/System theme toggler tests
│           ├── LoginPage.test.jsx       # Authentication UI validation tests
│           ├── AttendanceCalendar.test.jsx # Shift multiplier rendering tests
│           ├── apiErrors.test.js        # Offline, timeout, and translated API client errors
│           └── AllPagesRender.test.jsx  # Comprehensive zero-blank-screen verification
│
└── server/                              # Backend Node.js / Express REST API (Port 5001)
    ├── package.json                     # Server scripts, dependencies & Vitest config
    ├── vitest.config.js                 # Server test runner configuration
    ├── .env.example                     # Environment configuration template
    ├── tests/                           # Vitest server integration test suites
    │   ├── setup.js                     # Test database connection setup & teardown
    │   ├── auth.test.js                 # Authentication & token verification tests
    │   ├── auth_rules.test.js           # Password reset OTP lifecycle tests
    │   ├── authorization.test.js        # Strict RBAC & IDOR prevention tests
    │   ├── attendance.test.js           # Multiplier calculation & duplicate shift tests
    │   ├── finance.test.js              # Advance recovery & ledger transaction tests
    │   ├── errorHandler.test.js         # Centralized error formatter validation
    │   └── support.test.js              # Help & Support ticket validation & exclusive email destination tests
    └── src/
        ├── server.js                    # HTTP server startup & Socket.IO initialization
        ├── app.js                       # Express app configuration, middleware & route mounting
        ├── config/
        │   ├── constants.js             # Enums: ROLES, SHIFTS, STATUS, CATEGORIES, CODES
        │   ├── db.js                    # Resilient MongoDB connection with DNS fallback
        │   └── env.js                   # Type-safe environment variable validation
        ├── middleware/
        │   ├── authMiddleware.js        # JWT token verification & role enforcement guards
        │   ├── errorHandler.js          # Centralized error formatter (CastError, ValidationError)
        │   ├── rateLimiter.js           # Sensitive endpoint brute-force protection
        │   ├── resourceAuthMiddleware.js# Resource-level access authorization (anti-IDOR)
        │   └── validationMiddleware.js  # Zod schema request body/query validation
        ├── models/                      # Mongoose Schema Definitions
        │   ├── index.js                 # Central model registry
        │   ├── User.js                  # User credentials, role, status & failed login tracking
        │   ├── WorkerProfile.js         # Daily wage, advance balance, skills, bank details
        │   ├── WageAgreement.js         # Historical & contractual daily wage agreements
        │   ├── Attendance.js            # Daily shifts, multiplier (1.0x, 0.5x, 1.5x, 2.0x), approval
        │   ├── AttendanceRuleVersion.js # Audit versioning for shift multiplier rules
        │   ├── Project.js               # Furniture project details, scope & deadlines
        │   ├── ProjectAssignment.js     # Legacy worker-to-project records (read-only; wage overrides)
        │   ├── FinancialTransaction.js  # Immutable double-entry financial ledger records
        │   ├── AdvanceRequest.js        # Worker cash advance requests & approval states
        │   ├── Payroll.js               # Finalized monthly payroll sheets
        │   ├── PayrollAdjustment.js     # Post-finalization debit/credit adjustments
        │   ├── ProjectExpense.js        # Hardware, laminates, fittings & site expenses
        │   ├── ProjectMoneyReceived.js  # Client milestone payment receipts
        │   ├── SupportTicket.js         # Help & support inquiries, ticket codes & dispatch status
        │   ├── Dispute.js               # Worker grievances & resolution status
        │   ├── Notification.js          # In-app real-time notification alerts
        │   ├── OtpRecord.js             # Hashed 6-digit OTPs with expiration timestamps
        │   ├── RevokedToken.js          # Blacklisted JWTs upon logout
        │   └── AuditLog.js              # Tamper-evident security and activity audit trail
        ├── routes/                      # REST API Endpoint Routers
        │   ├── authRoutes.js            # /api/v1/auth (Login, Logout, Me, OTP Reset)
        │   ├── userRoutes.js            # /api/v1/users (Workers, Thekedars, Status changes)
        │   ├── projectRoutes.js         # /api/v1/projects (CRUD, money received)
        │   ├── attendanceRoutes.js      # /api/v1/attendance (Mark, Approve, Bulk, Calendar)
        │   ├── payrollRoutes.js         # /api/v1/payroll (Preview, Finalize, Lock, Adjust)
        │   ├── financeRoutes.js         # /api/v1/finance (Ledger, Advances, Give Advance, Pay Net Wages)
        │   ├── expenseRoutes.js         # /api/v1/expenses (Client payments & project costs)
        │   ├── reportRoutes.js          # /api/v1/reports (PDF vouchers, Excel attendance)
        │   ├── supportRoutes.js         # /api/v1/support (Help & Support ticket creation & dispatch)
        │   ├── systemRoutes.js          # /api/v1/system (System health & diagnostics)
        │   ├── disputeRoutes.js         # /api/v1/disputes (Filing & administrative resolution)
        │   └── auditRoutes.js           # /api/v1/audit (Owner-only security audit log queries)
        ├── services/                    # Encapsulated Business Logic Services
        │   ├── authService.js           # Authentication, session tokens & OTP lifecycle
        │   ├── attendanceService.js     # Shift evaluation, earnings aggregation, calendar data
        │   ├── financeService.js        # Advance disbursements, net pay computation, ledger
        │   ├── payrollEngineService.js  # Monthly salary computation & immutable locking
        │   ├── projectService.js        # Furniture project lifecycle & money received
        │   ├── reportService.js         # Tabular data preparation for exports
        │   ├── exportService.js         # PDFKit payslip documents & Excel workbook formatting
        │   ├── emailService.js          # Transactional email dispatcher with Nodemailer
        │   ├── smsService.js            # SMS Gateway abstraction (Console, Fast2SMS, Twilio)
        │   └── auditService.js          # Asynchronous audit log persistence
        ├── utils/                       # Shared Helper Utilities
        │   ├── decimal.js               # Currency-safe floating point math utilities
        │   ├── errors.js                # Standardized AppError, NotFoundError, AuthError classes
        │   ├── jwt.js                   # JWT token generation & cookie signing helpers
        │   └── phone.js                 # Indian standard phone number normalization
        ├── validators/
        │   └── schemas.js               # Zod schemas for all inbound request validation
        └── scripts/
            ├── seed.js                  # Comprehensive database seeder with demo accounts
            ├── restore-test-fixtures.js # Fast test user reset script
            ├── create_owner_ranjit.js   # Standalone executive owner provisioning script
            └── cleanup_test_data.js     # Purge ephemeral test records after execution
```

---

## 5. User Roles & Permissions Matrix

FurniCraft has **exactly three user roles** (no ambiguous supervisor roles):

| Feature / Action | Owner / Admin | Thekedar (Contractor) | Worker (Craftsman) |
| :--- | :---: | :---: | :---: |
| **Self-Registration** | ❌ *(Configured)* | ✅ *(Email OTP Verified)* | ❌ *(Provisioned only)* |
| **View Organization Audit Logs** | ✅ *(Exclusive)* | ❌ | ❌ |
| **Suspend / Activate Contractor Accounts** | ✅ | ❌ | ❌ |
| **Suspend / Activate Worker Accounts** | ❌ *(Thekedar responsibility)* | ✅ *(Under their supervision)* | ❌ |
| **Create & Manage Furniture Projects** | 👁️ *(Read-Only)* | ✅ *(Full Management)* | ❌ |
| **Register & Wage-Rate New Workers** | ✅ | ✅ | ❌ |
| **Log Shift Attendance** | ❌ | ✅ *(From worker cards)* | ❌ |
| **Approve / Reject Attendance Shifts** | ❌ | ✅ *(Single & Bulk)* | ❌ |
| **Disburse Advance & Pay Net Wages** | ❌ | ✅ | ❌ |
| **Deduct Advance Directly from Bonus** | ❌ | ✅ *(In Pay Net Modal)* | ❌ |
| **Delete Worker Account** | ❌ | ✅ *(ONLY if Net Balance = ₹0)* | ❌ |
| **Theme & Language Preference Toggle** | ✅ | ✅ | ❌ |
| **Access Help & Support Center** | ✅ | ✅ | ❌ |

> Workers cannot sign in (`POST /auth/login` returns 403). Their profiles, attendance, advances and payouts are managed by their Thekedar.

---

## 6. Configured Shift Multipliers & Wage Rules

FurniCraft implements the standard shopfloor wage conventions of the Indian modern furniture industry:

| Shift Code | Multiplier | Shift Description | Working Hours / Scope | Earned Formula |
| :---: | :---: | :--- | :--- | :--- |
| **`P`** | **1.0x** | Full Day Shift | Standard 8–9 hours work day | `1.0 × Daily Wage` |
| **`HALF`** | **0.5x** | Half Day Shift | 4 hours or half work day | `0.5 × Daily Wage` |
| **`P1/5`** | **1.5x** | Extended Evening Shift | Standard day + overtime until 9:00 PM | `1.5 × Daily Wage` |
| **`PP`** | **2.0x** | Double Shift / Night Stint | Standard day + intense work until Midnight | `2.0 × Daily Wage` |
| **`ABSENT`** | **0.0x** | Unexcused Absence | No attendance on scheduled work day | `₹0` |
| **`LEAVE`** | **0.0x** | Authorized Leave | Approved off-day or emergency leave | `₹0` |

---

## 7. Quick Start & Installation

### Prerequisites
- **Node.js**: v18.0.0 or later (v20+ recommended)
- **MongoDB**: Local MongoDB community server (port 27017) or MongoDB Atlas cluster URI
- **Package Manager**: npm (v9+) or pnpm / yarn

### Installation Steps

1. **Clone the Repository**
   ```bash
   git clone https://github.com/ranjit-sharma/FurniCraft.git
   cd FurniCraft
   ```

2. **Install Root, Server & Client Dependencies**
   ```bash
   # Install server dependencies
   cd server
   npm install

   # Install client dependencies
   cd ../client
   npm install
   ```

3. **Configure Environment Variables**
   Create `server/.env` based on `server/.env.example`:
   ```env
   NODE_ENV=development
   PORT=5001
   MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/furnicraft_db?retryWrites=true&w=majority
   JWT_SECRET=furnicraft_secure_jwt_secret_dev_key_must_be_long_and_robust_2026
   JWT_EXPIRES_IN=7d
   CLIENT_URL=http://localhost:8080
   COOKIE_DOMAIN=localhost

   # Transactional Email (Google App Password)
   EMAIL_SERVICE=gmail
   SMTP_USER=your_email@gmail.com
   SMTP_PASS=your_16_character_app_password
   EMAIL_FROM="FurniCraft ERP" <no-reply@furnicraft.com>
   ```

4. **Seed Database with Sample Data**
   ```bash
   cd server
   npm run seed
   ```

5. **Start Both Services**
   ```bash
   # Terminal 1 — Start Backend API (Port 5001):
   cd server
   npm run dev

   # Terminal 2 — Start Frontend Client (Port 8080):
   cd client
   npm run dev
   ```
   Open your browser at: **`http://localhost:8080`**

### Deploying to Render

FurniCraft is configured for zero-friction cloud deployment on [Render](https://render.com). It can be deployed in seconds as a single **Unified Web Service** (where Express serves both the REST API and the built React SPA):

1. **Create a New Web Service** on Render and connect `https://github.com/ranjit-sharma/FurniCraft.git`.
2. **Build & Start Commands** (Root defaults now work out of the box):
   - **Root Directory**: Leave blank (defaults to repository root `.`)
   - **Environment**: `Node`
   - **Build Command**: `npm install && npm run build` *(or `npm run build`)*
   - **Start Command**: `npm start`
3. **Environment Variables** (Under the "Environment" tab):
   - `NODE_ENV`: `production`
   - `MONGODB_URI`: `mongodb+srv://<username>:<password>@cluster0.mongodb.net/furnicraft_db?retryWrites=true&w=majority`
   - `JWT_SECRET`: Any random 32+ character secret string
   - `JWT_EXPIRES_IN`: `7d`
   - `PORT`: Leave blank (Render injects its own port automatically, typically `10000`)
4. **Click "Deploy Web Service"**:
   - The root build script installs both server and client packages, builds the client via Vite, and boots the backend with Express serving the React SPA and API on the same domain.
   - Alternatively, Render will automatically detect the included [`render.yaml`](file:///c:/Users/ranji/Desktop/project/FurniCraft/render.yaml) blueprint!

---

## 8. Safe Seed Demo Accounts

The seed script provides ready-to-test accounts representing all three operational roles (worker accounts exist as records only; their login is rejected):

> ⚠️ `npm run seed` **deletes every collection** before inserting demo data. Never run it against a production `MONGODB_URI`.

| Role | Email / Login Identifier | Password | Name & Operational Scope |
| :--- | :--- | :--- | :--- |
| **Owner / Director** | `ranjitsharma7520@gmail.com`<br/>*(or `+91 98765 75200`)* | `ranjit@7520` | **Ranjit Sharma** (Executive Business Owner) |
| **Owner / Director** | `owner@furnicraft.com`<br/>*(or `+91 98765 43210`)* | `FurniOwner@2026` | **Vikramaditya Sharma** (Managing Director) |
| **Thekedar (Contractor)** | `thekedar.rajesh@furnicraft.com`<br/>*(or `+91 98111 22334`)* | `Thekedar@2026` | **Rajesh Thekedar** (Modular & Cabinetry Contractor) |
| **Worker (Master Craftsman)** | `worker.ramesh@furnicraft.com`<br/>*(or `+91 99222 33445`)* | `Worker@2026` | **Ramesh Carpenter** (Cabinet Maker, ₹800/day) |
| **Worker (Modular Specialist)**| `worker.suresh@furnicraft.com`<br/>*(or `+91 99333 44556`)* | `Worker@2026` | **Suresh Specialist** (Modular Assembly, ₹750/day) |

---

## 9. Automated Testing Suite

FurniCraft includes rigorous end-to-end integration and component test suites verifying RBAC, accounting formulas, shift multipliers, and zero-blank-screen rendering.

```bash
# Run all tests (Server + Client in parallel):
npm test

# Run Server Tests Only (Vitest + Supertest):
# ⚠️ Uses MONGODB_URI from server/.env and creates/deletes records — point it at a test database first.
cd server
npm test

# Run Client Tests Only (Vitest + RTL + JSDOM):
cd client
npm test
```

### Server Integration Test Suites (`server/tests/`)
- **`auth.test.js`**: Session lifecycle, login credentials, token blacklist on logout, suspended user blocking.
- **`auth_rules.test.js`**: 6-digit email OTP generation, 5-minute expiration, attempt rate-limiting, secure password reset.
- **`authorization.test.js`**: In-depth RBAC, IDOR prevention, worker ledger isolation, read-only project limits for Owner, safe worker deletion ($₹0$ net balance enforcement).
- **`attendance.test.js`**: Precision multiplier calculations (`P`, `HALF`, `P1/5`, `PP`), single and bulk approval transitions, duplicate shift prevention.
- **`errorHandler.test.js`**: Friendly messages for unexpected errors, database outages, malformed JSON and invalid record links (no database needed).
- **`finance.test.js`**: Cash advance disbursement, wage settlement, bonus-to-advance offsets, immutable payment transactions.
- **`support.test.js`**: Help & Support ticket creation, schema validation, rate-limiting, and guarantees email dispatch strictly and exclusively to `furnicraft.erp@gmail.com`.

### Client Component Test Suites (`client/src/tests/`)
- **`ThemeMode.test.jsx`**: Light, Dark (`#020617` slate), and System mode toggles, localStorage persistence, profile toggler dropdown verification.
- **`AttendanceCalendar.test.jsx`**: Shift badge rendering, multiplier tag colors, day-wise calculations.
- **`LoginPage.test.jsx`**: Responsive login form inputs, show/hide password toggle, contractor registration redirect.
- **`apiErrors.test.js`**: Offline, timeout, session-expiry, 4xx/5xx and translated error messages from the API client.
- **`AllPagesRender.test.jsx`**: 12-page comprehensive zero-blank-screen smoke test across all application views.

---

## 10. Security & Data Integrity Highlights

1. **HTTP-Only Cookie Storage**: JWTs are stored in secure HTTP-only cookies (`furnicraft_token`). Tokens cannot be stolen via Cross-Site Scripting (XSS).
2. **Server-Side Authorization**: UI component hiding is never trusted as a security boundary. Every API endpoint checks actor identity and resource ownership (`resourceAuthMiddleware.js`).
3. **Double-Entry Financial Transactions**: Advance disbursements and salary payments create immutable `FinancialTransaction` records with unique transaction codes (e.g. `TXN-NET-2026-001`).
4. **Tamper-Evident Audit Logs**: All administrative actions (user suspensions, wage agreement revisions, project deletions) are logged asynchronously to the `AuditLog` collection.
5. **Safe Worker Deletion Guard**: A worker record cannot be deleted from the system while having unrecovered cash advances or unsettled earned wages. The net balance must be resolved to exactly ₹0.
6. **User-Friendly Error Handling**: The server never sends internal error text to users — unexpected failures return a generic message (and are logged with method + URL), a database outage returns `503`, and malformed JSON, bad record links and duplicate records get plain-language messages (`middleware/errorHandler.js`). Uncaught exceptions are logged and exit the process so the host restarts it.
7. **Clear Errors on the Phone**: every API failure becomes an `ApiError` with a translated message (English / Hindi / Hinglish) for offline, timeout (30s), unreachable server, expired session (auto sign-out with a notice on the login screen), rate limits and server errors (`client/src/api/client.js`). Screens that fail to load show a retry card (`LoadError`), an offline banner appears when the connection drops, and a crashed or failed-to-download screen shows a friendly recovery card instead of technical details (`ErrorBoundary`).
8. **Modern PDFs**: attendance statements (per individual craftsman statement, **one month at a time** via `?year=YYYY&month=M&workerId=...`) and payment / advance receipts share one design (`services/pdfTheme.js`) using the bundled open-source Noto Sans font (`server/src/assets/fonts`, SIL OFL), so ₹ prints correctly.
9. **Email OTP**: password-reset codes are sent through Gmail SMTP with a Google App Password (`EMAIL_SERVICE=gmail`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM`). The server checks the SMTP login at startup and logs `[EmailService] SMTP ready` or the exact failure. In production it never reports "code sent" unless Gmail accepted the email. Owner accounts are intentionally not recoverable by email. On Render, set these variables in the dashboard (they are listed in `render.yaml`).
10. **Help & Support Privacy & Exclusive Email Routing**: Support requests submitted via the in-app Help Center are sanitized, assigned unique tracking identifiers (e.g. `TKT-2026-0001`), and routed strictly and exclusively to `furnicraft.erp@gmail.com`. No user or third-party email addresses are ever added as CC or recipients, guaranteeing data privacy.
11. **Responsive Viewport Density & Recency Capping**: High-traffic ledger views and dashboard cards enforce strict item count thresholds (e.g. 4-item recent dashboard limit, 3-card mobile viewport ledger scroll) to prevent vertical scroll fatigue and maintain instant visibility of primary voucher action inspection cards.

---

## 11. Contributing & License

Contributions, issues, and feature requests are welcome. Feel free to open an issue or pull request on the repository.

Distributed under the **ISC License**. Designed and developed for the modern furniture manufacturing and craftsmen community.
