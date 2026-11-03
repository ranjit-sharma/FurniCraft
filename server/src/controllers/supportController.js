import { SupportTicket, AuditLog, Notification } from '../models/index.js';
import { BadRequestError, NotFoundError } from '../utils/errors.js';

export const supportController = {
  /**
   * Submit a new help / support ticket
   * POST /api/v1/support/tickets
   */
  async createTicket(req, res, next) {
    try {
      const user = req.user;
      const { category, priority, subject, message } = req.body;

      if (!subject || !subject.trim()) {
        throw new BadRequestError('Subject is required');
      }
      if (subject.trim().length < 3) {
        throw new BadRequestError('Subject must be at least 3 characters long');
      }
      if (!message || !message.trim()) {
        throw new BadRequestError('Message description is required');
      }
      if (message.trim().length < 5) {
        throw new BadRequestError('Message must be at least 5 characters long');
      }

      // Generate unique human-readable ticket number, e.g. TKT-2026-834912
      const year = new Date().getFullYear();
      const randomSuffix = Math.floor(100000 + Math.random() * 900000);
      const ticketNumber = `TKT-${year}-${randomSuffix}`;

      const validCategories = [
        'ATTENDANCE_WAGES',
        'PROJECT_SITE',
        'PAYMENT_BILL',
        'TOOL_EQUIPMENT',
        'ACCOUNT_LOGIN',
        'GENERAL_INQUIRY',
        'OTHER',
      ];
      const selectedCategory = validCategories.includes(category) ? category : 'GENERAL_INQUIRY';

      const validPriorities = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
      const selectedPriority = validPriorities.includes(priority) ? priority : 'MEDIUM';

      const ticket = await SupportTicket.create({
        ticketNumber,
        userId: user._id,
        userName: user.name || 'FurniCraft User',
        userEmail: user.email || '',
        userPhone: user.phone || '',
        userRole: user.role || 'USER',
        category: selectedCategory,
        priority: selectedPriority,
        subject: subject.trim(),
        message: message.trim(),
        status: 'OPEN',
      });

      // Record AuditLog
      try {
        await AuditLog.create({
          actorId: user._id,
          actorName: user.name,
          actorRole: user.role,
          action: 'CREATE_SUPPORT_TICKET',
          targetType: 'SupportTicket',
          targetId: ticket._id.toString(),
          reason: `Support ticket ${ticketNumber} created by ${user.name}`,
          newValues: {
            ticketNumber,
            category: selectedCategory,
            subject: ticket.subject,
            priority: selectedPriority,
          },
        });
      } catch (auditErr) {
        console.warn('[Support] Non-blocking audit log failure:', auditErr.message);
      }

      // Create confirmation notification for the user
      try {
        await Notification.create({
          recipientId: user._id,
          title: `Support Ticket Created (${ticketNumber})`,
          message: `Your query regarding "${ticket.subject}" has been received. Our team will review it shortly.`,
          type: 'INFO',
          relatedEntity: {
            entityType: 'SupportTicket',
            entityId: ticket._id.toString(),
          },
        });
      } catch (notifErr) {
        console.warn('[Support] Non-blocking notification failure:', notifErr.message);
      }

      return res.status(201).json({
        success: true,
        message: 'Your help request has been submitted successfully.',
        ticket,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get all tickets submitted by current authenticated user
   * GET /api/v1/support/tickets/my
   */
  async getMyTickets(req, res, next) {
    try {
      const tickets = await SupportTicket.find({ userId: req.user._id })
        .sort({ createdAt: -1 })
        .limit(50)
        .lean();

      return res.status(200).json({
        success: true,
        count: tickets.length,
        tickets,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get all tickets across organisation (Owner / Admin only)
   * GET /api/v1/support/tickets
   */
  async getAllTickets(req, res, next) {
    try {
      const filter = {};
      if (req.query.status) {
        filter.status = req.query.status;
      }
      if (req.query.category) {
        filter.category = req.query.category;
      }

      const tickets = await SupportTicket.find(filter)
        .sort({ createdAt: -1 })
        .limit(100)
        .lean();

      return res.status(200).json({
        success: true,
        count: tickets.length,
        tickets,
      });
    } catch (error) {
      next(error);
    }
  },
};
