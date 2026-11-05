import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { env } from '../config/env.js';
import { AppError } from '../utils/errors.js';

class ServiceUnavailableError extends AppError {
  constructor(message) {
    super(message, 503);
  }
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const LOGO_PATH = path.resolve(__dirname, '../assets/furnicraft-logo.png');

const EMAIL_UNAVAILABLE = 'We could not send the verification email right now. Please try again in a few minutes or contact your administrator.';
const DEFAULT_SENDER_EMAIL = 'furnicraft.erp@gmail.com';
const DEFAULT_SENDER_NAME = 'FurniCraft ERP Security';

export const resetEmailTransporters = () => {};

/**
 * Clean & normalize sender "From" address
 */
export const getCleanFromAddress = () => {
  const senderEmail = process.env.BREVO_SENDER || process.env.SMTP_USER || DEFAULT_SENDER_EMAIL;
  return `"${DEFAULT_SENDER_NAME}" <${senderEmail}>`;
};

/**
 * Send email via Brevo HTTPS REST API (Port 443 - Fast, reliable cloud delivery, never blocked by firewalls)
 */
export const sendViaBrevo = async ({ to, name, subject, html, text, fromAddress, replyTo, attachments = [] }) => {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) return null;

  try {
    const senderEmail = process.env.BREVO_SENDER || DEFAULT_SENDER_EMAIL;
    const senderName = DEFAULT_SENDER_NAME;

    const payload = {
      sender: { name: senderName, email: senderEmail },
      to: Array.isArray(to)
        ? to.map((e) => ({ email: typeof e === 'string' ? e : e.email, name: (typeof e === 'object' && e.name) || name || e }))
        : [{ email: to, name: name || to }],
      subject,
      htmlContent: html,
      textContent: text,
    };

    if (replyTo) {
      payload.replyTo = { email: replyTo };
    }

    if (attachments && attachments.length > 0) {
      payload.attachment = attachments
        .map((att) => {
          let base64Content = att.content;
          if (!base64Content && att.path && fs.existsSync(att.path)) {
            base64Content = fs.readFileSync(att.path).toString('base64');
          }
          return {
            name: att.filename || path.basename(att.path || 'attachment'),
            content: base64Content,
          };
        })
        .filter((a) => !!a.content);
    }

    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => ({}));
    if (res.ok && (data?.messageId || data?.id)) {
      const msgId = data.messageId || data.id;
      console.log(`[EmailService - Brevo HTTPS] Delivered to ${to}: ${msgId}`);
      return { success: true, mode: 'brevo_https', messageId: msgId, info: { messageId: msgId } };
    }

    console.warn('[EmailService - Brevo HTTPS Warning]', data);
    return null;
  } catch (err) {
    console.warn('[EmailService - Brevo HTTPS Exception]', err.message);
    return null;
  }
};

/**
 * Send email via Resend HTTPS REST API (Port 443 - zero-configuration option)
 */
export const sendViaResend = async ({ to, subject, html, text, fromAddress }) => {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromAddress || 'FurniCraft ERP <onboarding@resend.dev>',
        to: Array.isArray(to) ? to : [to],
        subject,
        html,
        text,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data?.id) {
      console.log(`[EmailService - Resend HTTPS] Delivered to ${to}: ${data.id}`);
      return { success: true, mode: 'resend_https', messageId: data.id, info: { messageId: data.id } };
    }
    console.warn('[EmailService - Resend HTTPS Warning]', data);
    return null;
  } catch (err) {
    console.warn('[EmailService - Resend HTTPS Exception]', err.message);
    return null;
  }
};

/**
 * Brevo-powered transporter adapter for test mocking and backward compatibility
 */
const brevoTransporter = {
  sendMail: async (options) => {
    const res = await sendMailWithResilience(options);
    if (!res.success) {
      throw new Error(res.lastError?.message || 'Email delivery failed');
    }
    return res.info || { messageId: res.messageId };
  },
  verify: async () => verifyEmailTransport(),
  close: () => {},
};

export const getEmailTransporter = () => brevoTransporter;
export const getFallbackEmailTransporter = () => brevoTransporter;

/**
 * Send email with HTTPS REST API resilience (Brevo or Resend)
 */
const sendMailWithResilience = async (mailOptions) => {
  if (process.env.BREVO_API_KEY) {
    const brevoResult = await sendViaBrevo(mailOptions);
    if (brevoResult?.success) return brevoResult;
  }
  if (process.env.RESEND_API_KEY) {
    const resendResult = await sendViaResend(mailOptions);
    if (resendResult?.success) return resendResult;
  }

  return { success: false, lastError: new Error('Email delivery failed: please ensure BREVO_API_KEY or RESEND_API_KEY is configured') };
};

/**
 * Check Brevo HTTPS connection at startup
 */
export const verifyEmailTransport = async () => {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    console.warn('[EmailService] BREVO_API_KEY is not configured. Email delivery will simulate in development or fail in production.');
    return false;
  }

  try {
    const res = await fetch('https://api.brevo.com/v3/account', {
      headers: { 'api-key': apiKey },
    });
    if (res.ok) {
      const data = await res.json();
      console.log(`[EmailService] Brevo HTTPS verified as ${data.email} (${data.plan?.[0]?.type || 'Free'})`);
      return true;
    }
    const err = await res.json().catch(() => ({}));
    console.warn(`[EmailService] Brevo HTTPS key verification failed:`, err.message || err.code || res.status);
    return false;
  } catch (err) {
    console.warn(`[EmailService] Brevo verification network error:`, err.message);
    return false;
  }
};

/**
 * Dispatch 6-digit verification OTP email via Brevo HTTPS API
 * @param {Object} options
 * @param {string} options.to - User email
 * @param {string} options.name - User name
 * @param {string} options.otp - 6-digit OTP code
 * @param {string} [options.purpose='PASSWORD_RESET'] - Purpose of OTP
 */
export const sendOtpEmail = async ({ to, name, otp, purpose = 'PASSWORD_RESET' }) => {
  const isProduction = process.env.NODE_ENV === 'production';
  const fromAddress = getCleanFromAddress();

  const subject = `FurniCraft ERP: Your Verification Code is ${otp}`;

  const attachments = [];
  let logoCid = null;
  if (fs.existsSync(LOGO_PATH)) {
    logoCid = 'furnicraftlogo@furnicraft.erp';
    attachments.push({
      filename: 'furnicraft-logo.png',
      path: LOGO_PATH,
      cid: logoCid,
    });
  }

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
      <meta name="x-apple-disable-message-reformatting">
      <meta name="color-scheme" content="light dark">
      <meta name="supported-color-schemes" content="light dark">
      <title>${subject}</title>
      <style>
        *, *:before, *:after { box-sizing: border-box !important; }
        html, body {
          margin: 0 !important;
          padding: 0 !important;
          width: 100% !important;
          min-width: 100% !important;
          -webkit-text-size-adjust: 100% !important;
          -ms-text-size-adjust: 100% !important;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          background-color: #f1f5f9;
          color: #1e293b;
        }
        .wrapper { width: 100% !important; min-width: 100% !important; background-color: #f1f5f9; padding: 20px 10px; margin: 0; }
        .container { max-width: 540px; width: 100%; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
        .header { background: #0f172a; padding: 28px 20px; text-align: center; color: #ffffff; }
        .logo-container { margin-bottom: 14px; text-align: center; }
        .logo-img { height: 52px; max-width: 200px; object-fit: contain; display: inline-block; }
        .brand-title { margin: 0; font-size: 24px; font-weight: 900; letter-spacing: -0.5px; color: #ffffff; line-height: 1.2; }
        .brand-name-furni { color: #d97706; }
        .brand-name-craft { color: #60a5fa; }
        .brand-badge-erp { background: rgba(217, 119, 6, 0.2); border: 1px solid rgba(217, 119, 6, 0.4); padding: 2px 8px; border-radius: 6px; font-size: 12px; color: #fbbf24; vertical-align: middle; margin-left: 6px; }
        .brand-subtitle { font-size: 11px; color: #94a3b8; margin-top: 6px; text-transform: uppercase; letter-spacing: 1.2px; font-weight: 600; line-height: 1.4; }
        .security-badge { display: inline-block; background: #1e293b; border: 1px solid #334155; padding: 5px 14px; border-radius: 9999px; font-size: 11px; font-weight: 700; color: #38bdf8; margin-top: 12px; letter-spacing: 0.5px; }
        .content { padding: 28px 20px; }
        .greeting { font-size: 18px; font-weight: 800; color: #0f172a; margin-bottom: 12px; line-height: 1.3; }
        .message { font-size: 14px; line-height: 1.6; color: #475569; margin-bottom: 24px; word-break: break-word; overflow-wrap: anywhere; }
        .otp-box { background: #f8fafc; border: 2px dashed #2563eb; border-radius: 12px; padding: 20px 14px; text-align: center; margin-bottom: 24px; }
        .otp-label { font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; }
        .otp-code { font-family: Consolas, 'Courier New', monospace; font-size: 38px; font-weight: 900; color: #1d4ed8; letter-spacing: 6px; margin: 0; }
        .expiry-note { font-size: 12px; font-weight: 600; color: #b45309; margin-top: 8px; }
        .warning-box { background: #fef3c7; border: 1px solid #fde68a; border-radius: 10px; padding: 12px 14px; font-size: 12px; line-height: 1.5; color: #92400e; margin-bottom: 24px; word-break: break-word; }
        .footer { padding: 18px 20px; background: #f8fafc; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8; text-align: center; line-height: 1.5; word-break: break-word; }
        @media only screen and (max-width: 480px) {
          .wrapper { padding: 8px 4px !important; }
          .container { border-radius: 12px !important; }
          .header { padding: 20px 14px !important; }
          .content { padding: 20px 14px !important; }
          .otp-code { font-size: 30px !important; letter-spacing: 4px !important; }
          .brand-title { font-size: 20px !important; }
        }
      </style>
    </head>
    <body>
      <div class="wrapper">
        <div class="container">
          <div class="header">
            <div class="logo-container">
              ${logoCid 
                ? `<img src="cid:${logoCid}" alt="FurniCraft ERP Logo" class="logo-img" />`
                : `<img src="${env.CLIENT_URL || 'http://localhost:5173'}/furnicraft-logo.png" height="52" alt="FurniCraft ERP Logo" class="logo-img" />`
              }
            </div>
            <h1 class="brand-title">
              <span class="brand-name-furni">Furni</span><span class="brand-name-craft">Craft</span><span class="brand-badge-erp">ERP</span>
            </h1>
            <div class="brand-subtitle">Modern Furniture Workforce &amp; Project Management</div>
            <div class="security-badge">🛡️ Official Account Verification Code</div>
          </div>
          <div class="content">
            <div class="greeting">Hello, ${name || 'Craftsman'}!</div>
            <p class="message">
              We received a request to verify access for your account associated with <strong>${to}</strong> on the <strong>FurniCraft ERP</strong> platform.
              Please use your official single-use verification code below:
            </p>

            <div class="otp-box">
              <div class="otp-label">Your 6-Digit Verification Code</div>
              <div class="otp-code">${otp}</div>
              <div class="expiry-note">⏱ Valid for 5 minutes</div>
            </div>

            <div class="warning-box">
              <strong>Security Notice:</strong> Never share this OTP with anyone, including supervisors or administrators. FurniCraft ERP staff will never ask for your verification code. If you did not make this request, please secure your account immediately.<br/><br/>
              💡 <em>Tip: If this email arrived in your Spam or Junk folder, please click "Report not spam" or "Move to Inbox" to ensure future account notifications arrive directly in your inbox.</em>
            </div>
          </div>
          <div class="footer">
            This is an automated verification email from <strong>FurniCraft ERP</strong> — Modern Furniture Workforce System.<br/>
            Sent securely to ${to}
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  const textContent = `Hello ${name || 'Craftsman'},\n\nYour FurniCraft ERP verification code is:\n\n${otp}\n\nThis code expires in 5 minutes. Do not share this code with anyone.\n\nTip: If this message arrived in your Spam/Junk folder, mark it as 'Not Spam' to receive future notifications directly to your inbox.\n\nFurniCraft ERP — Modern Furniture Workforce & Project Management`;

  const mailOptions = {
    from: fromAddress,
    fromAddress,
    to,
    name: name || 'Craftsman',
    subject,
    text: textContent,
    html: htmlContent,
  };
  if (attachments.length > 0) {
    mailOptions.attachments = attachments;
  }

  const result = await sendMailWithResilience(mailOptions);
  if (result.success) {
    const msgId = result.messageId || result.info?.messageId;
    console.log(`[EmailService] OTP email delivered to ${to} (${result.mode}): ${msgId}`);
    return {
      success: true,
      delivered: true,
      mode: result.mode,
      messageId: msgId,
      devOtp: (!isProduction ? otp : undefined),
    };
  }

  // If delivery failed in production, throw ServiceUnavailableError so failure is clear and no OTP is ever leaked
  if (isProduction) {
    console.error(`[EmailService] Brevo delivery failed for ${to}:`, result.lastError?.message);
    throw new ServiceUnavailableError(EMAIL_UNAVAILABLE);
  }

  // Development / Test Simulated Dispatch (Never log OTP in production)
  console.log(`
======================================================
[EmailService - Simulated Secure Dispatch]
To:       ${to} (${name})
Purpose:  ${purpose}
Subject:  ${subject}
OTP Code: ${otp}
Expires:  5 Minutes
======================================================
  `);

  return {
    success: true,
    mode: 'simulated',
    devOtp: otp,
  };
};

/**
 * Send password email to user (legacy/fallback support)
 */
export const sendPasswordEmail = async ({ to, name, newPassword }) => {
  const isProduction = process.env.NODE_ENV === 'production';
  const fromAddress = getCleanFromAddress();
  const subject = 'Your FurniCraft Account Password';

  const attachments = [];
  let logoCid = null;
  if (fs.existsSync(LOGO_PATH)) {
    logoCid = 'furnicraftlogo@furnicraft.erp';
    attachments.push({
      filename: 'furnicraft-logo.png',
      path: LOGO_PATH,
      cid: logoCid,
    });
  }

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
      <meta name="x-apple-disable-message-reformatting">
      <meta name="color-scheme" content="light dark">
      <meta name="supported-color-schemes" content="light dark">
      <title>FurniCraft ERP Account Password</title>
      <style>
        *, *:before, *:after { box-sizing: border-box !important; }
        html, body {
          margin: 0 !important;
          padding: 0 !important;
          width: 100% !important;
          min-width: 100% !important;
          -webkit-text-size-adjust: 100% !important;
          -ms-text-size-adjust: 100% !important;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background-color: #f8fafc;
          color: #1e293b;
        }
        .wrapper { width: 100% !important; min-width: 100% !important; background-color: #f8fafc; padding: 20px 10px; margin: 0; }
        .container { max-width: 560px; width: 100%; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
        .header { background: #0f172a; padding: 28px 20px; text-align: center; color: #ffffff; }
        .logo-container { margin-bottom: 14px; text-align: center; }
        .logo-img { height: 52px; max-width: 200px; object-fit: contain; display: inline-block; }
        .brand-title { margin: 0; font-size: 24px; font-weight: 900; letter-spacing: -0.5px; color: #ffffff; line-height: 1.2; }
        .brand-name-furni { color: #d97706; }
        .brand-name-craft { color: #60a5fa; }
        .brand-badge-erp { background: rgba(217, 119, 6, 0.2); border: 1px solid rgba(217, 119, 6, 0.4); padding: 2px 8px; border-radius: 6px; font-size: 12px; color: #fbbf24; vertical-align: middle; margin-left: 6px; }
        .brand-subtitle { font-size: 11px; color: #94a3b8; margin-top: 6px; text-transform: uppercase; letter-spacing: 1.2px; font-weight: 600; line-height: 1.4; }
        .content { padding: 28px 20px; }
        .greeting { font-size: 18px; font-weight: 800; color: #0f172a; margin-bottom: 12px; line-height: 1.3; }
        .message { font-size: 14px; line-height: 1.6; color: #475569; margin-bottom: 24px; word-break: break-word; overflow-wrap: anywhere; }
        .password-box { background: #f8fafc; border: 2px dashed #3b82f6; border-radius: 12px; padding: 18px 12px; text-align: center; margin-bottom: 24px; }
        .password-label { font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; }
        .password-value { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 22px; font-weight: 900; color: #1d4ed8; letter-spacing: 2px; word-break: break-all; }
        .warning-box { background: #fef3c7; border: 1px solid #fde68a; border-radius: 10px; padding: 12px 14px; font-size: 12px; line-height: 1.5; color: #92400e; margin-bottom: 24px; word-break: break-word; }
        .btn { display: inline-block; background: #2563eb; color: #ffffff !important; text-decoration: none; padding: 12px 28px; font-size: 14px; font-weight: 700; border-radius: 10px; margin-top: 8px; text-align: center; }
        .footer { padding: 18px 20px; background: #f8fafc; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8; text-align: center; line-height: 1.5; word-break: break-word; }
        @media only screen and (max-width: 480px) {
          .wrapper { padding: 8px 4px !important; }
          .container { border-radius: 12px !important; }
          .header { padding: 20px 14px !important; }
          .content { padding: 20px 14px !important; }
          .password-value { font-size: 18px !important; }
          .btn { display: block !important; width: 100% !important; box-sizing: border-box !important; }
          .brand-title { font-size: 20px !important; }
        }
      </style>
    </head>
    <body>
      <div class="wrapper">
        <div class="container">
          <div class="header">
            <div class="logo-container">
              ${logoCid 
                ? `<img src="cid:${logoCid}" alt="FurniCraft ERP Logo" class="logo-img" />`
                : `<img src="${env.CLIENT_URL || 'http://localhost:5173'}/furnicraft-logo.png" height="52" alt="FurniCraft ERP Logo" class="logo-img" />`
              }
            </div>
            <h1 class="brand-title">
              <span class="brand-name-furni">Furni</span><span class="brand-name-craft">Craft</span><span class="brand-badge-erp">ERP</span>
            </h1>
            <div class="brand-subtitle">Modern Furniture Workforce &amp; Project Management</div>
          </div>
          <div class="content">
            <div class="greeting">Hello, ${name}!</div>
            <p class="message">
              Your account has been created on the <strong>FurniCraft ERP</strong> management platform.
              Below are your initial login credentials:
            </p>

            <div class="password-box">
              <div class="password-label">Temporary Account Password</div>
              <div class="password-value">${newPassword}</div>
            </div>

            <div class="warning-box">
              <strong>Security Recommendation:</strong> Please log in and immediately update your password under your Profile / Settings. Never share your password with anyone.
            </div>

            <div style="text-align: center; margin-top: 24px;">
              <a href="${env.CLIENT_URL || 'http://localhost:5173'}/login" class="btn">
                Log In to FurniCraft &rarr;
              </a>
            </div>
          </div>
          <div class="footer">
            This is an automated notification from FurniCraft ERP.<br/>
            Sent securely to ${to}
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  const textContent = `Hello ${name},\n\nYour FurniCraft ERP account has been created.\n\nYour temporary password is: ${newPassword}\n\nPlease log in at ${env.CLIENT_URL || 'http://localhost:5173'}/login and update your password immediately.\n\nFurniCraft ERP Team`;

  const mailOptions = {
    from: fromAddress,
    fromAddress,
    to,
    name: name || 'Craftsman',
    subject,
    text: textContent,
    html: htmlContent,
  };
  if (attachments.length > 0) {
    mailOptions.attachments = attachments;
  }

  const result = await sendMailWithResilience(mailOptions);
  if (result.success) {
    return { success: true, mode: 'brevo_https', messageId: result.messageId || result.info?.messageId };
  }

  if (isProduction) {
    console.error(`[EmailService] Brevo delivery failed for ${to}:`, result.lastError?.message);
    throw new ServiceUnavailableError(EMAIL_UNAVAILABLE);
  }

  console.log(`[EmailService - Simulated Password Email] Delivered to: ${to} | Password: ${newPassword}`);
  return { success: true, mode: 'simulated' };
};

/**
 * Dispatch support ticket notification email to furnicraft.erp@gmail.com
 * Guarantees zero leakage: sent ONLY to furnicraft.erp@gmail.com
 */
export const sendSupportTicketEmail = async ({
  ticketNumber,
  userName,
  userEmail,
  userPhone,
  userRole,
  category,
  subject,
  message,
  createdAt,
}) => {
  const isProduction = process.env.NODE_ENV === 'production';
  const supportEmail = 'furnicraft.erp@gmail.com';
  const emailSubject = `[FurniCraft Support] Ticket #${ticketNumber}: ${subject}`;

  const categoryLabels = {
    PAYMENT_ADVANCE: 'Payment & Advance',
    ATTENDANCE_WAGES: 'Attendance & Wages (Haziri & Dehari)',
    PROJECT_ISSUE: 'Project & Site Work',
    ACCOUNT_ACCESS: 'Account Access & Security',
    GENERAL_INQUIRY: 'General Inquiry / Madad',
  };
  const categoryName = categoryLabels[category] || category || 'General Help';
  const formattedDate = new Date(createdAt || Date.now()).toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  const attachments = [];
  let logoCid = null;
  if (fs.existsSync(LOGO_PATH)) {
    logoCid = 'furnicraftlogo@furnicraft.erp';
    attachments.push({
      filename: 'furnicraft-logo.png',
      path: LOGO_PATH,
      cid: logoCid,
    });
  }

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
      <meta name="x-apple-disable-message-reformatting">
      <title>${emailSubject}</title>
      <style>
        *, *:before, *:after { box-sizing: border-box !important; }
        html, body {
          margin: 0 !important;
          padding: 0 !important;
          width: 100% !important;
          min-width: 100% !important;
          -webkit-text-size-adjust: 100% !important;
          -ms-text-size-adjust: 100% !important;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background-color: #f1f5f9;
          color: #0f172a;
        }
        .wrapper { width: 100% !important; min-width: 100% !important; background-color: #f1f5f9; padding: 20px 10px; margin: 0; }
        .container { max-width: 580px; width: 100%; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
        .header { background: #0f172a; padding: 24px 20px; text-align: center; color: #ffffff; }
        .logo-container { margin-bottom: 12px; text-align: center; }
        .logo-img { height: 48px; max-width: 190px; object-fit: contain; display: inline-block; }
        .brand-title { margin: 0; font-size: 22px; font-weight: 900; letter-spacing: -0.5px; color: #ffffff; line-height: 1.2; }
        .brand-name-furni { color: #d97706; }
        .brand-name-craft { color: #60a5fa; }
        .brand-badge { background: #d97706; padding: 2px 8px; border-radius: 6px; font-size: 11px; font-weight: 800; color: #ffffff; vertical-align: middle; margin-left: 6px; }
        .content { padding: 24px 20px; }
        .ticket-title { font-size: 19px; font-weight: 800; color: #0f172a; margin-bottom: 6px; line-height: 1.35; }
        .ticket-meta { font-size: 12px; color: #64748b; margin-bottom: 18px; }
        .ticket-banner { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px 16px; margin-bottom: 18px; }
        .detail-row { display: table; width: 100%; padding: 6px 0; border-bottom: 1px dashed #e2e8f0; font-size: 13px; }
        .detail-row-last { display: table; width: 100%; padding: 6px 0; font-size: 13px; }
        .detail-label { display: table-cell; width: 130px; font-weight: 700; color: #475569; }
        .detail-value { display: table-cell; font-weight: 600; color: #0f172a; }
        .role-badge { display: inline-block; background: #e0f2fe; color: #0369a1; padding: 1px 7px; border-radius: 9999px; font-size: 11px; font-weight: 700; margin-left: 6px; }
        .category-badge { display: inline-block; background: #fef3c7; color: #92400e; padding: 2px 8px; border-radius: 6px; font-size: 11.5px; font-weight: 700; }
        .message-box {
          background: #fffbeb;
          border: 1px solid #fef3c7;
          border-left: 4px solid #d97706;
          border-radius: 8px;
          padding: 14px 16px;
          margin: 18px 0;
          box-sizing: border-box;
        }
        .message-title {
          font-size: 11px;
          font-weight: 800;
          text-transform: uppercase;
          color: #92400e;
          margin-bottom: 8px;
          letter-spacing: 0.6px;
        }
        .message-text {
          font-size: 13.5px;
          line-height: 1.6;
          color: #1e293b;
          white-space: pre-wrap;
          word-break: break-word;
          overflow-wrap: anywhere;
        }
        .actions-box {
          margin: 20px 0 8px 0;
          text-align: center;
        }
        .action-btn-reply {
          display: inline-block;
          background: #d97706;
          color: #ffffff !important;
          text-decoration: none;
          font-size: 13px;
          font-weight: 800;
          padding: 10px 18px;
          border-radius: 10px;
          margin: 4px;
          text-align: center;
        }
        .action-btn-dashboard {
          display: inline-block;
          background: #0f172a;
          color: #ffffff !important;
          text-decoration: none;
          font-size: 13px;
          font-weight: 800;
          padding: 10px 18px;
          border-radius: 10px;
          margin: 4px;
          text-align: center;
        }
        .footer {
          padding: 18px 20px;
          background: #f8fafc;
          border-top: 1px solid #e2e8f0;
          font-size: 11px;
          color: #94a3b8;
          text-align: center;
          line-height: 1.5;
          word-break: break-word;
        }
        @media only screen and (max-width: 480px) {
          .wrapper { padding: 8px 4px !important; }
          .container { border-radius: 12px !important; width: 100% !important; max-width: 100% !important; }
          .header { padding: 20px 14px !important; }
          .content { padding: 16px 12px !important; }
          .ticket-title { font-size: 16px !important; }
          .ticket-banner { padding: 10px 12px !important; }
          .message-box { padding: 12px !important; }
          .action-btn-reply, .action-btn-dashboard {
            display: block !important;
            width: 100% !important;
            margin: 6px 0 !important;
            box-sizing: border-box !important;
          }
        }
      </style>
    </head>
    <body>
      <div class="wrapper">
        <div class="container">
          <div class="header">
            <div class="logo-container">
              ${logoCid 
                ? `<img src="cid:${logoCid}" alt="FurniCraft ERP Logo" class="logo-img" />`
                : `<span style="font-size: 26px; font-weight: 900; color: #fff;">FurniCraft</span>`
              }
            </div>
            <h1 class="brand-title">
              <span class="brand-name-furni">Furni</span><span class="brand-name-craft">Craft</span><span class="brand-badge">SUPPORT</span>
            </h1>
          </div>

          <div class="content">
            <div class="ticket-title">${subject}</div>
            <div class="ticket-meta">
              Ticket Number: <strong style="color: #0f172a; font-family: monospace;">${ticketNumber}</strong> &bull; Submitted: ${formattedDate}
            </div>

            <div class="ticket-banner">
              <!-- Submitted By -->
              <div class="detail-row">
                <div class="detail-label">Submitted By</div>
                <div class="detail-value">
                  ${userName}
                  <span class="role-badge">${userRole}</span>
                </div>
              </div>

              <!-- Contact Phone -->
              <div class="detail-row">
                <div class="detail-label">Contact Phone</div>
                <div class="detail-value">
                  ${userPhone
                    ? `<a href="tel:${userPhone}" style="color: #2563eb; text-decoration: none; font-weight: 700;">📞 ${userPhone}</a>`
                    : '<span style="color: #94a3b8; font-weight: 500;">Not provided</span>'
                  }
                </div>
              </div>

              <!-- Contact Email -->
              <div class="detail-row">
                <div class="detail-label">Contact Email</div>
                <div class="detail-value">
                  ${userEmail
                    ? `<a href="mailto:${userEmail}" style="color: #2563eb; text-decoration: none; word-break: break-all; overflow-wrap: anywhere; font-weight: 700;">✉️ ${userEmail}</a>`
                    : '<span style="color: #94a3b8; font-weight: 500;">Not provided</span>'
                  }
                </div>
              </div>

              <!-- Category -->
              <div class="detail-row-last">
                <div class="detail-label">Category</div>
                <div class="detail-value">
                  <span class="category-badge">${categoryName}</span>
                </div>
              </div>
            </div>

            <div class="message-box">
              <div class="message-title">Issue Description / Details:</div>
              <div class="message-text">${message}</div>
            </div>

            <!-- Fast Action Buttons for Owner / Admin -->
            <div class="actions-box">
              ${userEmail && userEmail.includes('@') ? `
                <a href="mailto:${userEmail}?subject=Re:%20[FurniCraft%20Support]%20${ticketNumber}:%20${encodeURIComponent(subject)}" class="action-btn-reply">
                  ✉️ Reply to ${userName}
                </a>
              ` : ''}
              <a href="${env.CLIENT_URL || 'http://localhost:5173'}" class="action-btn-dashboard">
                🏢 Open FurniCraft App
              </a>
            </div>
          </div>

          <div class="footer">
            This is an official automated helpdesk notification from <strong>FurniCraft ERP</strong>.<br/>
            Ticket: <strong style="font-family: monospace;">${ticketNumber}</strong> &bull; Delivered to: <strong>${supportEmail}</strong>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  const textContent = `
[FurniCraft ERP Support] New Support Ticket ${ticketNumber}
Submitted by: ${userName} (${userRole})
Contact Phone: ${userPhone || 'N/A'}
Contact Email: ${userEmail || 'N/A'}
Category: ${categoryName}
Date: ${formattedDate}

Subject: ${subject}

Description / Message:
${message}
  `.trim();

  const fromAddress = getCleanFromAddress();
  const mailOptions = {
    from: fromAddress,
    fromAddress,
    to: supportEmail,
    name: 'FurniCraft ERP Owner',
    replyTo: userEmail && userEmail.includes('@') ? userEmail : undefined,
    subject: emailSubject,
    text: textContent,
    html: htmlContent,
  };
  if (attachments.length > 0) {
    mailOptions.attachments = attachments;
  }

  const result = await sendMailWithResilience(mailOptions);
  if (result.success) {
    console.log(`[EmailService] Support ticket #${ticketNumber} email delivered to ${supportEmail}: ${result.info?.messageId || result.messageId}`);
    return {
      success: true,
      mode: 'brevo_https',
      messageId: result.info?.messageId || result.messageId,
    };
  }

  console.log(`[EmailService - Simulated Support Email] Delivered to: ${supportEmail} | Ticket: ${ticketNumber}`);
  return { success: true, mode: 'simulated' };
};
