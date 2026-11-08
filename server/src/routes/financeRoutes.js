import { Router } from 'express';
import * as financeController from '../controllers/financeController.js';
import { requireAuthentication, requireRole } from '../middleware/authMiddleware.js';
import { authorizeWorkerAccess, authorizeFinancialTransactionAccess } from '../middleware/resourceAuthMiddleware.js';
import { validate } from '../middleware/validationMiddleware.js';
import {
  createAdvanceRequestSchema,
  reviewAdvanceRequestSchema,
  reverseTransactionSchema,
  payWorkerNetSchema,
  giveAdvanceSchema,
} from '../validators/schemas.js';
import { ROLES } from '../config/constants.js';

const router = Router();

router.use(requireAuthentication);

router.post('/advance-requests', validate(createAdvanceRequestSchema), financeController.createAdvanceRequest);
router.get('/advance-requests', financeController.listAdvanceRequests);
router.patch('/advance-requests/:requestId/review', requireRole(ROLES.OWNER, ROLES.THEKEDAR), validate(reviewAdvanceRequestSchema), financeController.reviewAdvanceRequest);
router.post('/advance-requests/:requestId/disburse', requireRole(ROLES.OWNER, ROLES.THEKEDAR), financeController.disburseAdvance);

router.post('/salary-payments', requireRole(ROLES.OWNER, ROLES.THEKEDAR), financeController.recordSalaryPayment);
router.post('/workers/:workerId/advance', requireRole(ROLES.OWNER, ROLES.THEKEDAR), validate(giveAdvanceSchema), financeController.giveAdvance);
router.post('/workers/:workerId/pay-net', requireRole(ROLES.OWNER, ROLES.THEKEDAR), validate(payWorkerNetSchema), financeController.payWorkerNet);
router.get('/ledger/:workerId', authorizeWorkerAccess, financeController.getWorkerLedger);
router.get('/transactions', financeController.listTransactions);
router.get('/transactions/search/:query', financeController.searchTransactionById);
router.get('/transactions/:transactionId/bill', financeController.downloadPaymentBill);
router.post('/transactions/:transactionId/reverse', requireRole(ROLES.OWNER, ROLES.THEKEDAR), authorizeFinancialTransactionAccess, validate(reverseTransactionSchema), financeController.reverseTransaction);

export default router;
