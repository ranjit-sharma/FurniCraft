import mongoose from 'mongoose';
import { connectDB, disconnectDB } from '../config/db.js';
import {
  User,
  WorkerProfile,
  Project,
  ProjectAssignment,
  AttendanceRuleVersion,
  WageAgreement,
  Attendance,
  AdvanceRequest,
  FinancialTransaction,
  Payroll,
  Tool,
  ToolIssue,
  FurnitureTask,
  ProjectExpense,
  AuditLog,
  Dispute,
} from '../models/index.js';
import {
  ROLES,
  USER_STATUS,
  FURNITURE_TYPES,
  PROJECT_STATUS,
  PROJECT_PRIORITY,
  ATTENDANCE_CODES,
  ATTENDANCE_STATUS,
  FINANCIAL_CATEGORIES,
  PAYMENT_METHODS,
  PAYROLL_STATUS,
  TOOL_CATEGORIES,
  TOOL_CONDITION,
  TOOL_STATUS,
  FURNITURE_TASK_TYPES,
  TASK_STATUS,
  EXPENSE_CATEGORIES,
} from '../config/constants.js';

const seedDatabase = async () => {
  try {
    await connectDB();
    console.log('[Seed] Connected to database. Clearing existing collections...');

    // Clean existing collections
    await Promise.all([
      User.deleteMany({}),
      WorkerProfile.deleteMany({}),
      Project.deleteMany({}),
      ProjectAssignment.deleteMany({}),
      AttendanceRuleVersion.deleteMany({}),
      WageAgreement.deleteMany({}),
      Attendance.deleteMany({}),
      AdvanceRequest.deleteMany({}),
      FinancialTransaction.deleteMany({}),
      Payroll.deleteMany({}),
      Tool.deleteMany({}),
      ToolIssue.deleteMany({}),
      FurnitureTask.deleteMany({}),
      ProjectExpense.deleteMany({}),
      AuditLog.deleteMany({}),
      Dispute.deleteMany({}),
    ]);

    console.log('[Seed] Existing collections cleared.');

    // 1. Create Default Attendance Rule Version
    const defaultRule = await AttendanceRuleVersion.create({
      versionNumber: 1,
      multipliers: {
        P: 1.0,
        HALF: 0.5,
        'P1/5': 1.5,
        PP: 2.0,
        ABSENT: 0.0,
        LEAVE: 0.0,
      },
      description: 'Standard modern furniture shop rule (P=1.0, HALF=0.5, P1/5=1.5, PP=2.0)',
      effectiveDate: new Date('2026-01-01'),
      isCurrent: true,
    });
    console.log('[Seed] Attendance Rule Version 1 created.');

    // 2. Create Users (Owner, Thekedar, Workers)
    console.log('[Seed] Creating Users...');
    const owner = await User.create({
      name: 'Vikramaditya Sharma',
      email: 'owner@furnicraft.com',
      phone: '+91 98765 43210',
      password: 'FurniOwner@2026',
      role: ROLES.OWNER,
      status: USER_STATUS.ACTIVE,
    });

    const thekedar = await User.create({
      name: 'Rajesh Thekedar',
      email: 'thekedar.rajesh@furnicraft.com',
      phone: '+91 98111 22334',
      password: 'Thekedar@2026',
      role: ROLES.THEKEDAR,
      status: USER_STATUS.ACTIVE,
    });

    const worker1 = await User.create({
      name: 'Ramesh Carpenter',
      email: 'worker.ramesh@furnicraft.com',
      phone: '+91 99222 33445',
      password: 'Worker@2026',
      role: ROLES.WORKER,
      assignedThekedar: thekedar._id,
      status: USER_STATUS.ACTIVE,
    });

    const worker2 = await User.create({
      name: 'Suresh Modular Specialist',
      email: 'worker.suresh@furnicraft.com',
      phone: '+91 99333 44556',
      password: 'Worker@2026',
      role: ROLES.WORKER,
      assignedThekedar: thekedar._id,
      status: USER_STATUS.ACTIVE,
    });

    const worker3 = await User.create({
      name: 'Dinesh Polisher',
      email: 'worker.dinesh@furnicraft.com',
      phone: '+91 99444 55667',
      password: 'Worker@2026',
      role: ROLES.WORKER,
      assignedThekedar: thekedar._id,
      status: USER_STATUS.ACTIVE,
    });

    // 3. Worker Profiles & Wage Agreements
    console.log('[Seed] Creating Worker Profiles & Wage Agreements...');
    const wp1 = await WorkerProfile.create({
      userId: worker1._id,
      thekedarId: thekedar._id,
      workerCode: 'WRK-0001',
      skills: ['Cabinet Making', 'Modular Assembly', 'Panel Saw Cutting'],
      defaultDailyWage: 800,
      bankDetails: {
        upiId: 'ramesh@upi',
        accountNumber: '112233445566',
        ifscCode: 'SBIN0001234',
        bankName: 'State Bank of India',
      },
      outstandingAdvanceBalance: 1500,
      totalAdvancesDisbursed: 5000,
      totalAdvancesRecovered: 3500,
      outstandingSalaryBalance: 4800,
    });

    const wp2 = await WorkerProfile.create({
      userId: worker2._id,
      thekedarId: thekedar._id,
      workerCode: 'WRK-0002',
      skills: ['Edge Banding', 'Hardware Fitting', 'Hafele/Hettich Channels'],
      defaultDailyWage: 850,
      bankDetails: {
        upiId: 'suresh@okhdfcbank',
        accountNumber: '998877665544',
        ifscCode: 'HDFC0004321',
        bankName: 'HDFC Bank',
      },
      outstandingAdvanceBalance: 0,
      totalAdvancesDisbursed: 3000,
      totalAdvancesRecovered: 3000,
      outstandingSalaryBalance: 5100,
    });

    const wp3 = await WorkerProfile.create({
      userId: worker3._id,
      thekedarId: thekedar._id,
      workerCode: 'WRK-0003',
      skills: ['PU Polish', 'Melamine Coating', 'Surface Sanding'],
      defaultDailyWage: 750,
      bankDetails: {
        upiId: 'dinesh@paytm',
        accountNumber: '554433221100',
        ifscCode: 'ICIC0005678',
        bankName: 'ICICI Bank',
      },
      outstandingAdvanceBalance: 500,
      totalAdvancesDisbursed: 2000,
      totalAdvancesRecovered: 1500,
      outstandingSalaryBalance: 3750,
    });

    await WageAgreement.create([
      { workerId: worker1._id, thekedarId: thekedar._id, dailyWage: 800, effectiveFrom: new Date('2026-01-01'), createdBy: thekedar._id },
      { workerId: worker2._id, thekedarId: thekedar._id, dailyWage: 850, effectiveFrom: new Date('2026-01-01'), createdBy: thekedar._id },
      { workerId: worker3._id, thekedarId: thekedar._id, dailyWage: 750, effectiveFrom: new Date('2026-01-01'), createdBy: thekedar._id },
    ]);

    // 4. Modern Furniture Projects
    console.log('[Seed] Creating Modern Furniture Projects...');
    const project1 = await Project.create({
      projectCode: 'FURN-2026-001',
      name: 'DLF Phase 5 - Villa 14 Acrylic Modular Kitchen & Island Bar',
      clientName: 'Aarav Singhania',
      clientPhone: '+91 98100 11223',
      siteAddress: 'Villa 14, Magnolias, Golf Course Road, Gurugram',
      projectType: FURNITURE_TYPES.MODULAR_KITCHEN,
      priority: PROJECT_PRIORITY.CRITICAL,
      status: PROJECT_STATUS.IN_PROGRESS,
      thekedarId: thekedar._id,
      startDate: new Date('2026-09-01'),
      targetCompletionDate: new Date('2026-10-30'),
      estimatedBudget: 450000,
      notes: 'High-gloss acrylic finish with Blum servo-drive drawers and quartz countertop carcass',
    });

    const project2 = await Project.create({
      projectCode: 'FURN-2026-002',
      name: 'Golf Links Penthouse - 4-BHK Master Wardrobes & TV Panels',
      clientName: 'Dr. Meenakshi Sundaram',
      clientPhone: '+91 98200 44556',
      siteAddress: 'Tower B, Penthouse 1802, Golf Links Sector 54',
      projectType: FURNITURE_TYPES.WARDROBE_SLIDING,
      priority: PROJECT_PRIORITY.HIGH,
      status: PROJECT_STATUS.IN_PROGRESS,
      thekedarId: thekedar._id,
      startDate: new Date('2026-09-15'),
      targetCompletionDate: new Date('2026-11-15'),
      estimatedBudget: 380000,
      notes: 'Floor-to-ceiling floor sliders with tinted fluted glass and internal sensor LED channels',
    });

    const project3 = await Project.create({
      projectCode: 'FURN-2026-003',
      name: 'Cyber City Tech Studio - 40-Desk Modular Workstations',
      clientName: 'Nexus Cloud Technologies',
      clientPhone: '+91 98300 77889',
      siteAddress: 'Building 10C, 4th Floor, DLF Cyber City, Gurugram',
      projectType: FURNITURE_TYPES.OFFICE_WORKSTATION,
      priority: PROJECT_PRIORITY.MEDIUM,
      status: PROJECT_STATUS.PLANNED,
      thekedarId: thekedar._id,
      startDate: new Date('2026-10-01'),
      targetCompletionDate: new Date('2026-11-30'),
      estimatedBudget: 520000,
      notes: 'Pre-laminated particle board with powder-coated aluminum raceways and wire management',
    });

    // 5. Project Assignments (Worker assigned to multiple projects)
    console.log('[Seed] Assigning Workers to Projects...');
    await ProjectAssignment.create([
      { workerId: worker1._id, projectId: project1._id, thekedarId: thekedar._id, assignedBy: thekedar._id, roleInProject: 'Master Assembly Carpenter', wageOverride: 850 },
      { workerId: worker1._id, projectId: project2._id, thekedarId: thekedar._id, assignedBy: thekedar._id, roleInProject: 'Wardrobe Frame Fitter', wageOverride: null },
      { workerId: worker2._id, projectId: project1._id, thekedarId: thekedar._id, assignedBy: thekedar._id, roleInProject: 'Edge Bander Operator', wageOverride: null },
      { workerId: worker2._id, projectId: project2._id, thekedarId: thekedar._id, assignedBy: thekedar._id, roleInProject: 'Sliding Track Specialist', wageOverride: 900 },
      { workerId: worker3._id, projectId: project1._id, thekedarId: thekedar._id, assignedBy: thekedar._id, roleInProject: 'PU Finish Polisher', wageOverride: null },
    ]);

    // 6. Tools Central Inventory & Issues
    console.log('[Seed] Creating Central Tool Inventory...');
    const tool1 = await Tool.create({
      toolCode: 'TOOL-DRL-001',
      name: 'Bosch GSB 18V-50 Brushless Impact Drill',
      category: TOOL_CATEGORIES.DRILL,
      brand: 'Bosch',
      modelNumber: 'GSB 18V-50',
      serialNumber: 'BSH-987621',
      condition: TOOL_CONDITION.EXCELLENT,
      status: TOOL_STATUS.ISSUED,
      purchaseDate: new Date('2025-08-10'),
      purchaseCost: 14500,
    });

    const tool2 = await Tool.create({
      toolCode: 'TOOL-RTR-002',
      name: 'Makita RP2301FC Plunge Wood Router (2100W)',
      category: TOOL_CATEGORIES.ROUTER,
      brand: 'Makita',
      modelNumber: 'RP2301FC',
      serialNumber: 'MKT-443210',
      condition: TOOL_CONDITION.GOOD,
      status: TOOL_STATUS.AVAILABLE,
      purchaseDate: new Date('2025-11-20'),
      purchaseCost: 22000,
    });

    const tool3 = await Tool.create({
      toolCode: 'TOOL-SAW-003',
      name: 'Festool TS 55 Plunge Cut Circular Saw with Guide Rail',
      category: TOOL_CATEGORIES.CUTTER,
      brand: 'Festool',
      modelNumber: 'TS 55 FEBQ',
      serialNumber: 'FST-887711',
      condition: TOOL_CONDITION.EXCELLENT,
      status: TOOL_STATUS.ISSUED,
      purchaseDate: new Date('2026-02-14'),
      purchaseCost: 58000,
    });

    const tool4 = await Tool.create({
      toolCode: 'TOOL-EDG-004',
      name: 'Virutex Portable Edge Bander PEB250TR',
      category: TOOL_CATEGORIES.EDGE_BANDER_TOOL,
      brand: 'Virutex',
      modelNumber: 'PEB250TR',
      serialNumber: 'VTX-112299',
      condition: TOOL_CONDITION.EXCELLENT,
      status: TOOL_STATUS.AVAILABLE,
      purchaseDate: new Date('2026-03-01'),
      purchaseCost: 65000,
    });

    // Issue tool 1 to Worker 1 on Project 1
    const issue1 = await ToolIssue.create({
      issueCode: 'ISSUE-2026-001',
      toolId: tool1._id,
      projectId: project1._id,
      workerId: worker1._id,
      issuedBy: thekedar._id,
      issueDate: new Date('2026-10-01'),
      expectedReturnDate: new Date('2026-10-25'),
      conditionAtIssue: TOOL_CONDITION.EXCELLENT,
      status: 'ISSUED',
      acknowledgedByWorker: true,
      acknowledgedAt: new Date('2026-10-01T10:30:00Z'),
    });
    tool1.currentAssignment = {
      projectId: project1._id,
      workerId: worker1._id,
      issueDate: new Date('2026-10-01'),
      toolIssueId: issue1._id,
    };
    await tool1.save();

    // Issue tool 3 to Worker 2 on Project 2
    const issue2 = await ToolIssue.create({
      issueCode: 'ISSUE-2026-002',
      toolId: tool3._id,
      projectId: project2._id,
      workerId: worker2._id,
      issuedBy: thekedar._id,
      issueDate: new Date('2026-10-05'),
      expectedReturnDate: new Date('2026-10-28'),
      conditionAtIssue: TOOL_CONDITION.EXCELLENT,
      status: 'ISSUED',
      acknowledgedByWorker: true,
      acknowledgedAt: new Date('2026-10-05T09:15:00Z'),
    });
    tool3.currentAssignment = {
      projectId: project2._id,
      workerId: worker2._id,
      issueDate: new Date('2026-10-05'),
      toolIssueId: issue2._id,
    };
    await tool3.save();

    // 7. Attendance Records (Demonstrating all 4 multipliers: P=1x, HALF=0.5x, P1/5=1.5x, PP=2.0x)
    console.log('[Seed] Creating Attendance Records demonstrating all four multipliers...');
    const attendanceEntries = [
      // Ramesh Carpenter (Project 1, wage override 850)
      {
        workerId: worker1._id,
        projectId: project1._id,
        thekedarId: thekedar._id,
        date: '2026-10-01',
        shift: 'GENERAL',
        code: ATTENDANCE_CODES.P, // 1.0x -> 850
        submissionStatus: 'SUBMITTED',
        approvalStatus: ATTENDANCE_STATUS.APPROVED,
        submittedBy: worker1._id,
        approvedBy: thekedar._id,
        approvedAt: new Date('2026-10-01T19:00:00Z'),
        checkInTime: '09:00',
        checkOutTime: '18:00',
        applicableDailyWage: 850,
        wageMultiplier: 1.0,
        calculatedEarnings: 850,
      },
      {
        workerId: worker1._id,
        projectId: project1._id,
        thekedarId: thekedar._id,
        date: '2026-10-02',
        shift: 'GENERAL',
        code: ATTENDANCE_CODES.HALF, // 0.5x -> 425
        submissionStatus: 'SUBMITTED',
        approvalStatus: ATTENDANCE_STATUS.APPROVED,
        submittedBy: worker1._id,
        approvedBy: thekedar._id,
        approvedAt: new Date('2026-10-02T19:00:00Z'),
        checkInTime: '09:00',
        checkOutTime: '13:30',
        applicableDailyWage: 850,
        wageMultiplier: 0.5,
        calculatedEarnings: 425,
      },
      {
        workerId: worker1._id,
        projectId: project1._id,
        thekedarId: thekedar._id,
        date: '2026-10-03',
        shift: 'GENERAL',
        code: ATTENDANCE_CODES.P1_5, // 1.5x -> 1275 (Extended to 9 PM)
        submissionStatus: 'SUBMITTED',
        approvalStatus: ATTENDANCE_STATUS.APPROVED,
        submittedBy: worker1._id,
        approvedBy: thekedar._id,
        approvedAt: new Date('2026-10-03T21:30:00Z'),
        checkInTime: '09:00',
        checkOutTime: '21:00',
        extraWorkCategory: 'Extended work until 9 PM for acrylic carcass urgent fitting',
        applicableDailyWage: 850,
        wageMultiplier: 1.5,
        calculatedEarnings: 1275,
      },
      {
        workerId: worker1._id,
        projectId: project1._id,
        thekedarId: thekedar._id,
        date: '2026-10-04',
        shift: 'GENERAL',
        code: ATTENDANCE_CODES.PP, // 2.0x -> 1700 (Extended until midnight)
        submissionStatus: 'SUBMITTED',
        approvalStatus: ATTENDANCE_STATUS.APPROVED,
        submittedBy: worker1._id,
        approvedBy: thekedar._id,
        approvedAt: new Date('2026-10-05T08:00:00Z'),
        checkInTime: '09:00',
        checkOutTime: '00:00',
        extraWorkCategory: 'Extended work until midnight for client site handover deadline',
        applicableDailyWage: 850,
        wageMultiplier: 2.0,
        calculatedEarnings: 1700,
      },
      // Suresh Modular (Project 2, wage override 900)
      {
        workerId: worker2._id,
        projectId: project2._id,
        thekedarId: thekedar._id,
        date: '2026-10-01',
        shift: 'GENERAL',
        code: ATTENDANCE_CODES.P, // 1.0x -> 900
        submissionStatus: 'SUBMITTED',
        approvalStatus: ATTENDANCE_STATUS.APPROVED,
        submittedBy: worker2._id,
        approvedBy: thekedar._id,
        approvedAt: new Date('2026-10-01T19:00:00Z'),
        checkInTime: '09:30',
        checkOutTime: '18:30',
        applicableDailyWage: 900,
        wageMultiplier: 1.0,
        calculatedEarnings: 900,
      },
      {
        workerId: worker2._id,
        projectId: project2._id,
        thekedarId: thekedar._id,
        date: '2026-10-02',
        shift: 'GENERAL',
        code: ATTENDANCE_CODES.P1_5, // 1.5x -> 1350
        submissionStatus: 'SUBMITTED',
        approvalStatus: ATTENDANCE_STATUS.APPROVED,
        submittedBy: worker2._id,
        approvedBy: thekedar._id,
        approvedAt: new Date('2026-10-02T21:30:00Z'),
        checkInTime: '09:00',
        checkOutTime: '21:00',
        extraWorkCategory: 'Extended to 9PM for wardrobe aluminum profile alignments',
        applicableDailyWage: 900,
        wageMultiplier: 1.5,
        calculatedEarnings: 1350,
      },
      // Pending submission awaiting Thekedar approval
      {
        workerId: worker3._id,
        projectId: project1._id,
        thekedarId: thekedar._id,
        date: '2026-10-04',
        shift: 'GENERAL',
        code: ATTENDANCE_CODES.P,
        submissionStatus: 'SUBMITTED',
        approvalStatus: ATTENDANCE_STATUS.SUBMITTED,
        submittedBy: worker3._id,
        checkInTime: '09:00',
        checkOutTime: '18:00',
        applicableDailyWage: 750,
        wageMultiplier: 1.0,
        calculatedEarnings: 750,
      },
    ];

    await Attendance.create(attendanceEntries);

    // 8. Furniture Tasks
    console.log('[Seed] Creating Furniture Tasks...');
    await FurnitureTask.create([
      {
        projectId: project1._id,
        thekedarId: thekedar._id,
        furnitureItemName: 'Modular Kitchen Base Carcass Assembly',
        taskType: FURNITURE_TASK_TYPES.ASSEMBLY,
        assignedWorkerId: worker1._id,
        status: TASK_STATUS.COMPLETED,
        plannedUnits: 12,
        completedUnits: 12,
        unitMetric: 'Units',
      },
      {
        projectId: project1._id,
        thekedarId: thekedar._id,
        furnitureItemName: 'High Gloss Acrylic 2mm Edge Banding',
        taskType: FURNITURE_TASK_TYPES.EDGE_BANDING,
        assignedWorkerId: worker2._id,
        status: TASK_STATUS.IN_PROGRESS,
        plannedUnits: 180,
        completedUnits: 110,
        unitMetric: 'Running Ft',
      },
      {
        projectId: project2._id,
        thekedarId: thekedar._id,
        furnitureItemName: 'Sliding Door Top-Hang Hafele Track Fitting',
        taskType: FURNITURE_TASK_TYPES.FITTING,
        assignedWorkerId: worker2._id,
        status: TASK_STATUS.PENDING,
        plannedUnits: 4,
        completedUnits: 0,
        unitMetric: 'Sets',
      },
      {
        projectId: project1._id,
        thekedarId: thekedar._id,
        furnitureItemName: 'Island Counter Natural Teak Veneer PU Polish',
        taskType: FURNITURE_TASK_TYPES.POLISHING,
        assignedWorkerId: worker3._id,
        status: TASK_STATUS.IN_PROGRESS,
        plannedUnits: 65,
        completedUnits: 30,
        unitMetric: 'Sq.Ft',
      },
    ]);

    // 9. Project Expenses (Materials, fittings, transport)
    console.log('[Seed] Creating Project Expenses...');
    await ProjectExpense.create([
      {
        expenseCode: 'EXP-2026-001',
        projectId: project1._id,
        thekedarId: thekedar._id,
        category: EXPENSE_CATEGORIES.MATERIALS,
        title: 'Century Ply Club Prime 18mm BWP Marine Plywood (14 Sheets)',
        amount: 44800,
        expenseDate: new Date('2026-09-05'),
        vendorName: 'Durga Timber & Plywood Depot',
        invoiceNumber: 'INV-DT-8821',
        paymentMethod: PAYMENT_METHODS.BANK_TRANSFER,
        recordedBy: thekedar._id,
      },
      {
        expenseCode: 'EXP-2026-002',
        projectId: project1._id,
        thekedarId: thekedar._id,
        category: EXPENSE_CATEGORIES.FITTINGS,
        title: 'Hettich Atira Soft-Close Tandem Drawer Boxes & Hinges',
        amount: 32600,
        expenseDate: new Date('2026-09-12'),
        vendorName: 'Apex Hardware & Kitchen Fittings',
        invoiceNumber: 'APX-7741',
        paymentMethod: PAYMENT_METHODS.UPI,
        recordedBy: thekedar._id,
      },
      {
        expenseCode: 'EXP-2026-003',
        projectId: project2._id,
        thekedarId: thekedar._id,
        category: EXPENSE_CATEGORIES.TRANSPORT,
        title: 'Tempo Transport for Pre-Cut Wardrobe Panels from Workshop to Site',
        amount: 2800,
        expenseDate: new Date('2026-09-20'),
        vendorName: 'Chaudhary Goods Carrier',
        paymentMethod: PAYMENT_METHODS.CASH,
        recordedBy: thekedar._id,
      },
    ]);

    // 10. Advance Requests & Disbursements
    console.log('[Seed] Creating Advance Requests & Disbursements...');
    const advReq = await AdvanceRequest.create({
      requestCode: 'ADV-REQ-2026-001',
      workerId: worker1._id,
      thekedarId: thekedar._id,
      projectId: project1._id,
      amount: 2000,
      reason: 'Urgent family medical expense and travel support',
      status: 'APPROVED',
      requestedAt: new Date('2026-09-28'),
      reviewedBy: thekedar._id,
      reviewedAt: new Date('2026-09-28T16:00:00Z'),
      reviewNotes: 'Approved advance as requested',
    });

    const disbTxn = await FinancialTransaction.create({
      transactionId: 'TXN-DISB-2026-001',
      category: FINANCIAL_CATEGORIES.ADVANCE_DISBURSEMENT,
      amount: 2000,
      transactionDate: new Date('2026-09-29'),
      paymentMethod: PAYMENT_METHODS.UPI,
      receiptReference: 'UPI-UTR-998822110044',
      workerId: worker1._id,
      thekedarId: thekedar._id,
      projectId: project1._id,
      advanceRequestId: advReq._id,
      recordedBy: thekedar._id,
      notes: 'Disbursed ₹2000 via UPI against approved request',
    });
    advReq.status = 'DISBURSED';
    advReq.disbursedTransactionId = disbTxn._id;
    await advReq.save();

    // 11. Finalized Payroll Record (September 2026) demonstrating immutability
    console.log('[Seed] Creating September 2026 Finalized Payroll...');
    const payrollSep = await Payroll.create({
      payrollCode: 'PAY-2026-09-0001',
      workerId: worker1._id,
      thekedarId: thekedar._id,
      periodMonth: 9,
      periodYear: 2026,
      startDate: '2026-09-01',
      endDate: '2026-10-01',
      status: PAYROLL_STATUS.FINALIZED,
      totalApprovedDays: 22,
      grossEarnings: 18700,
      totalAllowances: 500,
      totalDeductions: 200,
      advancesRecovered: 1500,
      netPayable: 17500,
      salaryPaymentsAllocated: 12700,
      balanceRemaining: 4800, // Matches worker1 outstanding salary balance
      ruleVersionApplied: 1,
      finalizedBy: thekedar._id,
      finalizedAt: new Date('2026-10-01T11:00:00Z'),
      isImmutable: true,
      notes: 'Finalized for Sep 2026 with partial payment of ₹12,700 and ₹1,500 advance recovery',
    });

    // Linked Salary Payment Financial Transaction
    await FinancialTransaction.create({
      transactionId: 'TXN-SAL-2026-001',
      category: FINANCIAL_CATEGORIES.SALARY_PAYMENT,
      amount: 12700,
      transactionDate: new Date('2026-10-02'),
      paymentMethod: PAYMENT_METHODS.BANK_TRANSFER,
      receiptReference: 'NEFT-SBIN20261002-8811',
      workerId: worker1._id,
      thekedarId: thekedar._id,
      payrollId: payrollSep._id,
      recordedBy: thekedar._id,
      notes: 'Bank transfer salary disbursement against PAY-2026-09-0001',
    });

    // 12. Worker Dispute
    console.log('[Seed] Creating Sample Worker Dispute...');
    await Dispute.create({
      disputeCode: 'DISP-2026-001',
      workerId: worker3._id,
      thekedarId: thekedar._id,
      category: 'ATTENDANCE',
      subject: 'Correction of Oct 2nd shift from Half-day to Full-day',
      description: 'Sir, I stayed till 6:30 PM completing the second coat of PU primer on the TV unit panel. Requesting review.',
      status: 'OPEN',
    });

    // 13. System Audit Log Entries
    console.log('[Seed] Generating initial system audit entries...');
    await AuditLog.create([
      {
        actorId: owner._id,
        actorName: owner.name,
        actorRole: owner.role,
        action: 'SYSTEM_BOOTSTRAP',
        targetType: 'System',
        targetId: 'INIT',
        reason: 'FurniCraft seed initialization complete',
      },
      {
        actorId: thekedar._id,
        actorName: thekedar.name,
        actorRole: thekedar.role,
        action: 'PAYROLL_FINALIZED',
        targetType: 'Payroll',
        targetId: payrollSep._id.toString(),
        newValues: { payrollCode: payrollSep.payrollCode, netPayable: 17500 },
      },
    ]);

    console.log('===========================================================');
    console.log(' SEEDING COMPLETE! Safe Demo Credentials:');
    console.log(' 1. OWNER / ADMIN:');
    console.log('    Email:    owner@furnicraft.com');
    console.log('    Password: FurniOwner@2026');
    console.log(' 2. THEKEDAR:');
    console.log('    Email:    thekedar.rajesh@furnicraft.com');
    console.log('    Password: Thekedar@2026');
    console.log(' 3. WORKER:');
    console.log('    Email:    worker.ramesh@furnicraft.com');
    console.log('    Password: Worker@2026');
    console.log('===========================================================');

    await disconnectDB();
    process.exit(0);
  } catch (error) {
    console.error('[Seed] Error seeding database:', error);
    process.exit(1);
  }
};

seedDatabase();
