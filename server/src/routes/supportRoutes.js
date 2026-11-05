import express from 'express';
import { requireAuthentication, requireRole } from '../middleware/authMiddleware.js';
import { ROLES } from '../config/constants.js';
import { supportController } from '../controllers/supportController.js';

const router = express.Router();

router.use(requireAuthentication);

// User endpoints
router.post('/tickets', supportController.createTicket);
router.get('/tickets/my', supportController.getMyTickets);

// Executive / Owner endpoint to view and manage tickets
router.get('/tickets', requireRole(ROLES.OWNER), supportController.getAllTickets);
router.patch('/tickets/:id', requireRole(ROLES.OWNER), supportController.updateTicketStatus);
router.patch('/tickets/:id/status', requireRole(ROLES.OWNER), supportController.updateTicketStatus);

export default router;
