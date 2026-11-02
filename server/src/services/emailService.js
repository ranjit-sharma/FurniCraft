import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import nodemailer from 'nodemailer';
import { env } from '../config/env.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const LOGO_PATH = path.resolve(__dirname, '../assets/furnicraft-logo.png');

let cachedTransporter = null;

/**
 * Obtain configured Nodemailer Transporter
 * Supports:
 * 1. Gmail SMTP with Google App Password (EMAIL_SERVICE='gmail' or SMTP_HOST='smtp.gmail.com')
 * 2. Custom Transactional SMTP (host, port, secure, user, pass)
 */
export const getEmailTransporter = () => {
  if (cachedTransporter) return cachedTransporter;

  const emailService = (process.env.EMAIL_SERVICE || process.env.SMTP_SERVICE || '').toLowerCase();
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = parseInt(process.env.SMTP_PORT, 10) || 587;
  const smtpUser = process.env.SMTP_USER;
  const rawPass = process.env.SMTP_PASS;
  const smtpPass = rawPass ? rawPass.replace(/\s+/g, '') : null;
  const smtpSecure = process.env.SMTP_SECURE === 'true' || smtpPort === 465;

  if (emailService === 'gmail' || (!smtpHost && smtpUser && smtpPass)) {
    cachedTransporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });
  } else if (smtpHost && smtpUser && smtpPass) {
    cachedTransporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpSecure,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });
  }

  return cachedTransporter;
};

/**
 * Dispatch 6-digit verification OTP email
 * @param {Object} options
 * @param {string} options.to - User email
 * @param {string} options.name - User name
 * @param {string} options.otp - 6-digit OTP code
 * @param {string} [options.purpose='PASSWORD_RESET'] - Purpose of OTP
 */
export const sendOtpEmail = async ({ to, name, otp, purpose = 'PASSWORD_RESET' }) => {
  const isProduction = process.env.NODE_ENV === 'production';
  const transporter = getEmailTransporter();
  const smtpUser = process.env.SMTP_USER;
  const isGmail = (process.env.EMAIL_SERVICE || '').toLowerCase() === 'gmail' || (smtpUser && smtpUser.includes('@gmail.com'));
  let fromAddress = process.env.EMAIL_FROM || process.env.SMTP_FROM;
  if (!fromAddress || (isGmail && fromAddress.includes('furnicraft.com') && smtpUser)) {
    fromAddress = `"FurniCraft ERP Security" <${smtpUser}>`;
  }
  if (!fromAddress) {
    fromAddress = '"FurniCraft ERP Security" <no-reply@furnicraft.com>';
  }

  const subject = purpose === 'PASSWORD_RESET'
    ? `FurniCraft ERP: Your Verification Code is ${otp}`
    : `FurniCraft ERP: Your Verification Code is ${otp}`;

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
    <html>
    <head>
      <meta charset="utf-8">
      <title>${subject}</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; color: #1e293b; margin: 0; padding: 24px; }
        .container { max-width: 540px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
        .header { background: #0f172a; padding: 32px 24px; text-align: center; color: #ffffff; }
        .logo-container { margin-bottom: 14px; text-align: center; }
        .logo-img { height: 56px; max-width: 220px; object-fit: contain; display: inline-block; }
        .brand-title { margin: 0; font-size: 26px; font-weight: 900; letter-spacing: -0.5px; color: #ffffff; }
        .brand-name-furni { color: #d97706; }
        .brand-name-craft { color: #60a5fa; }
        .brand-badge-erp { background: rgba(217, 119, 6, 0.2); border: 1px solid rgba(217, 119, 6, 0.4); padding: 2px 8px; border-radius: 6px; font-size: 13px; color: #fbbf24; vertical-align: middle; margin-left: 6px; }
        .brand-subtitle { font-size: 11px; color: #94a3b8; margin-top: 6px; text-transform: uppercase; letter-spacing: 1.2px; font-weight: 600; }
        .security-badge { display: inline-block; background: #1e293b; border: 1px solid #334155; padding: 5px 16px; border-radius: 9999px; font-size: 11px; font-weight: 700; color: #38bdf8; margin-top: 12px; letter-spacing: 0.5px; }
        .content { padding: 32px 24px; }
        .greeting { font-size: 18px; font-weight: 800; color: #0f172a; margin-bottom: 12px; }
        .message { font-size: 14px; line-height: 1.6; color: #475569; margin-bottom: 24px; }
        .otp-box { background: #f8fafc; border: 2px dashed #2563eb; border-radius: 12px; padding: 22px; text-align: center; margin-bottom: 24px; }
        .otp-label { font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; }
        .otp-code { font-family: Consolas, 'Courier New', monospace; font-size: 40px; font-weight: 900; color: #1d4ed8; letter-spacing: 8px; margin: 0; }
        .expiry-note { font-size: 12px; font-weight: 600; color: #b45309; margin-top: 8px; }
        .warning-box { background: #fef3c7; border: 1px solid #fde68a; border-radius: 10px; padding: 12px 14px; font-size: 12px; line-height: 1.5; color: #92400e; margin-bottom: 24px; }
        .footer { padding: 20px 24px; background: #f8fafc; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8; text-align: center; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo-container">
            ${logoCid 
              ? `<img src="cid:${logoCid}" alt="FurniCraft ERP Logo" class="logo-img" />`
              : `<img src="${env.CLIENT_URL || 'http://localhost:5173'}/furnicraft-logo.png" height="56" alt="FurniCraft ERP Logo" class="logo-img" />`
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
    </body>
    </html>
  `;

  const textContent = `Hello ${name || 'Craftsman'},\n\nYour FurniCraft ERP verification code is:\n\n${otp}\n\nThis code expires in 5 minutes. Do not share this code with anyone.\n\nTip: If this message arrived in your Spam/Junk folder, mark it as 'Not Spam' to receive future notifications directly to your inbox.\n\nFurniCraft ERP — Modern Furniture Workforce & Project Management`;

  if (transporter) {
    try {
      const mailOptions = {
        from: fromAddress,
        to,
        subject,
        text: textContent,
        html: htmlContent,
        headers: {
          'X-Priority': '1 (Highest)',
          'X-MSMail-Priority': 'High',
          Importance: 'High',
        },
      };
      if (attachments.length > 0) {
        mailOptions.attachments = attachments;
      }
      const info = await transporter.sendMail(mailOptions);

      console.log(`[EmailService] OTP email delivered to ${to}: ${info.messageId} | Accepted: ${JSON.stringify(info.accepted)}`);

      return {
        success: true,
        mode: 'smtp',
        messageId: info.messageId,
        devOtp: (!isProduction ? otp : undefined),
      };
    } catch (err) {
      console.error(`[EmailService] SMTP delivery failed for ${to}:`, err.message);
      // In development, fall through to simulation
      if (isProduction) {
        throw new Error('Failed to send verification email. Please contact support.');
      }
    }
  }

  // Development / Test Simulated Dispatch (Never log OTP in production)
  if (!isProduction) {
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
  }

  return {
    success: true,
    mode: 'simulated',
    devOtp: (!isProduction ? otp : undefined),
  };
};

/**
 * Send password email to user (legacy/fallback support)
 */
export const sendPasswordEmail = async ({ to, name, newPassword }) => {
  const isProduction = process.env.NODE_ENV === 'production';
  const transporter = getEmailTransporter();
  const fromAddress = process.env.EMAIL_FROM || process.env.SMTP_FROM || '"FurniCraft Support" <support@furnicraft.com>';
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
    <html>
    <head>
      <meta charset="utf-8">
      <title>FurniCraft ERP Account Password</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 24px; }
        .container { max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
        .header { background: #0f172a; padding: 32px 24px; text-align: center; color: #ffffff; }
        .logo-container { margin-bottom: 14px; text-align: center; }
        .logo-img { height: 56px; max-width: 220px; object-fit: contain; display: inline-block; }
        .brand-title { margin: 0; font-size: 26px; font-weight: 900; letter-spacing: -0.5px; color: #ffffff; }
        .brand-name-furni { color: #d97706; }
        .brand-name-craft { color: #60a5fa; }
        .brand-badge-erp { background: rgba(217, 119, 6, 0.2); border: 1px solid rgba(217, 119, 6, 0.4); padding: 2px 8px; border-radius: 6px; font-size: 13px; color: #fbbf24; vertical-align: middle; margin-left: 6px; }
        .brand-subtitle { font-size: 11px; color: #94a3b8; margin-top: 6px; text-transform: uppercase; letter-spacing: 1.2px; font-weight: 600; }
        .content { padding: 32px 24px; }
        .greeting { font-size: 18px; font-weight: 800; color: #0f172a; margin-bottom: 12px; }
        .message { font-size: 14px; line-height: 1.6; color: #475569; margin-bottom: 24px; }
        .password-box { background: #f8fafc; border: 2px dashed #3b82f6; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 24px; }
        .password-label { font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; }
        .password-value { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 24px; font-weight: 900; color: #1d4ed8; letter-spacing: 2px; }
        .warning-box { background: #fef3c7; border: 1px solid #fde68a; border-radius: 10px; padding: 14px; font-size: 12px; line-height: 1.5; color: #92400e; margin-bottom: 24px; }
        .btn { display: inline-block; background: #2563eb; color: #ffffff !important; text-decoration: none; padding: 12px 28px; font-size: 14px; font-weight: 700; border-radius: 10px; margin-top: 8px; }
        .footer { padding: 20px 24px; background: #f8fafc; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8; text-align: center; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo-container">
            ${logoCid 
              ? `<img src="cid:${logoCid}" alt="FurniCraft ERP Logo" class="logo-img" />`
              : `<img src="${env.CLIENT_URL || 'http://localhost:5173'}/furnicraft-logo.png" height="56" alt="FurniCraft ERP Logo" class="logo-img" />`
            }
          </div>
          <h1 class="brand-title">
            <span class="brand-name-furni">Furni</span><span class="brand-name-craft">Craft</span><span class="brand-badge-erp">ERP</span>
          </h1>
          <div class="brand-subtitle">Modern Furniture Workforce &amp; Project Management</div>
        </div>
        <div class="content">
          <div class="greeting">Hello, ${name || 'Craftsman'}!</div>
          <p class="message">
            We received a request to recover the password for your FurniCraft account linked to <strong>${to}</strong> on the <strong>FurniCraft ERP</strong> platform.
            Your temporary access password has been generated below:
          </p>

          <div class="password-box">
            <div class="password-label">Your New Account Password</div>
            <div class="password-value">${newPassword}</div>
          </div>

          <div class="warning-box">
            <strong>Security Reminder:</strong> Please sign in using this password and immediately update it in your profile settings. Do not share this password with anyone.
          </div>

          <div style="text-align: center;">
            <a href="${env.CLIENT_URL || 'http://localhost:5173'}" class="btn">Sign In to FurniCraft ERP</a>
          </div>
        </div>
        <div class="footer">
          This is an automated security email from <strong>FurniCraft ERP</strong> — Modern Furniture Workforce System.<br/>
          If you did not request this password reset, please contact your administrator or supervisor immediately.
        </div>
      </div>
    </body>
    </html>
  `;

  const textContent = `Hello ${name || 'Craftsman'},\n\nYour FurniCraft ERP account password for ${to} is:\n\n${newPassword}\n\nPlease sign in at ${env.CLIENT_URL || 'http://localhost:5173'} and update your password immediately.\n\nFurniCraft ERP — Modern Furniture Workforce & Project Management`;

  if (transporter) {
    try {
      const mailOptions = {
        from: fromAddress,
        to,
        subject,
        text: textContent,
        html: htmlContent,
      };
      if (attachments.length > 0) {
        mailOptions.attachments = attachments;
      }
      const info = await transporter.sendMail(mailOptions);
      return { success: true, mode: 'smtp', messageId: info.messageId };
    } catch (err) {
      console.error(`[EmailService] SMTP delivery failed for ${to}:`, err.message);
    }
  }

  if (!isProduction) {
    console.log(`\n======================================================`);
    console.log(`[EmailService - Simulated Dispatch]`);
    console.log(`To: ${to} (${name})`);
    console.log(`Subject: ${subject}`);
    console.log(`Password: ${newPassword}`);
    console.log(`======================================================\n`);
  }

  return { success: true, mode: 'simulated' };
};
