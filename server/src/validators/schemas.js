import { z } from 'zod';
import {
  ROLES,
  USER_STATUS,
  ATTENDANCE_CODES,
  FURNITURE_TYPES,
  PROJECT_STATUS,
  PROJECT_PRIORITY,
  FINANCIAL_CATEGORIES,
  PAYMENT_METHODS,
  TOOL_CATEGORIES,
  TOOL_CONDITION,
  FURNITURE_TASK_TYPES,
  EXPENSE_CATEGORIES,
} from '../config/constants.js';

// Auth Schemas
export const loginSchema = z.object({
  email: z.string().optional(),
  identifier: z.string().optional(),
  phone: z.string().optional(),
  password: z.string().min(1, 'Password is required'),
}).refine((data) => data.email || data.identifier || data.phone, {
  message: 'Email address or registered mobile number is required',
  path: ['email'],
});

export const thekedarRegisterSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(10, 'Valid 10-digit mobile number required').max(16),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  otp: z.string().optional(),
});

export const forgotPasswordOtpRequestSchema = z.object({
  email: z.string().email('Valid registered email address is required').optional(),
  phone: z.string().min(10).optional(),
}).refine((data) => data.email || data.phone, {
  message: 'Valid registered email address is required',
  path: ['email'],
});

export const verifyResetOtpSchema = z.object({
  email: z.string().email('Valid registered email address is required').optional(),
  phone: z.string().min(10).optional(),
  otp: z.string().regex(/^\d{6}$/, 'OTP must be exactly 6 digits'),
}).refine((data) => data.email || data.phone, {
  message: 'Valid registered email address is required',
  path: ['email'],
});

export const resetPasswordWithOtpSchema = z.object({
  email: z.string().email('Valid registered email address is required').optional(),
  phone: z.string().min(10).optional(),
  resetToken: z.string().min(16, 'Valid reset token is required'),
  newPassword: z.string().min(6, 'New password must be at least 6 characters'),
}).refine((data) => data.email || data.phone, {
  message: 'Valid registered email address is required',
  path: ['email'],
});

export const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(10, 'Valid phone number required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum([ROLES.OWNER, ROLES.THEKEDAR, ROLES.WORKER]),
  assignedThekedar: z.string().optional().nullable(),
  defaultDailyWage: z.number().min(0).optional(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(6, 'New password must be at least 6 characters'),
});

export const resetPasswordRequestSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export const resetPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
  tempPassword: z.string().min(1, 'Temporary password is required'),
  newPassword: z.string().min(6, 'New password must be at least 6 characters'),
});

// Project Schemas
export const createProjectSchema = z.object({
  projectCode: z.string().min(2).optional(),
  name: z.string().min(3, 'Project name is required'),
  clientName: z.string().min(2, 'Client name is required'),
  clientPhone: z.string().optional(),
  siteAddress: z.string().min(3, 'Site address is required'),
  projectType: z.enum(Object.values(FURNITURE_TYPES)),
  priority: z.enum(Object.values(PROJECT_PRIORITY)).optional(),
  thekedarId: z.string().optional(), // Inferred if called by Thekedar
  startDate: z.string().optional(),
  targetCompletionDate: z.string().optional(),
  estimatedBudget: z.number().min(0).optional(),
  notes: z.string().optional(),
});

export const updateProjectSchema = createProjectSchema.partial().extend({
  status: z.enum(Object.values(PROJECT_STATUS)).optional(),
});

export const recordProjectMoneyReceivedSchema = z.object({
  projectId: z.string().optional(),
  amount: z.number().min(0.01, 'Received amount must be greater than zero'),
  receivedDate: z.string().optional(),
  paymentMethod: z.enum(Object.values(PAYMENT_METHODS)).optional(),
  receiptReference: z.string().optional(),
  payerName: z.string().optional(),
  stage: z.string().optional(),
  notes: z.string().optional(),
});

// Project Assignment Schema
export const createAssignmentSchema = z.object({
  workerId: z.string().min(1, 'Worker ID is required'),
  projectId: z.string().min(1, 'Project ID is required'),
  wageOverride: z.number().min(0).optional().nullable(),
  roleInProject: z.string().optional(),
  scheduleNotes: z.string().optional(),
  startDate: z.string().optional(),
});

export const shiftAssignmentSchema = z.object({
  toProjectId: z.string().min(1, 'Destination project ID is required'),
  roleInProject: z.string().optional(),
  wageOverride: z.number().min(0).optional().nullable(),
  notes: z.string().optional(),
});

// Attendance Schemas
export const submitAttendanceSchema = z.object({
  workerId: z.string().optional(), // If worker submits for themselves, inferred from token
  projectId: z.string().min(1, 'Project ID is required'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  shift: z.string().default('GENERAL'),
  code: z.enum(Object.values(ATTENDANCE_CODES)),
  checkInTime: z.string().optional(),
  checkOutTime: z.string().optional(),
  extraWorkCategory: z.string().optional(),
});

export const approveAttendanceSchema = z.object({
  attendanceId: z.string().optional(),
  code: z.enum(Object.values(ATTENDANCE_CODES)).optional(),
  approvedCode: z.enum(Object.values(ATTENDANCE_CODES)).optional(),
  dailyWage: z.number().min(0).optional(),
});

export const rectifyAttendanceSchema = z.object({
  attendanceId: z.string().optional(),
  code: z.enum(Object.values(ATTENDANCE_CODES)).optional(),
  dailyWage: z.number().min(0).optional(),
  reason: z.string().optional(),
});

export const rejectAttendanceSchema = z.object({
  attendanceId: z.string().optional(),
  reason: z.string().min(2, 'Rejection reason is required'),
});

export const requestCorrectionSchema = z.object({
  attendanceId: z.string().optional(),
  requestedCode: z.enum(Object.values(ATTENDANCE_CODES)),
  reason: z.string().min(3, 'Reason for correction is required'),
});

export const reviewCorrectionSchema = z.object({
  attendanceId: z.string().optional(),
  status: z.enum(['APPROVED', 'REJECTED']),
  reviewNotes: z.string().optional(),
});

export const bulkApproveAttendanceSchema = z.object({
  attendanceIds: z.array(z.string()).min(1, 'At least one attendance ID required'),
});

// Advance Request Schemas
export const createAdvanceRequestSchema = z.object({
  workerId: z.string().optional(), // Inferred for worker
  projectId: z.string().optional().nullable(),
  amount: z.number().min(1, 'Amount must be greater than 0').max(10000, 'Worker cannot take more than ₹10,000 advance'),
  reason: z.string().min(3, 'Reason is required'),
});

export const reviewAdvanceRequestSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED']),
  reviewNotes: z.string().optional(),
});

// Finance Schemas
export const recordTransactionSchema = z.object({
  category: z.enum(Object.values(FINANCIAL_CATEGORIES)),
  amount: z.number().min(0.01, 'Amount must be positive'),
  transactionDate: z.string().optional(),
  paymentMethod: z.enum(Object.values(PAYMENT_METHODS)),
  receiptReference: z.string().optional(),
  workerId: z.string().optional().nullable(),
  thekedarId: z.string().optional(),
  projectId: z.string().optional().nullable(),
  advanceRequestId: z.string().optional().nullable(),
  payrollId: z.string().optional().nullable(),
  notes: z.string().optional(),
});

export const reverseTransactionSchema = z.object({
  reason: z.string().min(3, 'Reversal reason is required'),
});

export const payWorkerNetSchema = z.object({
  baseEarned: z.number().min(0).optional(),
  advanceDeduction: z.number().min(0).optional(),
  foodDeduction: z.number().min(0).optional(),
  roomRentDeduction: z.number().min(0).optional(),
  additionalWages: z.number().min(0).optional(),
  paymentMethod: z.enum(Object.values(PAYMENT_METHODS)).optional(),
  receiptReference: z.string().optional(),
  notes: z.string().optional(),
});

// Payroll Schemas
export const finalizePayrollSchema = z.object({
  workerId: z.string().min(1, 'Worker ID is required'),
  periodMonth: z.number().min(1).max(12),
  periodYear: z.number().min(2020),
  allowances: z.number().min(0).default(0),
  deductions: z.number().min(0).default(0),
  advanceRecoveryAmount: z.number().min(0).default(0),
  notes: z.string().optional(),
});

export const addPayrollAdjustmentSchema = z.object({
  payrollId: z.string().min(1, 'Payroll ID is required'),
  type: z.enum(['CREDIT', 'DEBIT']),
  amount: z.number().min(0.01),
  reason: z.string().min(3, 'Adjustment reason is required'),
});

// Tool Schemas
export const createToolSchema = z.object({
  toolCode: z.string().optional(),
  name: z.string().min(2, 'Tool name is required'),
  category: z.string().min(1, 'Category is required'),
  thekedarId: z.string().optional(),
  description: z.string().optional(),
  brand: z.string().optional(),
  modelNumber: z.string().optional(),
  serialNumber: z.string().optional(),
  quantity: z.number().min(1).optional(),
  initialCondition: z.string().optional(),
  condition: z.string().optional(),
  registrationDate: z.string().optional(),
  purchaseDate: z.string().optional(),
  purchaseCost: z.number().min(0).optional(),
  notes: z.string().optional(),
});

export const updateToolSchema = z.object({
  name: z.string().min(2).optional(),
  category: z.string().optional(),
  description: z.string().optional(),
  brand: z.string().optional(),
  modelNumber: z.string().optional(),
  serialNumber: z.string().optional(),
  condition: z.string().optional(),
  isActive: z.boolean().optional(),
  notes: z.string().optional(),
});

export const issueToolSchema = z.object({
  toolId: z.string().min(1, 'Tool ID is required'),
  projectId: z.string().min(1, 'Project ID is required'),
  workerId: z.string().min(1, 'Worker ID is required'),
  issueDate: z.string().optional(),
  expectedReturnDate: z.string().optional(),
  quantity: z.number().min(1).optional(),
  conditionAtIssue: z.string().optional(),
  notes: z.string().optional(),
});

export const returnToolSchema = z.object({
  toolId: z.string().optional(),
  returnDate: z.string().optional(),
  quantity: z.number().min(1).optional(),
  conditionAtReturn: z.string().optional(),
  damageNotes: z.string().optional(),
  notes: z.string().optional(),
});

export const transferToolSchema = z.object({
  toolId: z.string().optional(),
  toolIssueId: z.string().optional(),
  toProjectId: z.string().min(1, 'Destination project required'),
  toWorkerId: z.string().optional(),
  transferDate: z.string().optional(),
  reason: z.string().min(2, 'Transfer reason required'),
  notes: z.string().optional(),
});

export const reportToolDamageSchema = z.object({
  toolId: z.string().optional(),
  damageType: z.string().optional(),
  description: z.string().min(2, 'Damage description required').optional(),
  damageNotes: z.string().optional(),
  damageDate: z.string().optional(),
  workerId: z.string().optional(),
  projectId: z.string().optional(),
  isMissing: z.boolean().optional(),
});

export const reportMissingToolSchema = z.object({
  reason: z.string().min(3, 'Reason / circumstances for missing tool is mandatory'),
  missingDate: z.string().optional(),
  conditionLastSeen: z.string().optional(),
  workerId: z.string().optional(),
  projectId: z.string().optional(),
});

export const resolveMissingToolSchema = z.object({
  resolutionStatus: z.enum(['FOUND', 'CLOSED']),
  verifiedCondition: z.string().optional(),
  notes: z.string().optional(),
});

export const resolveDamageToolSchema = z.object({
  resolutionStatus: z.enum(['USABLE_AGAIN', 'RETIRED']),
  notes: z.string().optional(),
});

// Furniture Task Schemas
export const createFurnitureTaskSchema = z.object({
  projectId: z.string().min(1),
  furnitureItemName: z.string().min(2),
  taskType: z.enum(Object.values(FURNITURE_TASK_TYPES)),
  assignedWorkerId: z.string().optional().nullable(),
  plannedUnits: z.number().min(1).default(1),
  unitMetric: z.string().optional(),
  startDate: z.string().optional(),
  targetDate: z.string().optional(),
  notes: z.string().optional(),
});

export const updateFurnitureTaskSchema = z.object({
  completedUnits: z.number().min(0).optional(),
  status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'VERIFIED', 'REWORK_NEEDED']).optional(),
  defectNotes: z.string().optional(),
});

// Project Expense Schema
export const createExpenseSchema = z.object({
  projectId: z.string().min(1),
  category: z.enum(Object.values(EXPENSE_CATEGORIES)),
  title: z.string().min(2),
  amount: z.number().min(0.01),
  expenseDate: z.string().optional(),
  vendorName: z.string().optional(),
  invoiceNumber: z.string().optional(),
  paymentMethod: z.enum(Object.values(PAYMENT_METHODS)).optional(),
  notes: z.string().optional(),
});

// Dispute Schema
export const createDisputeSchema = z.object({
  category: z.enum(['ATTENDANCE', 'PAYROLL', 'ADVANCE', 'TOOL', 'WAGE', 'OTHER']),
  subject: z.string().min(3),
  description: z.string().min(5),
  thekedarId: z.string().optional(),
});

export const resolveDisputeSchema = z.object({
  status: z.enum(['RESOLVED', 'REJECTED', 'UNDER_REVIEW']),
  resolutionNotes: z.string().min(3),
});
