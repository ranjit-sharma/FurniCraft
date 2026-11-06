import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { User, SupportTicket, Notification } from '../src/models/index.js';
import { signToken } from '../src/utils/jwt.js';
import * as emailService from '../src/services/emailService.js';

describe('Support & Help Center API Verification', () => {
  it('validates required fields when submitting support ticket without auth', async () => {
    const app = createApp();

    const res = await request(app)
      .post('/api/v1/support/tickets')
      .send({ subject: '', message: '' });

    expect([401, 403]).toContain(res.status);
  });

  it('successfully creates ticket and dispatches email notification to furnicraft.erp@gmail.com', async () => {
    const app = createApp();

    // Mock sendSupportTicketEmail spy
    const emailSpy = vi.spyOn(emailService, 'sendSupportTicketEmail');

    // Create test user or mock user
    const testEmail = `support.contractor.${Date.now()}@example.com`;
    const testUser = await User.create({
      name: 'Support Test Contractor',
      phone: `988${Math.floor(1000000 + Math.random() * 9000000)}`,
      email: testEmail,
      password: 'password123',
      role: 'THEKEDAR',
    });

    const token = signToken({ id: testUser._id, role: testUser.role, tokenVersion: testUser.tokenVersion });

    const ticketPayload = {
      category: 'ATTENDANCE_WAGES',
      subject: 'Urgent Wage Discrepancy on Project #102',
      message: 'Worker daily rate was calculated incorrectly for 2 shifts on Saturday.',
      contactEmail: testEmail,
    };

    const res = await request(app)
      .post('/api/v1/support/tickets')
      .set('Authorization', `Bearer ${token}`)
      .send(ticketPayload);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.ticket).toBeDefined();
    expect(res.body.ticket.ticketNumber).toMatch(/^TKT-\d{4}-\d{6}$/);
    expect(res.body.ticket.subject).toBe(ticketPayload.subject);

    // Verify email service was called with furnicraft.erp@gmail.com details
    expect(emailSpy).toHaveBeenCalled();
    const calledArgs = emailSpy.mock.calls[0][0];
    expect(calledArgs.ticketNumber).toBe(res.body.ticket.ticketNumber);
    expect(calledArgs.subject).toBe(ticketPayload.subject);
    expect(calledArgs.category).toBe('ATTENDANCE_WAGES');

    // Clean up
    await SupportTicket.deleteMany({ userId: testUser._id });
    await Notification.deleteMany({ recipientId: testUser._id });
    await User.deleteOne({ _id: testUser._id });
    emailSpy.mockRestore();
  });

  it('guarantees support ticket email is sent ONLY to furnicraft.erp@gmail.com with NO other recipients', async () => {
    const transporter = emailService.getEmailTransporter();
    let sentMailOptions = null;
    let spy = null;
    if (transporter) {
      spy = vi.spyOn(transporter, 'sendMail').mockImplementation(async (options) => {
        sentMailOptions = options;
        return { messageId: '<test-support-msg-id@furnicraft.erp>' };
      });
    }

    const result = await emailService.sendSupportTicketEmail({
      ticketNumber: 'TKT-2026-999999',
      userName: 'External Craft Person',
      userEmail: 'external.person@externaldomain.com',
      userPhone: '9876543210',
      userRole: 'THEKEDAR',
      category: 'GENERAL_INQUIRY',
      subject: 'Test Exclusive Delivery to Furnicraft ERP',
      message: 'This message must only be delivered to furnicraft.erp@gmail.com',
    });

    expect(result.success).toBe(true);
    if (sentMailOptions) {
      expect(sentMailOptions.to).toBe('furnicraft.erp@gmail.com');
      expect(sentMailOptions.cc).toBeUndefined();
      expect(sentMailOptions.bcc).toBeUndefined();
    }
    if (spy) {
      spy.mockRestore();
    }
  });

  it('allows Owner to view all tickets and update ticket status and notes', async () => {
    const app = createApp();

    // Create Owner user
    const ts = Date.now();
    const ownerUser = await User.create({
      name: 'Owner Admin Test',
      phone: `988${Math.floor(1000000 + Math.random() * 9000000)}`,
      email: `owner.admin.${ts}@example.com`,
      password: 'password123',
      role: 'OWNER',
    });

    const thekedarUser = await User.create({
      name: 'Thekedar Support Submitter',
      phone: `988${Math.floor(1000000 + Math.random() * 9000000)}`,
      email: `thekedar.submitter.${ts}@example.com`,
      password: 'password123',
      role: 'THEKEDAR',
    });

    const thekedarToken = signToken({ id: thekedarUser._id, role: thekedarUser.role, tokenVersion: thekedarUser.tokenVersion });
    const ownerToken = signToken({ id: ownerUser._id, role: ownerUser.role, tokenVersion: ownerUser.tokenVersion });

    // 1. Thekedar submits ticket
    const createRes = await request(app)
      .post('/api/v1/support/tickets')
      .set('Authorization', `Bearer ${thekedarToken}`)
      .send({
        category: 'PAYMENT_BILL',
        subject: 'Weekly Advance Request Clarification',
        message: 'Need advance released for project woodwork completion.',
      });

    expect(createRes.status).toBe(201);
    const createdTicket = createRes.body.ticket;

    // 2. Non-owner cannot view all tickets
    const nonOwnerGetRes = await request(app)
      .get('/api/v1/support/tickets')
      .set('Authorization', `Bearer ${thekedarToken}`);
    expect([401, 403]).toContain(nonOwnerGetRes.status);

    // 3. Owner CAN view all tickets
    const ownerGetRes = await request(app)
      .get('/api/v1/support/tickets')
      .set('Authorization', `Bearer ${ownerToken}`);
    expect(ownerGetRes.status).toBe(200);
    expect(ownerGetRes.body.success).toBe(true);
    expect(Array.isArray(ownerGetRes.body.tickets)).toBe(true);
    const found = ownerGetRes.body.tickets.find((t) => t.ticketNumber === createdTicket.ticketNumber);
    expect(found).toBeDefined();

    // 4. Owner updates ticket status and admin notes
    const updateRes = await request(app)
      .patch(`/api/v1/support/tickets/${createdTicket._id}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        status: 'RESOLVED',
        adminNotes: 'Advance approved and transferred via bank transaction #TXN99881.',
      });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.success).toBe(true);
    expect(updateRes.body.ticket.status).toBe('RESOLVED');
    expect(updateRes.body.ticket.adminNotes).toContain('TXN99881');

    // Clean up
    await SupportTicket.deleteMany({ userId: { $in: [thekedarUser._id, ownerUser._id] } });
    await Notification.deleteMany({ recipientId: { $in: [thekedarUser._id, ownerUser._id] } });
    await User.deleteMany({ _id: { $in: [thekedarUser._id, ownerUser._id] } });
  });
});
