import { SupportTicket, AuditLog, Notification } from '../models/index.js';
import { BadRequestError, NotFoundError } from '../utils/errors.js';
import { sendSupportTicketEmail } from '../services/emailService.js';
import { generateUniqueTicketNumber, withDuplicateRetry } from '../utils/codeGenerator.js';

export const supportController = {
  /**
   * Submit a new help / support ticket
   * POST /api/v1/support/tickets
   */
  async createTicket(req, res, next) {
    try {
      const user = req.user;
      const { category, subject, message, contactEmail, contactPhone } = req.body;

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

      // Generate strictly unique human-readable ticket number with concurrency retry
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

      const userEmail = (contactEmail || user.email || '').trim();
      const userPhone = (contactPhone || user.phone || '').trim();

      const ticket = await withDuplicateRetry(async () => {
        const ticketNumber = await generateUniqueTicketNumber();
        return await SupportTicket.create({
          ticketNumber,
          userId: user._id,
          userName: user.name || 'FurniCraft User',
          userEmail,
          userPhone,
          userRole: user.role || 'USER',
          category: selectedCategory,
          subject: subject.trim(),
          message: message.trim(),
          status: 'OPEN',
        });
      });

      // Dispatch support notification email to furnicraft.erp@gmail.com asynchronously
      sendSupportTicketEmail({
        ticketNumber: ticket.ticketNumber,
        userName: ticket.userName,
        userEmail: ticket.userEmail,
        userPhone: ticket.userPhone,
        userRole: ticket.userRole,
        category: ticket.category,
        subject: ticket.subject,
        message: ticket.message,
        createdAt: ticket.createdAt,
      }).catch((emailErr) => {
        console.error('[Support] Async email dispatch failure to furnicraft.erp@gmail.com:', emailErr.message);
      });

      // Record AuditLog asynchronously
      AuditLog.create({
        actorId: user._id,
        actorName: user.name,
        actorRole: user.role,
        action: 'CREATE_SUPPORT_TICKET',
        targetType: 'SupportTicket',
        targetId: ticket._id.toString(),
        reason: `Support ticket ${ticket.ticketNumber} created by ${user.name}`,
        newValues: {
          ticketNumber: ticket.ticketNumber,
          category: selectedCategory,
          subject: ticket.subject,
        },
      }).catch((auditErr) => {
        console.warn('[Support] Non-blocking audit log failure:', auditErr.message);
      });

      // Create confirmation notification for the user asynchronously
      Notification.create({
        recipientId: user._id,
        title: `Support Ticket Created (${ticket.ticketNumber})`,
        message: `Your query regarding "${ticket.subject}" has been received. Our team will review it shortly.`,
        type: 'INFO',
        relatedEntity: {
          entityType: 'SupportTicket',
          entityId: ticket._id.toString(),
        },
      }).catch((notifErr) => {
        console.warn('[Support] Non-blocking notification failure:', notifErr.message);
      });

      return res.status(201).json({
        success: true,
        message: 'Your help request has been submitted successfully and delivered to furnicraft.erp@gmail.com.',
        ticket,
        emailDispatched: true,
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
      const orConditions = [{ userId: req.user._id }];
      if (req.user.email) {
        orConditions.push({ userEmail: req.user.email });
        orConditions.push({ userEmail: req.user.email.toLowerCase() });
      }

      const tickets = await SupportTicket.find({ $or: orConditions })
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

  /**
   * Update support ticket status and/or resolution notes (Owner / Admin only)
   * PATCH /api/v1/support/tickets/:id
   */
  async updateTicketStatus(req, res, next) {
    try {
      const { id } = req.params;
      const { status, adminNotes } = req.body;

      const ticket = await SupportTicket.findById(id);
      if (!ticket) {
        throw new NotFoundError('Support ticket not found');
      }

      const validStatuses = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];
      if (status && !validStatuses.includes(status)) {
        throw new BadRequestError(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
      }

      const previousStatus = ticket.status;
      if (status) ticket.status = status;
      if (adminNotes !== undefined) ticket.adminNotes = adminNotes.trim();

      await ticket.save();

      // Record AuditLog asynchronously
      AuditLog.create({
        actorId: req.user._id,
        actorName: req.user.name,
        actorRole: req.user.role,
        action: 'UPDATE_SUPPORT_TICKET',
        targetType: 'SupportTicket',
        targetId: ticket._id.toString(),
        reason: `Support ticket ${ticket.ticketNumber} updated from ${previousStatus} to ${ticket.status} by Owner ${req.user.name}`,
        newValues: {
          status: ticket.status,
          adminNotes: ticket.adminNotes,
        },
      }).catch((auditErr) => {
        console.warn('[Support] Non-blocking audit log failure:', auditErr.message);
      });

      // Dispatch notification to requester asynchronously
      Notification.create({
        recipientId: ticket.userId,
        title: `Support Ticket Updated (${ticket.ticketNumber})`,
        message: `Your ticket regarding "${ticket.subject}" has been marked as ${ticket.status}.${ticket.adminNotes ? ` Note: ${ticket.adminNotes}` : ''}`,
        type: 'INFO',
        relatedEntity: {
          entityType: 'SupportTicket',
          entityId: ticket._id.toString(),
        },
      }).catch((notifErr) => {
        console.warn('[Support] Non-blocking notification failure:', notifErr.message);
      });

      return res.status(200).json({
        success: true,
        message: `Ticket ${ticket.ticketNumber} updated to ${ticket.status}`,
        ticket,
      });
    } catch (error) {
      next(error);
    }
  },
};
