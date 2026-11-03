import express from 'express';
import { requireAuthentication, requireRole } from '../middleware/authMiddleware.js';
import { ROLES } from '../config/constants.js';
import { supportController } from '../controllers/supportController.js';

const router = express.Router();

router.use(requireAuthentication);

// User endpoints
router.post('/tickets', supportController.createTicket);
router.get('/tickets/my', supportController.getMyTickets);

// Executive / Owner endpoint to view all tickets
router.get('/tickets', requireRole(ROLES.OWNER), supportController.getAllTickets);

export default router;
