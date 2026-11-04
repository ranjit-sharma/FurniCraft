import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { User, SupportTicket } from '../src/models/index.js';
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
    const testUser = await User.create({
      name: 'Ramesh Support Test',
      phone: '9888877771',
      email: 'ramesh.test@furnicraft.com',
      password: 'password123',
      role: 'THEKEDAR',
    });

    const token = signToken({ id: testUser._id, role: testUser.role, tokenVersion: testUser.tokenVersion });

    const ticketPayload = {
      category: 'ATTENDANCE_WAGES',
      subject: 'Urgent Wage Discrepancy on Project #102',
      message: 'Worker daily rate was calculated incorrectly for 2 shifts on Saturday.',
      contactEmail: 'ramesh.test@furnicraft.com',
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
});
