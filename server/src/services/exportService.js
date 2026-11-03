import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import mongoose from 'mongoose';
import PDFDocument from 'pdfkit';
import XLSX from 'xlsx';
import { Attendance, Payroll, FinancialTransaction, ToolIssue, User, WorkerProfile } from '../models/index.js';
import { ROLES } from '../config/constants.js';
import { NotFoundError, ForbiddenError } from '../utils/errors.js';

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

/**
 * Generate Professional PDF Attendance Report with Contractor Details & Metrics
 */
export const generateAttendancePDF = async (filterQuery = {}, { reqUser, lang = 'en' } = {}) => {
  const trans = PDF_TRANSLATIONS[lang] || PDF_TRANSLATIONS['en'];
  const records = await Attendance.find(filterQuery)
    .populate('workerId', 'name email phone')
    .populate('thekedarId', 'name email phone')
    .populate('projectId', 'name projectCode')
    .sort({ date: 1, createdAt: 1 });

  // Resolve contractor details
  let thekedarName = 'All Contractors / Central Master View';
  let thekedarPhone = '-';
  let thekedarEmail = '-';

  if (reqUser && reqUser.role === ROLES.THEKEDAR) {
    thekedarName = reqUser.name || 'Contractor';
    thekedarPhone = reqUser.phone || '-';
    thekedarEmail = reqUser.email || '-';
  } else if (filterQuery.thekedarId) {
    const thekedar = await User.findById(filterQuery.thekedarId);
    if (thekedar) {
      thekedarName = thekedar.name || 'Contractor';
      thekedarPhone = thekedar.phone || '-';
      thekedarEmail = thekedar.email || '-';
    }
  } else if (records.length > 0 && records[0].thekedarId) {
    const t = records[0].thekedarId;
    thekedarName = t.name || 'Contractor';
    thekedarPhone = t.phone || '-';
    thekedarEmail = t.email || '-';
  }

  // Resolve individual worker details if filtered by workerId
  let targetWorker = null;
  let targetWorkerProfile = null;
  if (filterQuery.workerId) {
    targetWorker = await User.findById(filterQuery.workerId);
    targetWorkerProfile = await WorkerProfile.findOne({ userId: filterQuery.workerId });
  }

  // Summary Metrics
  const totalRecords = records.length;
  let totalMultiplier = 0;
  let totalGrossEarned = 0;
  let approvedCount = 0;
  let overtimeCount = 0;

  records.forEach((r) => {
    totalMultiplier += Number(r.wageMultiplier || 0);
    totalGrossEarned += Number(r.calculatedEarnings || 0);
    if (r.approvalStatus === 'APPROVED') approvedCount++;
    if (r.code === 'P1/5' || r.code === 'PP') overtimeCount++;
  });

  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        layout: 'landscape',
        margin: 36,
        bufferPages: true,
      });

      const buffers = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));

      const colWidths = [25, 65, 110, 75, 125, 50, 35, 75, 65, 75, 70];
      const colHeaders = trans.colHeaders;
      const colAligns = ['center', 'left', 'left', 'left', 'left', 'center', 'center', 'center', 'right', 'right', 'center'];

      const drawHeader = (isFirstPage) => {
        if (isFirstPage) {
          // Top Title Banner with Logo & Full Name
          doc.rect(36, 36, 770, 52).fill('#0F172A');
          if (fs.existsSync(LOGO_PATH)) {
            doc.image(LOGO_PATH, 44, 40, { height: 44, fit: [58, 44] });
          }
          doc.fillColor('#FFFFFF').fontSize(15).text('FurniCraft ERP', 108, 42, { bold: true });
          doc.fillColor('#F59E0B').fontSize(7.5).text(trans.tagline, 108, 58, { bold: true });
          const bannerSub = targetWorker
            ? 'OFFICIAL INDIVIDUAL CRAFTSMAN ATTENDANCE & SHIFT VERIFICATION STATEMENT'
            : (reqUser && reqUser.role === ROLES.WORKER
              ? trans.workerAttendanceBanner
              : trans.thekedarAttendanceBanner);
          doc.fillColor('#94A3B8').fontSize(7.5).text(bannerSub, 108, 69);

          // System document tag on right
          doc.rect(605, 42, 192, 40).fill('#1E293B');
          doc.fillColor('#94A3B8').fontSize(7).text(trans.systemDoc, 615, 48);
          doc.fillColor('#38BDF8').fontSize(9).text(trans.officialAttendanceReport, 615, 60, { bold: true });

          // Contractor & Report Info Card
          doc.rect(36, 94, 770, 44).fill('#F8FAFC');
          doc.rect(36, 94, 770, 44).stroke('#E2E8F0');

          if (targetWorker) {
            // Individual Craftsman Info (Left)
            const roleStr = targetWorkerProfile?.skills?.[0] || 'Mistry';
            const wageStr = targetWorkerProfile?.defaultDailyWage ? `₹${targetWorkerProfile.defaultDailyWage}/day` : 'Standard Wage';
            doc.fillColor('#64748B').fontSize(7.5).text('INDIVIDUAL CRAFTSMAN ATTENDANCE RECORD:', 48, 100);
            doc.fillColor('#0F172A').fontSize(10).text(`${targetWorker.name} (${targetWorkerProfile?.workerCode || 'FC-WRK'})`, 48, 111, { bold: true });
            doc.fillColor('#475569').fontSize(7.5).text(`Role: ${roleStr}  |  Wage: ${wageStr}  |  Phone: ${targetWorker.phone || '-'}  |  Contractor: ${thekedarName}`, 48, 124);
          } else if (reqUser && reqUser.role === ROLES.WORKER) {
            // Worker Info (Left)
            doc.fillColor('#64748B').fontSize(7.5).text(trans.workerAttendanceRecord, 48, 100);
            doc.fillColor('#0F172A').fontSize(10).text(reqUser.name || 'Worker', 48, 111, { bold: true });
            doc.fillColor('#475569').fontSize(7.5).text(`Phone: ${reqUser.phone || '-'}  |  Supervisor: ${thekedarName}`, 48, 124);
          } else {
            // Contractor Info (Left)
            doc.fillColor('#64748B').fontSize(7.5).text(trans.thekedarDetails, 48, 100);
            doc.fillColor('#0F172A').fontSize(10).text(thekedarName, 48, 111, { bold: true });
            doc.fillColor('#475569').fontSize(7.5).text(`Phone: ${thekedarPhone}  |  Email: ${thekedarEmail}`, 48, 124);
          }

          // Report Metadata (Right)
          doc.fillColor('#64748B').fontSize(7.5).text(trans.reportSpecs, 540, 100);
          doc.fillColor('#0F172A').fontSize(8).text(`${trans.generated}: ${new Date().toLocaleString('en-IN')}`, 540, 111);
          const filterDesc = targetWorker
            ? `Craftsman ID: ${targetWorkerProfile?.workerCode || 'FC-WRK'}  |  Total Shifts: ${totalRecords}`
            : `${trans.filter}: ${filterQuery.approvalStatus || 'All Records'}  |  ${trans.loggedShifts}: ${totalRecords}`;
          doc.fillColor('#475569').fontSize(7.5).text(filterDesc, 540, 124);

          // KPI Metric Badges (4 boxes)
          const kpiY = 144;
          const kpiW = 188;
          const kpiGap = 6;

          // Box 1: Total Records
          doc.rect(36, kpiY, kpiW, 36).fill('#F1F5F9');
          doc.fillColor('#475569').fontSize(7).text(trans.totalShiftsBox, 44, kpiY + 6);
          doc.fillColor('#0F172A').fontSize(12).text(String(totalRecords), 44, kpiY + 16, { bold: true });

          // Box 2: Approved Shifts
          doc.rect(36 + kpiW + kpiGap, kpiY, kpiW, 36).fill('#ECFDF5');
          doc.fillColor('#047857').fontSize(7).text(trans.approvedShiftsBox, 36 + kpiW + kpiGap + 8, kpiY + 6);
          doc.fillColor('#065F46').fontSize(12).text(`${approvedCount} / ${totalRecords}`, 36 + kpiW + kpiGap + 8, kpiY + 16, { bold: true });

          // Box 3: Man-Days
          doc.rect(36 + (kpiW + kpiGap) * 2, kpiY, kpiW, 36).fill('#EFF6FF');
          doc.fillColor('#1D4ED8').fontSize(7).text(trans.manDaysBox, 36 + (kpiW + kpiGap) * 2 + 8, kpiY + 6);
          doc.fillColor('#1E40AF').fontSize(12).text(`${totalMultiplier.toFixed(1)}x`, 36 + (kpiW + kpiGap) * 2 + 8, kpiY + 16, { bold: true });

          // Box 4: Total Wages
          doc.rect(36 + (kpiW + kpiGap) * 3, kpiY, kpiW, 36).fill('#FEF3C7');
          doc.fillColor('#B45309').fontSize(7).text(trans.grossWagesBox, 36 + (kpiW + kpiGap) * 3 + 8, kpiY + 6);
          doc.fillColor('#78350F').fontSize(12).text(`₹${totalGrossEarned.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 36 + (kpiW + kpiGap) * 3 + 8, kpiY + 16, { bold: true });

          return 186;
        } else {
          // Running header on continuation pages
          doc.rect(36, 36, 770, 24).fill('#0F172A');
          if (fs.existsSync(LOGO_PATH)) {
            doc.image(LOGO_PATH, 42, 38, { height: 20, fit: [28, 20] });
          }
          const contText = targetWorker
            ? `FurniCraft ERP — Attendance Statement (Continued) | Craftsman: ${targetWorker.name} (${targetWorkerProfile?.workerCode || 'FC-WRK'})`
            : (reqUser && reqUser.role === ROLES.WORKER
              ? `${trans.continuedWorker}${reqUser.name || 'Worker'}`
              : `${trans.continuedThekedar}${thekedarName}`);
          doc.fillColor('#FFFFFF').fontSize(8.5).text(contText, 76, 44);
          return 66;
        }
      };

      const drawTableHeader = (startY) => {
        doc.rect(36, startY, 770, 20).fill('#1E293B');
        let currentX = 36;
        for (let i = 0; i < colHeaders.length; i++) {
          doc.fillColor('#FFFFFF').fontSize(7.5).text(colHeaders[i], currentX + 3, startY + 6, {
            width: colWidths[i] - 6,
            align: colAligns[i],
            bold: true,
          });
          currentX += colWidths[i];
        }
        return startY + 20;
      };

      let currentY = drawHeader(true);
      currentY = drawTableHeader(currentY);

      const rowHeight = 18;

      if (records.length === 0) {
        doc.fillColor('#64748B').fontSize(10).text(trans.noRecords, 36, currentY + 30, {
          align: 'center',
          width: 770,
        });
      } else {
        records.forEach((r, idx) => {
          if (currentY + rowHeight > 540) {
            doc.addPage();
            currentY = drawHeader(false);
            currentY = drawTableHeader(currentY);
          }

          const rowBg = idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC';
          doc.rect(36, currentY, 770, rowHeight).fill(rowBg);
          doc.rect(36, currentY + rowHeight - 0.5, 770, 0.5).fill('#E2E8F0');

          const workerName = r.workerId?.name || 'N/A';
          const workerPhone = r.workerId?.phone || '-';
          const projectName = r.projectId ? `${r.projectId.projectCode || ''} ${r.projectId.name || ''}`.trim() : 'General / Workshop';
          const timingStr = `${r.checkInTime || '-'} - ${r.checkOutTime || '-'}`;
          const wageStr = `₹${r.applicableDailyWage || 0}`;
          const earnedStr = `₹${Number(r.calculatedEarnings || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
          const status = r.approvalStatus || 'SUBMITTED';

          let statusColor = '#B45309';
          if (status === 'APPROVED') statusColor = '#15803D';
          else if (status === 'REJECTED') statusColor = '#B91C1C';
          else if (status === 'CORRECTION_REQUESTED') statusColor = '#4338CA';

          const rowData = [
            String(idx + 1),
            r.date || '-',
            workerName,
            workerPhone,
            projectName,
            r.code || 'P',
            `${r.wageMultiplier || 1}x`,
            timingStr,
            wageStr,
            earnedStr,
            status,
          ];

          let cellX = 36;
          for (let c = 0; c < rowData.length; c++) {
            const isStatusCol = c === rowData.length - 1;
            doc.fillColor(isStatusCol ? statusColor : '#1E293B').fontSize(7).text(rowData[c], cellX + 3, currentY + 5, {
              width: colWidths[c] - 6,
              align: colAligns[c],
              ellipsis: true,
            });
            cellX += colWidths[c];
          }

          currentY += rowHeight;
        });

        if (currentY + 22 > 540) {
          doc.addPage();
          currentY = drawHeader(false);
          currentY = drawTableHeader(currentY);
        }

        doc.rect(36, currentY, 770, 22).fill('#F1F5F9');
        doc.rect(36, currentY, 770, 22).stroke('#CBD5E1');
        doc.fillColor('#0F172A').fontSize(8).text(
          `${trans.totalSummary}:   ${totalRecords} ${trans.shiftsLogged}   |   ${approvedCount} ${trans.approved}   |   ${totalMultiplier.toFixed(1)} ${trans.manDays}   |   ${trans.totalGrossEarned}: ₹${totalGrossEarned.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          48,
          currentY + 7,
          { bold: true }
        );
      }

      // Add page numbering & confidentiality notices across all pages
      const pageRange = doc.bufferedPageRange();
      for (let p = 0; p < pageRange.count; p++) {
        doc.switchToPage(p);
        doc.fillColor('#94A3B8').fontSize(7.5).text(
          `Page ${p + 1} of ${pageRange.count}   •   ${trans.computerGenerated}   •   Contractor: ${thekedarName}`,
          36,
          562,
          { align: 'center', width: 770 }
        );
      }

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
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
 * Generate Official PDF Payment Receipt & Wage Settlement Bill
 */
export const generatePaymentBillPDF = async (transactionIdOrCode, { reqUser, lang = 'en' } = {}) => {
  const trans = PDF_TRANSLATIONS[lang] || PDF_TRANSLATIONS['en'];
  let txn = null;
  if (mongoose.Types.ObjectId.isValid(transactionIdOrCode)) {
    txn = await FinancialTransaction.findById(transactionIdOrCode)
      .populate('workerId', 'name email phone')
      .populate('thekedarId', 'name email phone')
      .populate('recordedBy', 'name email role');
  }
  if (!txn) {
    txn = await FinancialTransaction.findOne({ transactionId: transactionIdOrCode })
      .populate('workerId', 'name email phone')
      .populate('thekedarId', 'name email phone')
      .populate('recordedBy', 'name email role');
  }

  if (!txn) throw new NotFoundError('Payment transaction not found');

  // Authorization check
  if (reqUser) {
    if (reqUser.role === ROLES.WORKER && txn.workerId?._id.toString() !== reqUser._id.toString()) {
      throw new ForbiddenError('You can only view your own payment bills');
    }
    if (reqUser.role === ROLES.THEKEDAR && txn.thekedarId?._id.toString() !== reqUser._id.toString()) {
      throw new ForbiddenError('You can only view bills for workers under your management');
    }
  }

  // Fetch worker profile
  const workerProfile = txn.workerId
    ? await WorkerProfile.findOne({ userId: txn.workerId._id })
    : null;

  const thekedar = txn.thekedarId || {};
  const worker = txn.workerId || {};

  const bd = txn.breakdown || {
    baseEarned: txn.amount,
    advanceDeduction: 0,
    additionalWages: 0,
    netPaid: txn.amount,
    remainingAdvance: workerProfile?.outstandingAdvanceBalance || 0,
  };

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

      // Colors
      const primaryDark = '#0F172A';
      const slateGray = '#475569';
      const lightBorder = '#CBD5E1';

      // 1. Top Header Banner with Logo & Full Name
      doc.rect(36, 36, 523, 60).fill(primaryDark);
      if (fs.existsSync(LOGO_PATH)) {
        doc.image(LOGO_PATH, 44, 41, { height: 50, fit: [62, 50] });
      }
      doc.fillColor('#FFFFFF').fontSize(16).text('FurniCraft ERP', 112, 43, { bold: true });
      doc.fillColor('#F59E0B').fontSize(8.5).text(trans.billBanner, 112, 62, { bold: true });
      doc.fillColor('#94A3B8').fontSize(7.5).text(trans.billSub, 112, 75);

      // Voucher Tag (Top Right)
      doc.rect(385, 45, 164, 42).fill('#1E293B');
      doc.fillColor('#94A3B8').fontSize(7).text(trans.billNoTag, 395, 51);
      doc.fillColor('#38BDF8').fontSize(9.5).text(txn.transactionId, 395, 63, { bold: true });

      // 2. Contractor & Worker Two-Column Card
      const cardY = 100;
      const cardH = 92;
      const colW = 256;

      // Left Box: Contractor Details
      doc.rect(36, cardY, colW, cardH).fill('#F8FAFC');
      doc.rect(36, cardY, colW, cardH).stroke(lightBorder);
      doc.rect(36, cardY, colW, 18).fill('#E2E8F0');
      doc.fillColor('#334155').fontSize(7.5).text(trans.payerBoxTag, 44, cardY + 5, { bold: true });
      doc.fillColor('#0F172A').fontSize(11).text(thekedar.name || 'Authorized Contractor', 44, cardY + 25, { bold: true });
      doc.fillColor(slateGray).fontSize(8).text(`Phone: ${thekedar.phone || 'N/A'}`, 44, cardY + 42);
      doc.fillColor(slateGray).fontSize(8).text(`Email: ${thekedar.email || 'N/A'}`, 44, cardY + 54);
      doc.fillColor(slateGray).fontSize(7.5).text('Role: Prime Furniture Contractor / Thekedar', 44, cardY + 68);

      // Right Box: Worker Details
      doc.rect(303, cardY, colW, cardH).fill('#F8FAFC');
      doc.rect(303, cardY, colW, cardH).stroke(lightBorder);
      doc.rect(303, cardY, colW, 18).fill('#E2E8F0');
      doc.fillColor('#334155').fontSize(7.5).text(trans.payeeBoxTag, 311, cardY + 5, { bold: true });
      doc.fillColor('#0F172A').fontSize(11).text(worker.name || 'Worker', 311, cardY + 25, { bold: true });
      doc.fillColor(slateGray).fontSize(8).text(`Worker Code: ${workerProfile?.workerCode || 'N/A'}`, 311, cardY + 42);
      doc.fillColor(slateGray).fontSize(8).text(`Phone: ${worker.phone || 'N/A'}`, 311, cardY + 54);
      doc.fillColor(slateGray).fontSize(7.5).text(`Trade Skill: ${workerProfile?.skillCategory || 'General Furniture Craftsman'}`, 311, cardY + 68);

      // 3. Payment Metadata Bar
      const metaY = 200;
      doc.rect(36, metaY, 523, 30).fill('#F1F5F9');
      doc.rect(36, metaY, 523, 30).stroke(lightBorder);
      doc.fillColor('#64748B').fontSize(7.5).text(trans.paymentDateTime, 44, metaY + 6);
      doc.fillColor('#0F172A').fontSize(8.5).text(new Date(txn.transactionDate).toLocaleString('en-IN'), 44, metaY + 16, { bold: true });

      doc.fillColor('#64748B').fontSize(7.5).text(trans.paymentMethod, 210, metaY + 6);
      doc.fillColor('#0F172A').fontSize(8.5).text(txn.paymentMethod || 'CASH', 210, metaY + 16, { bold: true });

      doc.fillColor('#64748B').fontSize(7.5).text(trans.receiptRef, 360, metaY + 6);
      doc.fillColor('#0F172A').fontSize(8.5).text(txn.receiptReference || 'Direct Cash Handover', 360, metaY + 16, { bold: true });

      // 4. Itemized Wage & Advance Breakdown Table
      const tableY = 238;
      doc.rect(36, tableY, 523, 20).fill('#1E293B');
      doc.fillColor('#FFFFFF').fontSize(8).text('#', 44, tableY + 6, { bold: true });
      doc.fillColor('#FFFFFF').fontSize(8).text(trans.particularsBillHeader, 70, tableY + 6, { bold: true });
      doc.fillColor('#FFFFFF').fontSize(8).text(trans.typeBillHeader, 340, tableY + 6, { bold: true });
      doc.fillColor('#FFFFFF').fontSize(8).text(trans.amountHeader, 470, tableY + 6, { bold: true, align: 'right', width: 80 });

      const items = [
        {
          num: '1',
          name: trans.baseEarnedItem,
          desc: 'Wages accumulated from approved shift attendance & tasks',
          type: 'Earned Wage Credit (+)',
          amt: `₹${(bd.baseEarned || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
          color: '#0F172A',
        },
        {
          num: '2',
          name: trans.advanceDeductionItem,
          desc: 'Pre-existing cash / UPI advance deducted against earned wages',
          type: 'Advance Deduction (-)',
          amt: `- ₹${(bd.advanceDeduction || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
          color: '#DC2626',
        },
        {
          num: '3',
          name: trans.foodDeductionItem,
          desc: 'Contractor food & daily mess expense recovery',
          type: 'Food Deduction (-)',
          amt: `- ₹${(bd.foodDeduction || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
          color: '#EA580C',
        },
        {
          num: '4',
          name: 'Room Rent Deduction (Optional)',
          desc: 'Site room / worker accommodation stay rental charge',
          type: 'Rent Deduction (-)',
          amt: `- ₹${(bd.roomRentDeduction || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
          color: '#9333EA',
        },
        {
          num: '5',
          name: 'Additional Wages / Site Bonus',
          desc: 'Overtime incentive, travel allowance, or festive support',
          type: 'Direct Allowance (+)',
          amt: `+ ₹${(bd.additionalWages || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
          color: '#0D9488',
        },
      ];

      let rowY = tableY + 20;
      items.forEach((item, idx) => {
        const bg = idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC';
        doc.rect(36, rowY, 523, 28).fill(bg);
        doc.rect(36, rowY, 523, 28).stroke(lightBorder);

        doc.fillColor('#64748B').fontSize(7.5).text(item.num, 44, rowY + 9);
        doc.fillColor('#0F172A').fontSize(8).text(item.name, 70, rowY + 4, { bold: true });
        doc.fillColor('#64748B').fontSize(6.5).text(item.desc, 70, rowY + 14);
        doc.fillColor('#475569').fontSize(7).text(item.type, 340, rowY + 9);
        doc.fillColor(item.color).fontSize(8.5).text(item.amt, 470, rowY + 8, { bold: true, align: 'right', width: 80 });

        rowY += 28;
      });

      // 5. Grand Net Amount Paid Highlight Box
      const netY = rowY + 8;
      doc.rect(36, netY, 523, 46).fill('#ECFDF5');
      doc.rect(36, netY, 523, 46).stroke('#10B981');
      doc.fillColor('#065F46').fontSize(8).text(trans.netDisbursedItem, 48, netY + 9, { bold: true });
      doc.fillColor('#047857').fontSize(7).text('Official Disbursed Payment Inflow after advance deductions & adjustments', 48, netY + 23);

      doc.fillColor('#065F46').fontSize(17).text(
        `₹${(txn.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
        350,
        netY + 12,
        { bold: true, align: 'right', width: 200 }
      );

      // 6. Post-Payment Worker Account Ledger Balance Box
      const balY = netY + 54;
      doc.rect(36, balY, 523, 36).fill('#FFFBEB');
      doc.rect(36, balY, 523, 36).stroke('#FCD34D');
      doc.fillColor('#92400E').fontSize(7.5).text('POST-PAYMENT ACCOUNT STATUS:', 48, balY + 6, { bold: true });

      doc.fillColor('#78350F').fontSize(8).text(
        `Remaining Advance Balance: ₹${(bd.remainingAdvance || 0).toLocaleString('en-IN')}  |  Unpaid Salary Balance: ₹0.00 (Fully Settled)`,
        48,
        balY + 18
      );

      // Notes section
      const notesY = balY + 44;
      doc.rect(36, notesY, 523, 28).fill('#F8FAFC');
      doc.rect(36, notesY, 523, 28).stroke(lightBorder);
      doc.fillColor('#64748B').fontSize(7).text('TRANSACTION REMARKS / NOTES:', 44, notesY + 5);
      doc.fillColor('#1E293B').fontSize(8).text(txn.notes || 'Direct net wage settlement payment.', 44, notesY + 14);

      // 7. Signature & Authorization Block
      const sigY = notesY + 36;
      // Payer Sign Box
      doc.rect(36, sigY, 256, 68).stroke(lightBorder);
      doc.fillColor('#64748B').fontSize(7).text('AUTHORIZED BY (CONTRACTOR / THEKEDAR):', 44, sigY + 7);
      doc.fillColor('#0F172A').fontSize(9).text(thekedar.name || 'Contractor', 44, sigY + 42, { bold: true });
      doc.fillColor('#94A3B8').fontSize(7).text('Signature & Verification Stamp', 44, sigY + 53);

      // Payee Sign Box
      doc.rect(303, sigY, 256, 68).stroke(lightBorder);
      doc.fillColor('#64748B').fontSize(7).text('RECEIVED & ACKNOWLEDGED BY (CRAFTSMAN):', 311, sigY + 7);
      doc.fillColor('#0F172A').fontSize(9).text(worker.name || 'Worker', 311, sigY + 42, { bold: true });
      doc.fillColor('#94A3B8').fontSize(7).text('Craftsman Signature / Thumb Impression', 311, sigY + 53);

      // Footer
      doc.fillColor('#94A3B8').fontSize(6.8).text(
        `This official wage payment voucher is electronically generated on FurniCraft ERP Platform on ${new Date().toLocaleString('en-IN')}. Reference ID: ${txn.transactionId}.`,
        36,
        sigY + 74,
        { align: 'center', width: 523 }
      );

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};
