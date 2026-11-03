import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import mongoose from 'mongoose';
import PDFDocument from 'pdfkit';
import XLSX from 'xlsx';
import { Attendance, Payroll, FinancialTransaction, User, WorkerProfile } from '../models/index.js';
import { ROLES } from '../config/constants.js';
import { NotFoundError, ForbiddenError } from '../utils/errors.js';
import { C, PAGE, CONTENT_W, BOTTOM_LIMIT, inr, createPdf, text, drawHeader, drawRunningHeader, drawInfoCards, drawTable, drawTotal, drawSignatures, drawFooters } from './pdfTheme.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const LOGO_PATH = path.resolve(__dirname, '../assets/furnicraft-logo.png');

const PDF_TRANSLATIONS = {
  en: {
    appName: 'FurniCraft ERP',
    tagline: 'MODERN FURNITURE WORKFORCE & PROJECT MANAGEMENT',
    workerAttendanceBanner: 'OFFICIAL WORKFORCE ATTENDANCE & SHIFT VERIFICATION STATEMENT',
    thekedarAttendanceBanner: 'OFFICIAL CONTRACTOR ATTENDANCE & SHIFT VERIFICATION STATEMENT',
    systemDoc: 'SYSTEM DOCUMENT',
    officialAttendanceReport: 'OFFICIAL ATTENDANCE REPORT',
    workerAttendanceRecord: 'WORKER / CRAFTSMAN ATTENDANCE RECORD:',
    thekedarDetails: 'THEKEDAR / CONTRACTOR DETAILS:',
    reportSpecs: 'REPORT SPECIFICATIONS:',
    generated: 'Generated',
    filter: 'Filter',
    loggedShifts: 'Logged Shifts',
    totalShiftsBox: 'TOTAL LOGGED SHIFTS',
    approvedShiftsBox: 'APPROVED SHIFTS',
    manDaysBox: 'TOTAL MAN-DAYS EQUIV.',
    grossWagesBox: 'GROSS EARNED WAGES',
    colHeaders: ['#', 'Date', 'Worker Name', 'Phone', 'Project', 'Shift', 'Mult.', 'Timings', 'Rate', 'Earned', 'Status'],
    continuedWorker: 'FurniCraft ERP — Attendance Statement (Continued) | Worker: ',
    continuedThekedar: 'FurniCraft ERP — Attendance Statement (Continued) | Contractor: ',
    noRecords: 'No attendance records found for this contractor / filter selection.',
    totalSummary: 'TOTAL SUMMARY',
    shiftsLogged: 'Shifts Logged',
    approved: 'Approved',
    manDays: 'Man-Days',
    totalGrossEarned: 'Total Gross Wages Earned',
    computerGenerated: 'FurniCraft ERP — Modern Furniture Workforce System • Computer-Generated Official Record',
    // Payslip
    payslipBanner: 'OFFICIAL SALARY STATEMENT & PAYSLIP',
    payslipSub: 'MODERN FURNITURE WORKFORCE & FINANCIAL SYSTEM',
    payslipCode: 'PAYSLIP STATEMENT CODE',
    thekedarCardHeader: 'THEKEDAR / CONTRACTOR DETAILS',
    workerCardHeader: 'WORKER & PERIOD SPECIFICATIONS',
    periodLabel: 'Period',
    approvedDaysLabel: 'Approved Days',
    particularsHeader: 'PARTICULARS / ITEM DESCRIPTION',
    categoryHeader: 'CATEGORY',
    amountHeader: 'AMOUNT (INR)',
    grossWagesItem: 'Gross Earned Wages',
    grossWagesDesc: 'Earned across approved working days',
    allowancesItem: 'Total Allowances / Incentives',
    allowancesDesc: 'Site bonus, overtime bonus or special allowance',
    deductionsItem: 'Standard Deductions',
    deductionsDesc: 'Authorized workplace or equipment deductions',
    advanceRecoveriesItem: 'Advance Recoveries Deducted',
    advanceRecoveriesDesc: 'Prior salary advances recovered during this payroll cycle',
    netSalaryBox: 'NET SALARY PAYABLE FOR PERIOD',
    netSalaryDesc: 'Official Finalized Net Wage Liability for this worker period',
    paymentStatusTag: 'PAYMENT ALLOCATION STATUS:',
    salaryPaidTillDate: 'Salary Paid Till Date',
    remainingBalanceDue: 'Remaining Balance Due',
    // Bill
    billBanner: 'OFFICIAL WAGE PAYMENT VOUCHER & SETTLEMENT BILL',
    billSub: 'MODERN FURNITURE WORKFORCE & PROJECT MANAGEMENT',
    billNoTag: 'BILL / VOUCHER NO.',
    payerBoxTag: 'THEKEDAR / CONTRACTOR (PAYER)',
    payeeBoxTag: 'CRAFTSMAN / WORKER (PAYEE)',
    paymentDateTime: 'PAYMENT DATE & TIME:',
    paymentMethod: 'PAYMENT METHOD:',
    receiptRef: 'RECEIPT / UTR REF:',
    particularsBillHeader: 'PARTICULARS / WAGE DESCRIPTION',
    typeBillHeader: 'TYPE / CALCULATION',
    baseEarnedItem: 'Base Approved Earned Wages',
    advanceDeductionItem: 'Advance Recovery Deduction ("Cut")',
    foodDeductionItem: 'Food / Mess Charges Deduction',
    toolLossItem: 'Authorized Equipment / Dispute Deduction',
    netDisbursedItem: 'NET AMOUNT DISBURSED (ACTUAL RECEIVED)',
    workerRemainingAdvanceItem: 'Worker Remaining Advance Balance',
  },
  hinglish: {
    appName: 'FurniCraft ERP',
    tagline: 'MODERN FURNITURE WORKFORCE AUR PROJECT MANAGEMENT',
    workerAttendanceBanner: 'OFFICIAL WORKFORCE HAZIRI AUR SHIFT VIVARAN STATEMENT',
    thekedarAttendanceBanner: 'OFFICIAL THEKEDAR HAZIRI AUR SHIFT VIVARAN STATEMENT',
    systemDoc: 'SYSTEM DOCUMENT',
    officialAttendanceReport: 'OFFICIAL HAZIRI REPORT',
    workerAttendanceRecord: 'KARIGAR / WORKER HAZIRI RECORD:',
    thekedarDetails: 'THEKEDAR / SUPERVISOR DETAILS:',
    reportSpecs: 'REPORT VIVARAN:',
    generated: 'Banaya Gaya',
    filter: 'Filter',
    loggedShifts: 'Logged Shifts',
    totalShiftsBox: 'KUL LOGGED SHIFTS',
    approvedShiftsBox: 'APPROVED SHIFTS',
    manDaysBox: 'KUL DEHADI MULTIPLIER',
    grossWagesBox: 'TOTAL GROSS KAMAI',
    colHeaders: ['#', 'Tarikh', 'Karigar Naam', 'Mobile No.', 'Project', 'Shift', 'Mult.', 'Samay', 'Dehadi', 'Kamai', 'Status'],
    continuedWorker: 'FurniCraft ERP — Haziri Statement (Jari) | Karigar: ',
    continuedThekedar: 'FurniCraft ERP — Haziri Statement (Jari) | Thekedar: ',
    noRecords: 'Is filter ke liye koi haziri record nahi mila.',
    totalSummary: 'KUL HISAB (SUMMARY)',
    shiftsLogged: 'Shifts Logged',
    approved: 'Approved',
    manDays: 'Dehadi',
    totalGrossEarned: 'Kul Gross Kamai',
    computerGenerated: 'FurniCraft ERP — Furniture Workforce System • Computer dwara generate verified record',
    // Payslip
    payslipBanner: 'OFFICIAL SALARY STATEMENT AUR PAYSLIP',
    payslipSub: 'FURNITURE WORKFORCE AUR FINANCIAL SYSTEM',
    payslipCode: 'PAYSLIP STATEMENT CODE',
    thekedarCardHeader: 'THEKEDAR / SUPERVISOR DETAILS',
    workerCardHeader: 'KARIGAR AUR MAHEENA VIVARAN',
    periodLabel: 'Maheena Period',
    approvedDaysLabel: 'Approved Din',
    particularsHeader: 'MAD / VIVARAN (PARTICULARS)',
    categoryHeader: 'CATEGORY',
    amountHeader: 'RASHI (INR)',
    grossWagesItem: 'Gross Kamai (Approved Haziri)',
    grossWagesDesc: 'Approved working dino se kamayi gayi rashi',
    allowancesItem: 'Site Bonus / Anya Allowance',
    allowancesDesc: 'Overtime bonus, site allowance ya inaam',
    deductionsItem: 'Standard Deductions (Katai)',
    deductionsDesc: 'Authorized equipment ya karyasthal katai',
    advanceRecoveriesItem: 'Advance Katai (Pichla Advance Vasool)',
    advanceRecoveriesDesc: 'Pehle liya gaya salary advance is cycle me kata gaya',
    netSalaryBox: 'NET SALARY PAYABLE (RASHI)',
    netSalaryDesc: 'Karigar ki is period ki finalized net payable dehadi rashi',
    paymentStatusTag: 'PAYMENT VIVARAN STATUS:',
    salaryPaidTillDate: 'Ab tak Di Gayi Salary',
    remainingBalanceDue: 'Baki Bachi Due Rashi',
    // Bill
    billBanner: 'OFFICIAL WAGE PAYMENT VOUCHER AUR SETTLEMENT BILL',
    billSub: 'FURNITURE WORKFORCE AUR SETTLEMENT HISAB',
    billNoTag: 'BILL / VOUCHER NO.',
    payerBoxTag: 'THEKEDAR / PAYER DETAILS',
    payeeBoxTag: 'KARIGAR / PAYEE DETAILS',
    paymentDateTime: 'BHUGTAN TARIKH / SAMAY:',
    paymentMethod: 'PAYMENT METHOD (CASH/UPI):',
    receiptRef: 'RECEIPT / UTR NUMBER:',
    particularsBillHeader: 'WAGE AUR ADVANCE HISAB VIVARAN',
    typeBillHeader: 'CATEGORY / HISAB',
    baseEarnedItem: 'Approved Haziri se Gross Kamai',
    advanceDeductionItem: 'Advance Recovery Katai ("Advance Cut")',
    foodDeductionItem: 'Khana / Kharcha Deduction',
    toolLossItem: 'Auzar Nuksan / Anya Katai',
    netDisbursedItem: 'NET BHUGTAN RASHI (HAATH ME DI GAYI)',
    workerRemainingAdvanceItem: 'Karigar ka Baki Advance Balance',
  },
  hi: {
    appName: 'FurniCraft ERP',
    tagline: 'AADHUNIK FURNITURE WORKFORCE EVAM PROJECT PRABANDHAN',
    workerAttendanceBanner: 'OFFICIAL KARIGAR HAZIRI EVAM SHIFT PRAPATRA',
    thekedarAttendanceBanner: 'OFFICIAL THEKEDAR HAZIRI EVAM SHIFT PRAPATRA',
    systemDoc: 'SYSTEM DASTAVEZ',
    officialAttendanceReport: 'OFFICIAL HAZIRI REPORT',
    workerAttendanceRecord: 'KARIGAR HAZIRI ABHILEKH:',
    thekedarDetails: 'THEKEDAR EVAM SUPERVISOR VIVARAN:',
    reportSpecs: 'REPORT VIVARAN:',
    generated: 'Nirmit Tithi',
    filter: 'Filter',
    loggedShifts: 'Logged Haziri',
    totalShiftsBox: 'KUL DARJ SHIFTS',
    approvedShiftsBox: 'SWIKRIT SHIFTS',
    manDaysBox: 'KUL DEHADI MULTIPLIER',
    grossWagesBox: 'KUL SAKAL KAMAI',
    colHeaders: ['#', 'Tithi', 'Karigar Naam', 'Mobile No.', 'Project', 'Shift', 'Gunak', 'Samay', 'Dehadi', 'Kamai', 'Sthiti'],
    continuedWorker: 'FurniCraft ERP — Haziri Prapatra (Agla Prishth) | Karigar: ',
    continuedThekedar: 'FurniCraft ERP — Haziri Prapatra (Agla Prishth) | Thekedar: ',
    noRecords: 'Is filter ke liye koi haziri abhilekh uplabdh nahi hai.',
    totalSummary: 'KUL VIVARAN (SUMMARY)',
    shiftsLogged: 'Darj Shifts',
    approved: 'Swikrit',
    manDays: 'Dehadi Gunak',
    totalGrossEarned: 'Kul Sakal Kamai',
    computerGenerated: 'FurniCraft ERP — Furniture Workforce • Computer dwara satyapit official abhilekh',
    // Payslip
    payslipBanner: 'OFFICIAL VETAN VIVARAN EVAM PAYSLIP',
    payslipSub: 'FURNITURE WORKFORCE EVAM VITTIYA PRANALI',
    payslipCode: 'PAYSLIP KRAMANK CODE',
    thekedarCardHeader: 'THEKEDAR VIVARAN',
    workerCardHeader: 'KARIGAR EVAM AVADHI VIVARAN',
    periodLabel: 'Vetan Avadhi',
    approvedDaysLabel: 'Swikrit Din',
    particularsHeader: 'MAD EVAM MAD VIVARAN',
    categoryHeader: 'SHRENI',
    amountHeader: 'DHANRASHI (INR)',
    grossWagesItem: 'Kul Sakal Kamai (Gross Wages)',
    grossWagesDesc: 'Swikrit karyadivaso ki sakal dehadi kamai',
    allowancesItem: 'Bhatta evam Protsahan Rashi',
    allowancesDesc: 'Site bonus, overtime bhatta ya vishesh protsahan',
    deductionsItem: 'Manak Katai (Deductions)',
    deductionsDesc: 'Pradhikrit karyasthal ya upkaran katai',
    advanceRecoveriesItem: 'Agrim Dhanrashi Katai (Advance Recoveries)',
    advanceRecoveriesDesc: 'Is avadhi me samayojit agrim vetan rashi',
    netSalaryBox: 'DEYA SHUDDH VETAN RASHI (NET PAYABLE)',
    netSalaryDesc: 'Karigar ki antim roop se nirdharit shuddh deya rashi',
    paymentStatusTag: 'BHUGTAN ABHILEKH STHITI:',
    salaryPaidTillDate: 'Ab Tak Di Gayi Rashi',
    remainingBalanceDue: 'Shesh Baki Rashi',
    // Bill
    billBanner: 'OFFICIAL DEHADI BHUGTAN PRAMAN-PATRA EVAM BILL',
    billSub: 'FURNITURE WORKFORCE EVAM LEKHA PRABANDHAN',
    billNoTag: 'BILL / PRAMAN-PATRA KRAMANK',
    payerBoxTag: 'BHUGTAN-KARTA THEKEDAR VIVARAN',
    payeeBoxTag: 'PRAPT-KARTA KARIGAR VIVARAN',
    paymentDateTime: 'BHUGTAN TITHI EVAM SAMAY:',
    paymentMethod: 'BHUGTAN PRAKRIYA (CASH/UPI):',
    receiptRef: 'SANDARBH / UTR KRAMANK:',
    particularsBillHeader: 'DEHADI EVAM AGRIM HISAB VIVARAN',
    typeBillHeader: 'SHRENI / HISAB',
    baseEarnedItem: 'Swikrit Haziri se Sakal Kamai',
    advanceDeductionItem: 'Agrim Dhanrashi Samayojan (Advance Cut)',
    foodDeductionItem: 'Bhojan Vyay Katai (Food Expense)',
    toolLossItem: 'Upkaran Nuksan / Anya Katai',
    netDisbursedItem: 'SHUDDH PRADAN KI GAYI RASHI (NET PAID)',
    workerRemainingAdvanceItem: 'Karigar ki Shesh Agrim Dhanrashi (Remaining Advance)',
  },
};

// Labels for the redesigned PDFs (Hindi kept in Latin script, like the rest of PDF_TRANSLATIONS).
const PDF_LABELS = {
  en: {
    attendanceTitle: 'Attendance Statement', allTime: 'All attendance', worker: 'Worker', dailyWage: 'Daily wage', thekedar: 'Thekedar',
    daysWorked: 'Days worked', manDays: 'Man-days', earned: 'Earned', unpaid: 'Unpaid', paid: 'Paid', date: 'Date', project: 'Project',
    shift: 'Shift', rate: 'Rate', status: 'Status', noAttendance: 'No attendance recorded for this period.', totalEarned: 'Total earned',
    legend: 'Shift codes: P = full day (1x) · HALF = half day (0.5x) · P1/5 = till 9 PM (1.5x) · PP = till midnight (2x) · ABSENT = no wage',
    wageReceipt: 'Wage Payment Receipt', advanceReceipt: 'Advance Receipt', paymentReceipt: 'Payment Receipt', paidBy: 'Paid by', paidTo: 'Paid to',
    payment: 'Payment', description: 'Description', amount: 'Amount', wagesEarned: 'Wages earned (attendance)', bonus: 'Bonus / allowance',
    advanceCut: 'Advance recovered', food: 'Food / mess', room: 'Room rent', advanceGiven: 'Advance given', netPaid: 'Net paid',
    advanceAfter: 'Advance balance after this payment', advanceNow: 'Advance balance now', notes: 'Notes', authorised: 'Authorised by (Thekedar)',
    received: 'Received by (worker signature / thumb)', statementOf: 'Attendance statement', deductNext: 'Deducted from the next wage payment',
  },
  hinglish: {
    attendanceTitle: 'Haziri Statement', allTime: 'Saari haziri', worker: 'Karigar', dailyWage: 'Dehadi', thekedar: 'Thekedar',
    daysWorked: 'Kaam ke din', manDays: 'Man-days', earned: 'Kamai', unpaid: 'Baaki', paid: 'Paid', date: 'Tareekh', project: 'Project',
    shift: 'Shift', rate: 'Rate', status: 'Status', noAttendance: 'Is mahine koi haziri nahi.', totalEarned: 'Kul kamai',
    legend: 'Shift code: P = pura din (1x) · HALF = aadha din (0.5x) · P1/5 = raat 9 baje tak (1.5x) · PP = raat 12 baje tak (2x) · ABSENT = koi dehadi nahi',
    wageReceipt: 'Dehadi Bhugtan Receipt', advanceReceipt: 'Advance Receipt', paymentReceipt: 'Bhugtan Receipt', paidBy: 'Dene wale', paidTo: 'Lene wale',
    payment: 'Bhugtan', description: 'Vivaran', amount: 'Rakam', wagesEarned: 'Kamai (haziri se)', bonus: 'Bonus / bhatta',
    advanceCut: 'Advance kata', food: 'Khana / mess', room: 'Kamra kiraya', advanceGiven: 'Advance diya', netPaid: 'Kul diya',
    advanceAfter: 'Is bhugtan ke baad advance', advanceNow: 'Abhi ka advance', notes: 'Notes', authorised: 'Thekedar ke hastakshar',
    received: 'Karigar ke hastakshar / angutha', statementOf: 'Haziri statement', deductNext: 'Agli dehadi se kata jayega',
  },
  hi: {
    attendanceTitle: 'Haziri Vivaran', allTime: 'Sampurn haziri', worker: 'Karigar', dailyWage: 'Dainik mazdoori', thekedar: 'Thekedar',
    daysWorked: 'Kaarya divas', manDays: 'Man-days', earned: 'Arjit', unpaid: 'Shesh', paid: 'Bhugtan', date: 'Dinank', project: 'Pariyojana',
    shift: 'Shift', rate: 'Dar', status: 'Sthiti', noAttendance: 'Is avadhi mein koi haziri nahin.', totalEarned: 'Kul arjit',
    legend: 'Shift code: P = poora din (1x) · HALF = aadha din (0.5x) · P1/5 = raat 9 baje tak (1.5x) · PP = madhyaraatri tak (2x) · ABSENT = mazdoori nahin',
    wageReceipt: 'Mazdoori Bhugtan Raseed', advanceReceipt: 'Agrim Raseed', paymentReceipt: 'Bhugtan Raseed', paidBy: 'Bhugtankarta', paidTo: 'Prapatkarta',
    payment: 'Bhugtan', description: 'Vivaran', amount: 'Raashi', wagesEarned: 'Arjit mazdoori', bonus: 'Bonus / bhatta',
    advanceCut: 'Agrim vasooli', food: 'Bhojan / mess', room: 'Kamra kiraya', advanceGiven: 'Agrim diya', netPaid: 'Shuddh bhugtan',
    advanceAfter: 'Bhugtan ke baad agrim shesh', advanceNow: 'Vartaman agrim shesh', notes: 'Tippani', authorised: 'Thekedar hastakshar',
    received: 'Karigar hastakshar / angutha', statementOf: 'Haziri vivaran', deductNext: 'Agli mazdoori se vasool hoga',
  },
};

const formatDay = (ymd) => {
  const d = new Date(`${ymd}T00:00:00`);
  return Number.isNaN(d.getTime()) ? ymd : d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
};

const periodLabel = (period, L) => {
  if (period?.year && period?.month) {
    return new Date(Number(period.year), Number(period.month) - 1, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  }
  if (period?.startDate && period?.endDate) return `${formatDay(period.startDate)} – ${formatDay(period.endDate)}`;
  return L.allTime;
};

/**
 * Attendance statement PDF (one worker, or all of a Thekedar's workers), usually for one month.
 * @param {object} filterQuery Mongo filter for Attendance (already role-scoped by the controller)
 * @param {{ reqUser, lang, period: { year, month } | { startDate, endDate } }} options
 */
export const generateAttendancePDF = async (filterQuery = {}, { reqUser, lang = 'en', period } = {}) => {
  const L = PDF_LABELS[lang] || PDF_LABELS.en;
  const records = await Attendance.find(filterQuery)
    .populate('workerId', 'name phone')
    .populate('projectId', 'name projectCode')
    .sort({ date: 1, createdAt: 1 })
    .lean();

  const thekedar =
    reqUser?.role === ROLES.THEKEDAR
      ? reqUser
      : (filterQuery.thekedarId && (await User.findById(filterQuery.thekedarId).lean())) || null;
  const worker = filterQuery.workerId ? await User.findById(filterQuery.workerId).lean() : null;
  const profile = filterQuery.workerId ? await WorkerProfile.findOne({ userId: filterQuery.workerId }).lean() : null;

  const worked = records.filter((r) => r.code !== 'ABSENT');
  const manDays = records.reduce((s, r) => s + Number(r.wageMultiplier || 0), 0);
  const earned = records.reduce((s, r) => s + Number(r.calculatedEarnings || 0), 0);
  const unpaid = records.filter((r) => !r.isPayrollProcessed).reduce((s, r) => s + Number(r.calculatedEarnings || 0), 0);
  const period_ = periodLabel(period, L);

  const { doc, done } = createPdf();
  let y = drawHeader(doc, {
    title: L.attendanceTitle,
    subtitle: period_,
    docNo: profile?.workerCode || (thekedar ? thekedar.name : ''),
  });

  y = drawInfoCards(doc, y, worker
    ? [
        { label: L.worker, value: worker.name, sub: [profile?.workerCode, profile?.skills?.[0], worker.phone].filter(Boolean).join(' · ') },
        { label: L.dailyWage, value: inr(profile?.defaultDailyWage), sub: period_ },
        { label: L.thekedar, value: thekedar?.name || '—', sub: thekedar?.phone || '' },
      ]
    : [
        { label: L.thekedar, value: thekedar?.name || 'All Thekedars', sub: thekedar?.phone || '' },
        { label: L.statementOf, value: period_, sub: `${records.length} entries` },
      ]);

  y = drawInfoCards(doc, y, [
    { label: L.daysWorked, value: String(worked.length) },
    { label: L.manDays, value: `${manDays.toFixed(1)}` },
    { label: L.earned, value: inr(earned), fill: C.brandSoft, labelColor: C.brand },
    { label: L.unpaid, value: inr(unpaid), fill: unpaid > 0 ? C.badSoft : C.goodSoft, labelColor: unpaid > 0 ? C.bad : C.good },
  ], { height: 46 });

  const paidColor = (row) => (row[row.length - 1] === L.paid ? C.good : C.bad);
  const columns = worker
    ? [
        { header: '#', width: 26, align: 'center' },
        { header: L.date, width: 92 },
        { header: L.project, width: 180 },
        { header: L.shift, width: 52, align: 'center', bold: true },
        { header: L.rate, width: 58, align: 'right' },
        { header: L.earned, width: 62, align: 'right', bold: true },
        { header: L.status, width: CONTENT_W - 470, align: 'center', color: paidColor },
      ]
    : [
        { header: '#', width: 24, align: 'center' },
        { header: L.date, width: 82 },
        { header: L.worker, width: 110 },
        { header: L.project, width: 140 },
        { header: L.shift, width: 46, align: 'center', bold: true },
        { header: L.earned, width: 62, align: 'right', bold: true },
        { header: L.status, width: CONTENT_W - 464, align: 'center', color: paidColor },
      ];
  const rows = records.map((r, i) => {
    const project = r.projectId ? `${r.projectId.name}` : '—';
    const status = r.isPayrollProcessed ? L.paid : L.unpaid;
    return worker
      ? [String(i + 1), formatDay(r.date), project, r.code, inr(r.applicableDailyWage), inr(r.calculatedEarnings), status]
      : [String(i + 1), formatDay(r.date), r.workerId?.name || '—', project, r.code, inr(r.calculatedEarnings), status];
  });

  const running = `${L.attendanceTitle} · ${worker ? worker.name : thekedar?.name || ''} · ${period_}`;
  if (rows.length === 0) {
    doc.roundedRect(PAGE.margin, y, CONTENT_W, 60, 8).fill(C.soft);
    text(doc, L.noAttendance, PAGE.margin, y + 24, { size: 10, color: C.muted, width: CONTENT_W, align: 'center' });
    y += 76;
  } else {
    y = drawTable(doc, y, { columns, rows, onNewPage: () => drawRunningHeader(doc, running) });
    y += 12;
    if (y + 60 > BOTTOM_LIMIT) {
      doc.addPage();
      y = drawRunningHeader(doc, running);
    }
    y = drawTotal(doc, y, { label: `${L.totalEarned} · ${period_}`, value: inr(earned), note: `${L.daysWorked}: ${worked.length} · ${L.manDays}: ${manDays.toFixed(1)}`, fill: C.brandSoft, color: C.brand });
  }
  if (y + 20 > BOTTOM_LIMIT) {
    doc.addPage();
    y = drawRunningHeader(doc, running);
  }
  text(doc, L.legend, PAGE.margin, y, { size: 7, color: C.muted, width: CONTENT_W, lineBreak: true });

  drawFooters(doc, `FurniCraft · ${running}`);
  doc.end();
  return done;
};

/**
 * Generate Legacy Attendance Excel (maintained as fallback)
 */
export const generateAttendanceExcel = async (filterQuery) => {
  const records = await Attendance.find(filterQuery)
    .populate('workerId', 'name email phone')
    .populate('projectId', 'name projectCode')
    .sort({ date: 1 });

  const dataRows = records.map((r) => ({
    Organization: 'FurniCraft ERP',
    Date: r.date,
    Worker: r.workerId?.name || 'N/A',
    Project: r.projectId?.name || 'N/A',
    ProjectCode: r.projectId?.projectCode || 'N/A',
    Code: r.code,
    Shift: r.shift,
    Status: r.approvalStatus,
    WageRate: r.applicableDailyWage,
    Multiplier: r.wageMultiplier,
    EarnedINR: r.calculatedEarnings,
    CheckIn: r.checkInTime || '-',
    CheckOut: r.checkOutTime || '-',
  }));

  const worksheet = XLSX.utils.json_to_sheet(dataRows);
  const workbook = XLSX.utils.book_new();
  workbook.Props = {
    Title: 'FurniCraft ERP - Official Attendance Record',
    Subject: 'FurniCraft ERP Workforce Attendance',
    Author: 'FurniCraft ERP',
    Company: 'FurniCraft ERP - Modern Furniture Workforce & Project Management',
  };
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Attendance');
  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
};

export const generateSalaryStatementPDF = async (payrollId, { reqUser, lang = 'en' } = {}) => {
  const trans = PDF_TRANSLATIONS[lang] || PDF_TRANSLATIONS['en'];
  const payroll = await Payroll.findById(payrollId)
    .populate('workerId', 'name email phone')
    .populate('thekedarId', 'name phone email');

  if (!payroll) throw new Error('Payroll not found');

  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        layout: 'portrait',
        margin: 36,
        bufferPages: true,
      });
      const buffers = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));

      const lightBorder = '#CBD5E1';

      // 1. Top Header Banner with Logo & Full Application Name
      doc.rect(36, 36, 523, 60).fill('#0F172A');
      if (fs.existsSync(LOGO_PATH)) {
        doc.image(LOGO_PATH, 44, 41, { height: 50, fit: [62, 50] });
      }
      doc.fillColor('#FFFFFF').fontSize(16).text('FurniCraft ERP', 112, 43, { bold: true });
      doc.fillColor('#F59E0B').fontSize(8.5).text(trans.payslipBanner, 112, 62, { bold: true });
      doc.fillColor('#94A3B8').fontSize(7.5).text(trans.payslipSub, 112, 75);

      // Payslip Code Box (Top Right)
      doc.rect(385, 45, 164, 42).fill('#1E293B');
      doc.fillColor('#94A3B8').fontSize(7).text(trans.payslipCode, 395, 51);
      doc.fillColor('#38BDF8').fontSize(9.5).text(payroll.payrollCode, 395, 63, { bold: true });

      // 2. Contractor & Worker Two-Column Card
      const cardY = 104;
      const cardH = 80;
      const colW = 256;

      // Left Box: Contractor Details
      doc.rect(36, cardY, colW, cardH).fill('#F8FAFC');
      doc.rect(36, cardY, colW, cardH).stroke(lightBorder);
      doc.rect(36, cardY, colW, 18).fill('#E2E8F0');
      doc.fillColor('#334155').fontSize(7.5).text(trans.thekedarCardHeader, 44, cardY + 5, { bold: true });
      doc.fillColor('#0F172A').fontSize(11).text(payroll.thekedarId?.name || 'Contractor', 44, cardY + 25, { bold: true });
      doc.fillColor('#475569').fontSize(8).text(`Phone: ${payroll.thekedarId?.phone || 'N/A'}`, 44, cardY + 42);
      doc.fillColor('#475569').fontSize(7.5).text(`Email: ${payroll.thekedarId?.email || 'N/A'}`, 44, cardY + 56);

      // Right Box: Worker & Statement Details
      doc.rect(303, cardY, colW, cardH).fill('#F8FAFC');
      doc.rect(303, cardY, colW, cardH).stroke(lightBorder);
      doc.rect(303, cardY, colW, 18).fill('#E2E8F0');
      doc.fillColor('#334155').fontSize(7.5).text(trans.workerCardHeader, 311, cardY + 5, { bold: true });
      doc.fillColor('#0F172A').fontSize(11).text(payroll.workerId?.name || 'Worker', 311, cardY + 25, { bold: true });
      doc.fillColor('#475569').fontSize(8).text(`${trans.periodLabel}: Month ${payroll.periodMonth} / ${payroll.periodYear} (${payroll.startDate} to ${payroll.endDate})`, 311, cardY + 42);
      doc.fillColor('#475569').fontSize(7.5).text(`Status: ${payroll.status}  |  ${trans.approvedDaysLabel}: ${payroll.totalApprovedDays}`, 311, cardY + 56);

      // 3. Earnings & Deductions Breakdown Table
      const tableY = 194;
      doc.rect(36, tableY, 523, 20).fill('#1E293B');
      doc.fillColor('#FFFFFF').fontSize(8).text('#', 44, tableY + 6, { bold: true });
      doc.fillColor('#FFFFFF').fontSize(8).text(trans.particularsHeader, 70, tableY + 6, { bold: true });
      doc.fillColor('#FFFFFF').fontSize(8).text(trans.categoryHeader, 340, tableY + 6, { bold: true });
      doc.fillColor('#FFFFFF').fontSize(8).text(trans.amountHeader, 470, tableY + 6, { bold: true, align: 'right', width: 80 });

      const breakdownItems = [
        { num: '1', name: trans.grossWagesItem, desc: `${trans.grossWagesDesc} (${payroll.totalApprovedDays} days)`, cat: 'Earnings (+)', amt: `₹${(payroll.grossEarnings || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, color: '#0F172A' },
        { num: '2', name: trans.allowancesItem, desc: trans.allowancesDesc, cat: 'Allowance (+)', amt: `+ ₹${(payroll.totalAllowances || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, color: '#0D9488' },
        { num: '3', name: trans.deductionsItem, desc: trans.deductionsDesc, cat: 'Deduction (-)', amt: `- ₹${(payroll.totalDeductions || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, color: '#DC2626' },
        { num: '4', name: trans.advanceRecoveriesItem, desc: trans.advanceRecoveriesDesc, cat: 'Advance Recovery (-)', amt: `- ₹${(payroll.advancesRecovered || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, color: '#EA580C' },
      ];

      let rowY = tableY + 20;
      breakdownItems.forEach((item, idx) => {
        const bg = idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC';
        doc.rect(36, rowY, 523, 28).fill(bg);
        doc.rect(36, rowY, 523, 28).stroke(lightBorder);

        doc.fillColor('#64748B').fontSize(7.5).text(item.num, 44, rowY + 9);
        doc.fillColor('#0F172A').fontSize(8).text(item.name, 70, rowY + 4, { bold: true });
        doc.fillColor('#64748B').fontSize(6.5).text(item.desc, 70, rowY + 14);
        doc.fillColor('#475569').fontSize(7).text(item.cat, 340, rowY + 9);
        doc.fillColor(item.color).fontSize(8.5).text(item.amt, 470, rowY + 8, { bold: true, align: 'right', width: 80 });

        rowY += 28;
      });

      // 4. Net Salary Payable Highlight Box
      const netY = rowY + 10;
      doc.rect(36, netY, 523, 46).fill('#EFF6FF');
      doc.rect(36, netY, 523, 46).stroke('#3B82F6');
      doc.fillColor('#1E40AF').fontSize(8).text(trans.netSalaryBox, 48, netY + 9, { bold: true });
      doc.fillColor('#1D4ED8').fontSize(7).text(trans.netSalaryDesc, 48, netY + 23);
      doc.fillColor('#1E40AF').fontSize(17).text(
        `₹${(payroll.netPayable || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
        350,
        netY + 12,
        { bold: true, align: 'right', width: 200 }
      );

      // 5. Payment Status & Balances
      const balY = netY + 54;
      doc.rect(36, balY, 523, 36).fill('#F8FAFC');
      doc.rect(36, balY, 523, 36).stroke(lightBorder);
      doc.fillColor('#334155').fontSize(7.5).text(trans.paymentStatusTag, 48, balY + 6, { bold: true });
      doc.fillColor('#0F172A').fontSize(8.5).text(
        `${trans.salaryPaidTillDate}: ₹${(payroll.salaryPaymentsAllocated || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}   |   ${trans.remainingBalanceDue}: ₹${(payroll.balanceRemaining || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
        48,
        balY + 18,
        { bold: true }
      );

      // Notes
      let nextY = balY + 44;
      if (payroll.notes) {
        doc.rect(36, nextY, 523, 28).fill('#F8FAFC');
        doc.rect(36, nextY, 523, 28).stroke(lightBorder);
        doc.fillColor('#64748B').fontSize(7).text('PAYROLL REMARKS / AUDIT NOTES:', 44, nextY + 5);
        doc.fillColor('#1E293B').fontSize(8).text(payroll.notes, 44, nextY + 14);
        nextY += 36;
      }

      // Legal & Footer
      doc.fillColor('#64748B').fontSize(7.5).text(
        `Finalized on: ${payroll.finalizedAt ? new Date(payroll.finalizedAt).toLocaleString('en-IN') : 'Draft Status'}   •   Rule Version Applied: v${payroll.ruleVersionApplied || 1}`,
        36,
        nextY + 8,
        { align: 'center', width: 523 }
      );
      doc.fillColor('#94A3B8').fontSize(7).text(
        `This is a computer-generated immutable payroll record issued by FurniCraft ERP — Modern Furniture Workforce System.`,
        36,
        nextY + 22,
        { align: 'center', width: 523, italic: true }
      );

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};

/**
 * Payment / advance receipt PDF for one FinancialTransaction (wage payment, advance given, or other).
 */
export const generatePaymentBillPDF = async (transactionIdOrCode, { reqUser, lang = 'en' } = {}) => {
  const L = PDF_LABELS[lang] || PDF_LABELS.en;
  const populate = (q) => q.populate('workerId', 'name phone').populate('thekedarId', 'name phone').lean();
  let txn = null;
  if (mongoose.Types.ObjectId.isValid(transactionIdOrCode)) {
    txn = await populate(FinancialTransaction.findById(transactionIdOrCode));
  }
  if (!txn) txn = await populate(FinancialTransaction.findOne({ transactionId: transactionIdOrCode }));
  if (!txn) throw new NotFoundError('Payment transaction not found');

  if (reqUser) {
    if (reqUser.role === ROLES.WORKER && txn.workerId?._id.toString() !== reqUser._id.toString()) {
      throw new ForbiddenError('You can only view your own payment bills');
    }
    if (reqUser.role === ROLES.THEKEDAR && txn.thekedarId?._id.toString() !== reqUser._id.toString()) {
      throw new ForbiddenError('You can only view bills for workers under your management');
    }
  }

  const profile = txn.workerId ? await WorkerProfile.findOne({ userId: txn.workerId._id }).lean() : null;
  const thekedar = txn.thekedarId || {};
  const worker = txn.workerId || {};
  const isWage = txn.category === 'SALARY_PAYMENT';
  const isAdvance = txn.category === 'ADVANCE_DISBURSEMENT';
  const title = isWage ? L.wageReceipt : isAdvance ? L.advanceReceipt : L.paymentReceipt;
  const when = new Date(txn.transactionDate);

  const { doc, done } = createPdf();
  let y = drawHeader(doc, {
    title,
    subtitle: when.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }),
    docNo: txn.transactionId,
  });

  y = drawInfoCards(doc, y, [
    { label: L.paidBy, value: thekedar.name || '—', sub: thekedar.phone ? `${L.thekedar} · ${thekedar.phone}` : L.thekedar },
    { label: L.paidTo, value: worker.name || '—', sub: [profile?.workerCode, worker.phone].filter(Boolean).join(' · ') },
    {
      label: L.payment,
      value: (txn.paymentMethod || 'CASH').replace('_', ' '),
      sub: `${when.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}${txn.receiptReference ? ` · Ref ${txn.receiptReference}` : ''}`,
    },
  ], { height: 58 });

  // Only the lines that actually apply, so a receipt never shows rows of ₹0.
  const bd = txn.breakdown || {};
  const lines = isWage
    ? [
        [L.wagesEarned, inr(bd.baseEarned ?? txn.amount), 'plus'],
        ...(bd.additionalWages > 0 ? [[L.bonus, `+ ${inr(bd.additionalWages)}`, 'plus']] : []),
        ...(bd.advanceDeduction > 0 ? [[L.advanceCut, `− ${inr(bd.advanceDeduction)}`, 'minus']] : []),
        ...(bd.foodDeduction > 0 ? [[L.food, `− ${inr(bd.foodDeduction)}`, 'minus']] : []),
        ...(bd.roomRentDeduction > 0 ? [[L.room, `− ${inr(bd.roomRentDeduction)}`, 'minus']] : []),
      ]
    : [[isAdvance ? L.advanceGiven : txn.category.replace(/_/g, ' '), inr(txn.amount), 'plus']];

  if (!isAdvance) y = drawTable(doc, y, {
    columns: [
      { header: L.description, width: CONTENT_W - 140 },
      { header: L.amount, width: 140, align: 'right', bold: true, color: (row, meta) => (meta.kind === 'minus' ? C.bad : C.ink) },
    ],
    rows: lines.map(([d, a]) => [d, a]),
    rowMeta: lines.map(([, , kind]) => ({ kind })),
    rowHeight: 26,
  });
  y += 14;

  y = drawTotal(doc, y, isAdvance
    ? { label: L.advanceGiven, value: inr(txn.amount), note: L.deductNext, fill: C.badSoft, color: C.bad }
    : { label: L.netPaid, value: inr(txn.amount), fill: C.goodSoft, color: C.good });

  const advanceBalance = isWage ? bd.remainingAdvance : profile?.outstandingAdvanceBalance;
  if (advanceBalance !== undefined) {
    doc.roundedRect(PAGE.margin, y, CONTENT_W, 30, 6).fill(C.soft);
    text(doc, isWage ? L.advanceAfter : L.advanceNow, PAGE.margin + 12, y + 10, { size: 8.5, color: C.body });
    text(doc, inr(advanceBalance), PAGE.margin + CONTENT_W - 152, y + 9, { size: 10, font: 'Bold', color: advanceBalance > 0 ? C.bad : C.good, width: 140, align: 'right' });
    y += 42;
  }

  if (txn.notes) {
    text(doc, L.notes.toUpperCase(), PAGE.margin, y, { size: 7, font: 'Bold', color: C.muted });
    text(doc, txn.notes, PAGE.margin, y + 12, { size: 8.5, color: C.body, width: CONTENT_W, lineBreak: true });
    y = doc.y + 16;
  }

  drawSignatures(doc, Math.max(y, 600), { label: L.authorised, name: thekedar.name || '' }, { label: L.received, name: worker.name || '' });
  drawFooters(doc, `FurniCraft · ${title} ${txn.transactionId}`);
  doc.end();
  return done;
};
