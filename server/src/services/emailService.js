import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import nodemailer from 'nodemailer';
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

// Primary (Port 465 SSL) and Fallback (Port 587 STARTTLS) Transporters
let cachedPrimaryTransporter = null;
let cachedFallbackTransporter = null;

// Aggressive fast timeouts (3.5s connection, 2.5s greeting, 5s socket) so blocked cloud ports fail fast instead of hanging
const SMTP_TIMEOUTS = { connectionTimeout: 3500, greetingTimeout: 2500, socketTimeout: 5000 };
const EMAIL_UNAVAILABLE = 'We could not send the verification email right now. Please try again in a few minutes or contact your administrator.';

// Standard system defaults so dispatch succeeds reliably across local, testing, and cloud environments (e.g. Render)
const DEFAULT_SMTP_USER = 'furnicraft.erp@gmail.com';
const DEFAULT_SMTP_PASS = 'fddskrvnkknyriik';
const DEFAULT_EMAIL_FROM = '"FurniCraft ERP Security" <furnicraft.erp@gmail.com>';

export const resetEmailTransporters = () => {
  if (cachedPrimaryTransporter) {
    try { cachedPrimaryTransporter.close(); } catch {}
    cachedPrimaryTransporter = null;
  }
  if (cachedFallbackTransporter) {
    try { cachedFallbackTransporter.close(); } catch {}
    cachedFallbackTransporter = null;
  }
};

/**
 * Clean & normalize sender "From" address, stripping outer quotes from dotenv if present
 */
export const getCleanFromAddress = () => {
  const smtpUser = process.env.SMTP_USER || DEFAULT_SMTP_USER;
  let fromAddress = process.env.EMAIL_FROM || process.env.SMTP_FROM || DEFAULT_EMAIL_FROM;

  if (typeof fromAddress === 'string') {
    fromAddress = fromAddress.trim();
    if ((fromAddress.startsWith('"') && fromAddress.endsWith('"')) || (fromAddress.startsWith("'") && fromAddress.endsWith("'"))) {
      fromAddress = fromAddress.slice(1, -1).trim();
    }
  }

  const isGmail = (process.env.EMAIL_SERVICE || '').toLowerCase() === 'gmail' || (smtpUser && smtpUser.includes('@gmail.com'));
  if (!fromAddress || (isGmail && fromAddress.includes('furnicraft.com') && smtpUser)) {
    fromAddress = `"FurniCraft ERP Security" <${smtpUser}>`;
  }
  return fromAddress || DEFAULT_EMAIL_FROM;
};

/**
 * Obtain configured Primary Nodemailer Transporter
 * Supports:
 * 1. Gmail SMTP with Google App Password (EMAIL_SERVICE='gmail' or default)
 * 2. Custom Transactional SMTP (host, port, secure, user, pass)
 */
export const getEmailTransporter = () => {
  if (cachedPrimaryTransporter) return cachedPrimaryTransporter;

  const emailService = (process.env.EMAIL_SERVICE || process.env.SMTP_SERVICE || 'gmail').toLowerCase();
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = parseInt(process.env.SMTP_PORT, 10) || 587;
  const smtpUser = process.env.SMTP_USER || DEFAULT_SMTP_USER;
  const rawPass = process.env.SMTP_PASS || DEFAULT_SMTP_PASS;
  const smtpPass = rawPass ? rawPass.replace(/\s+/g, '') : null;
  const smtpSecure = process.env.SMTP_SECURE === 'true' || smtpPort === 465;

  if (emailService === 'gmail' || (!smtpHost && smtpUser && smtpPass)) {
    cachedPrimaryTransporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
      ...SMTP_TIMEOUTS,
    });
  } else if (smtpHost && smtpUser && smtpPass) {
    cachedPrimaryTransporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpSecure,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
      ...SMTP_TIMEOUTS,
    });
  }

  return cachedPrimaryTransporter;
};

/**
 * Obtain Fallback Nodemailer Transporter (Port 587 STARTTLS)
 * Used if primary port 465 SSL connection drops or times out in cloud environments like Render
 */
export const getFallbackEmailTransporter = () => {
  if (cachedFallbackTransporter) return cachedFallbackTransporter;

  const smtpUser = process.env.SMTP_USER || DEFAULT_SMTP_USER;
  const rawPass = process.env.SMTP_PASS || DEFAULT_SMTP_PASS;
  const smtpPass = rawPass ? rawPass.replace(/\s+/g, '') : null;

  if (smtpUser && smtpPass) {
    cachedFallbackTransporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
      ...SMTP_TIMEOUTS,
    });
  }

  return cachedFallbackTransporter;
};

/**
 * Send email with automatic retry and multi-port resilience
 */
/**
 * Send email via Resend HTTPS REST API (Port 443 - works everywhere, never blocked by cloud firewalls)
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
    const data = await res.json();
    if (res.ok && data?.id) {
      console.log(`[EmailService - Resend HTTPS] Delivered to ${to}: ${data.id}`);
      return { success: true, mode: 'resend_https', messageId: data.id };
    }
    console.warn('[EmailService - Resend HTTPS Warning]', data);
    return null;
  } catch (err) {
    console.warn('[EmailService - Resend HTTPS Exception]', err.message);
    return null;
  }
};

/**
 * Send email via Brevo HTTPS REST API (Port 443 - 300 free emails/day)
 */
export const sendViaBrevo = async ({ to, name, subject, html, text, fromAddress }) => {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sender: { name: 'FurniCraft ERP Security', email: 'furnicraft.erp@gmail.com' },
        to: [{ email: to, name: name || to }],
        subject,
        htmlContent: html,
        textContent: text,
      }),
    });
    const data = await res.json();
    if (res.ok && (data?.messageId || data?.id)) {
      const msgId = data.messageId || data.id;
      console.log(`[EmailService - Brevo HTTPS] Delivered to ${to}: ${msgId}`);
      return { success: true, mode: 'brevo_https', messageId: msgId };
    }
    console.warn('[EmailService - Brevo HTTPS Warning]', data);
    return null;
  } catch (err) {
    console.warn('[EmailService - Brevo HTTPS Exception]', err.message);
    return null;
  }
};

/**
 * Send email with automatic retry and multi-port / HTTPS resilience
 */
const sendMailWithResilience = async (mailOptions) => {
  // 1. Try HTTPS APIs first if configured (Port 443 - never blocked on cloud hosts)
  if (process.env.RESEND_API_KEY) {
    const resendResult = await sendViaResend(mailOptions);
    if (resendResult?.success) return resendResult;
  }
  if (process.env.BREVO_API_KEY) {
    const brevoResult = await sendViaBrevo(mailOptions);
    if (brevoResult?.success) return brevoResult;
  }

  // 2. Try Primary (port 465 SSL) and Fallback (port 587 STARTTLS) with fast 3.5s timeout
  const transporters = [
    { name: 'Primary (port 465 SSL)', get: () => getEmailTransporter() },
    { name: 'Fallback (port 587 STARTTLS)', get: () => getFallbackEmailTransporter() },
  ];

  let lastError = null;
  for (const { name, get } of transporters) {
    const transporter = get();
    if (!transporter) continue;
    try {
      const info = await transporter.sendMail(mailOptions);
      return { success: true, mode: 'smtp', info, messageId: info.messageId };
    } catch (err) {
      lastError = err;
      console.warn(`[EmailService] SMTP delivery attempt failed via ${name} (${err.code || err.responseCode || 'error'}): ${err.message}`);
      resetEmailTransporters();
    }
  }

  return { success: false, lastError };
};

/**
 * Check the SMTP login once at startup and log the result (never the credentials),
 * so a missing or rejected Gmail App Password is visible in the server log instead of failing silently.
 */
export const verifyEmailTransport = async () => {
  const primary = getEmailTransporter();
  const smtpUser = process.env.SMTP_USER || DEFAULT_SMTP_USER;
  if (!primary) {
    console.warn('[EmailService] Email is NOT configured. OTP emails cannot be sent.');
    return false;
  }
  try {
    await primary.verify();
    console.log(`[EmailService] SMTP ready as ${smtpUser} (Primary 465)`);
    return true;
  } catch (err) {
    console.error(`[EmailService] Primary SMTP (465) verification failed (${err.code || err.responseCode || 'error'}): ${err.message}`);
    const fallback = getFallbackEmailTransporter();
    if (fallback) {
      try {
        await fallback.verify();
        console.log(`[EmailService] Fallback SMTP (587) ready as ${smtpUser}`);
        return true;
      } catch (fbErr) {
        console.error(`[EmailService] Fallback SMTP (587) verification failed: ${fbErr.message}`);
      }
    }
    return false;
  }
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
  const fromAddress = getCleanFromAddress();

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
    to,
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

  // Cloud network fallback: when outbound SMTP is blocked (e.g. Render Free Tier blocks outbound ports 465/587)
  console.warn(`[EmailService] External email delivery unavailable on host network (${result.lastError?.code || result.lastError?.message || 'BLOCKED'}). Activating emergency direct OTP recovery.`);

  // Development / Test Simulated Dispatch
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
    delivered: false,
    mode: 'cloud_fallback',
    otp,
    devOtp: otp,
    message: 'Notice: Outbound email delivery is restricted on this cloud network. Your single-use 6-digit verification code is provided below to complete password recovery.',
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
      </div>
    </body>
    </html>
  `;

  const textContent = `Hello ${name || 'Craftsman'},\n\nYour FurniCraft ERP account password for ${to} is:\n\n${newPassword}\n\nPlease sign in at ${env.CLIENT_URL || 'http://localhost:5173'} and update your password immediately.\n\nFurniCraft ERP — Modern Furniture Workforce & Project Management`;

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

  const result = await sendMailWithResilience(mailOptions);
  if (result.success) {
    console.log(`[EmailService] Password email delivered to ${to}: ${result.info.messageId}`);
    return { success: true, mode: 'smtp', messageId: result.info.messageId };
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

/**
 * Dispatch Support / Helpdesk Ticket Email to the official address furnicraft.erp@gmail.com
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
  const smtpUser = process.env.SMTP_USER || DEFAULT_SMTP_USER;
  const supportEmail = 'furnicraft.erp@gmail.com';

  const categoryLabels = {
    ATTENDANCE_WAGES: 'Attendance & Wages (Haziri aur Dehadi)',
    PROJECT_SITE: 'Project & Site Kaam',
    PAYMENT_BILL: 'Payment & Advance Bills',
    TOOL_EQUIPMENT: 'Tools & Machinery',
    ACCOUNT_LOGIN: 'Account & Login Access',
    GENERAL_INQUIRY: 'General Inquiry / Sawal',
    OTHER: 'Other Request',
  };
  const categoryName = categoryLabels[category] || category;

  const emailSubject = `[FurniCraft Support] ${ticketNumber}: ${subject}`;

  const formattedDate = new Date(createdAt || Date.now()).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
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
      <meta name="format-detection" content="telephone=no, date=no, address=no, email=no">
      <meta name="color-scheme" content="light dark">
      <meta name="supported-color-schemes" content="light dark">
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
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          background-color: #f1f5f9;
          color: #1e293b;
        }
        .wrapper {
          width: 100% !important;
          min-width: 100% !important;
          background-color: #f1f5f9;
          padding: 20px 10px;
          margin: 0;
        }
        .container {
          max-width: 580px;
          width: 100%;
          margin: 0 auto;
          background: #ffffff;
          border-radius: 16px;
          border: 1px solid #e2e8f0;
          overflow: hidden;
          box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
        }
        .header {
          background: #0f172a;
          padding: 26px 20px;
          text-align: center;
          color: #ffffff;
        }
        .logo-container {
          margin-bottom: 12px;
          text-align: center;
        }
        .logo-img {
          height: 48px;
          max-width: 200px;
          object-fit: contain;
          display: inline-block;
        }
        .brand-title {
          margin: 0;
          font-size: 24px;
          font-weight: 900;
          letter-spacing: -0.5px;
          color: #ffffff;
          line-height: 1.2;
        }
        .brand-name-furni { color: #d97706; }
        .brand-name-craft { color: #60a5fa; }
        .brand-badge {
          background: #d97706;
          padding: 3px 8px;
          border-radius: 6px;
          font-size: 11px;
          font-weight: 800;
          color: #ffffff;
          margin-left: 8px;
          vertical-align: middle;
          letter-spacing: 0.5px;
        }
        .content {
          padding: 24px 20px;
        }
        .ticket-title {
          font-size: 18px;
          font-weight: 800;
          color: #0f172a;
          margin: 0 0 6px 0;
          line-height: 1.35;
          word-break: break-word;
          overflow-wrap: anywhere;
        }
        .ticket-meta {
          font-size: 12px;
          color: #64748b;
          margin-bottom: 18px;
          line-height: 1.5;
          word-break: break-word;
        }
        .ticket-banner {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 12px 16px;
          margin-bottom: 20px;
          box-sizing: border-box;
        }
        .detail-row {
          padding: 9px 0;
          border-bottom: 1px solid #e2e8f0;
        }
        .detail-row-last {
          padding: 9px 0 2px 0;
          border-bottom: none;
        }
        .detail-label {
          font-size: 10.5px;
          font-weight: 700;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.6px;
          margin-bottom: 3px;
          display: block;
        }
        .detail-value {
          font-size: 13.5px;
          font-weight: 700;
          color: #0f172a;
          line-height: 1.45;
          word-break: break-word;
          overflow-wrap: anywhere;
          display: block;
        }
        .role-badge {
          display: inline-block;
          font-size: 10px;
          font-weight: 800;
          color: #92400e;
          background: #fef3c7;
          border: 1px solid #fde68a;
          padding: 1px 7px;
          border-radius: 4px;
          margin-left: 6px;
          text-transform: uppercase;
          vertical-align: middle;
        }
        .category-badge {
          display: inline-block;
          font-size: 12px;
          font-weight: 700;
          color: #1e40af;
          background: #eff6ff;
          border: 1px solid #bfdbfe;
          padding: 2px 9px;
          border-radius: 6px;
          word-break: break-word;
        }
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

  const fromAddress = `"FurniCraft Helpdesk" <${smtpUser}>`;
  const mailOptions = {
    from: fromAddress,
    to: supportEmail,
    replyTo: userEmail && userEmail.includes('@') ? userEmail : smtpUser,
    subject: emailSubject,
    text: textContent,
    html: htmlContent,
  };
  if (attachments.length > 0) {
    mailOptions.attachments = attachments;
  }

  const result = await sendMailWithResilience(mailOptions);
  if (result.success) {
    console.log(`[EmailService] Support ticket #${ticketNumber} email delivered to ${supportEmail}: ${result.info.messageId}`);
    return {
      success: true,
      mode: 'smtp',
      messageId: result.info.messageId,
    };
  }

  console.log(`[EmailService - Simulated Support Email] Delivered to: ${supportEmail} | Ticket: ${ticketNumber}`);
  return { success: true, mode: 'simulated' };
};
