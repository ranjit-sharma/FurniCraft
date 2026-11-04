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

export const sendRegistrationOtpSchema = z.object({
  phone: z.string().min(10, 'Valid 10-digit mobile number required').max(16),
});

export const forgotPasswordOtpRequestSchema = z.object({
  email: z.string().email('Valid registered email address is required'),
});

export const verifyResetOtpSchema = z.object({
  email: z.string().email('Valid registered email address is required'),
  otp: z.string().regex(/^\d{6}$/, 'OTP must be exactly 6 digits'),
});

export const resetPasswordWithOtpSchema = z.object({
  email: z.string().email('Valid registered email address is required'),
  resetToken: z.string().min(16, 'Valid reset token is required'),
  newPassword: z.string().min(6, 'New password must be at least 6 characters'),
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

// Attendance Schemas
export const submitAttendanceSchema = z.object({
  workerId: z.string().optional(), // If worker submits for themselves, inferred from token
  projectId: z.string().optional().nullable(),
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
  amount: z.number().min(1, 'Amount must be greater than 0').max(25000, 'Worker cannot take more than ₹25,000 advance'),
  reason: z.string().min(3, 'Reason is required'),
});

export const giveAdvanceSchema = z.object({
  workerId: z.string().optional(), // from the URL
  amount: z.number().min(1, 'Amount must be greater than 0').max(25000, 'Worker cannot take more than ₹25,000 advance'),
  reason: z.string().trim().min(3, 'Please enter a reason (at least 3 letters)'),
  paymentMethod: z.enum(Object.values(PAYMENT_METHODS)).optional(),
  receiptReference: z.string().optional(),
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

