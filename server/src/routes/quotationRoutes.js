import { Router } from 'express';
import * as quotationController from '../controllers/quotationController.js';
import { requireAuthentication, requireRole } from '../middleware/authMiddleware.js';
import { validate } from '../middleware/validationMiddleware.js';
import { createQuotationSchema, updateQuotationSchema } from '../validators/schemas.js';
import { ROLES } from '../config/constants.js';

const router = Router();

// Strictly authenticate: Both Thekedars and Owners can manage quotations; Workers are strictly 403 Forbidden
router.use(requireAuthentication);
router.use(requireRole(ROLES.OWNER, ROLES.THEKEDAR));

router.get('/initial-data', quotationController.getQuotationInitialData);
router.post('/', validate(createQuotationSchema), quotationController.createQuotation);
router.get('/', quotationController.listQuotations);
router.get('/:id', quotationController.getQuotationById);
router.put('/:id', validate(updateQuotationSchema), quotationController.updateQuotation);
router.delete('/:id', quotationController.deleteQuotation);
router.post('/:id/duplicate', quotationController.duplicateQuotation);
router.get('/:id/pdf', quotationController.downloadQuotationPdf);

export default router;
