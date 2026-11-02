import { normalizePhone } from '../utils/phone.js';

/**
 * Enterprise SMS Dispatch Service
 * Configured via environment variables:
 * - SMS_PROVIDER: 'twilio' | 'fast2sms' | 'msg91' | 'console' (default: 'console' in dev/test)
 */
export const sendOtpSms = async ({ phone, otp, purpose = 'PASSWORD_RESET', name = 'User' }) => {
  const provider = (process.env.SMS_PROVIDER || 'console').toLowerCase();
  const normalizedPhone = normalizePhone(phone);

  const message = purpose === 'PASSWORD_RESET'
    ? `FurniCraft ERP Security: Your 6-digit password reset OTP is ${otp}. Valid for 5 minutes. Do not share this OTP with anyone.`
    : `FurniCraft ERP: Your 6-digit registration verification OTP is ${otp}. Valid for 5 minutes.`;

  // 1. Twilio Gateway
  if (provider === 'twilio') {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromPhone = process.env.TWILIO_PHONE_NUMBER;

    if (!accountSid || !authToken || !fromPhone) {
      console.warn('[SMS Gateway] Twilio credentials missing in environment. Falling back to secure logger.');
    } else {
      try {
        const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
        const bodyParams = new URLSearchParams({
          To: normalizedPhone,
          From: fromPhone,
          Body: message,
        });

        const authHeader = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            Authorization: `Basic ${authHeader}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: bodyParams.toString(),
        });

        if (!response.ok) {
          const errData = await response.json();
          console.error('[SMS Gateway - Twilio Error]', errData);
          throw new Error(errData.message || 'Failed to dispatch SMS via Twilio');
        }

        const data = await response.json();
        console.log(`[SMS Gateway - Twilio] Dispatched to ${normalizedPhone}, SID: ${data.sid}`);
        return { success: true, provider: 'twilio', messageId: data.sid };
      } catch (err) {
        console.error('[SMS Gateway - Twilio Exception]', err.message);
        throw err;
      }
    }
  }

  // 2. Fast2SMS Gateway (India)
  if (provider === 'fast2sms') {
    const apiKey = process.env.FAST2SMS_API_KEY;
    if (!apiKey) {
      console.warn('[SMS Gateway] FAST2SMS_API_KEY missing in environment. Falling back to secure logger.');
    } else {
      try {
        const clean10 = normalizedPhone.replace(/[^0-9]/g, '').slice(-10);
        const response = await fetch('https://www.fast2sms.com/dev/bulkV2', {
          method: 'POST',
          headers: {
            authorization: apiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            route: 'otp',
            variables_values: otp,
            numbers: clean10,
          }),
        });

        const data = await response.json();
        if (!data.return) {
          console.error('[SMS Gateway - Fast2SMS Error]', data);
          throw new Error(data.message?.[0] || 'Fast2SMS dispatch failed');
        }

        console.log(`[SMS Gateway - Fast2SMS] Dispatched to ${clean10}`);
        return { success: true, provider: 'fast2sms', requestId: data.request_id };
      } catch (err) {
        console.error('[SMS Gateway - Fast2SMS Exception]', err.message);
        throw err;
      }
    }
  }

  // 3. MSG91 Gateway
  if (provider === 'msg91') {
    const authKey = process.env.MSG91_AUTH_KEY;
    const templateId = process.env.MSG91_TEMPLATE_ID;
    if (!authKey || !templateId) {
      console.warn('[SMS Gateway] MSG91 credentials missing in environment. Falling back to secure logger.');
    } else {
      try {
        const cleanPhone = normalizedPhone.replace(/[^0-9]/g, '');
        const url = `https://api.msg91.com/api/v5/otp?template_id=${templateId}&mobile=${cleanPhone}&authkey=${authKey}&otp=${otp}`;
        const response = await fetch(url, { method: 'POST' });
        const data = await response.json();
        console.log(`[SMS Gateway - MSG91] Dispatched to ${cleanPhone}`);
        return { success: true, provider: 'msg91', response: data };
      } catch (err) {
        console.error('[SMS Gateway - MSG91 Exception]', err.message);
        throw err;
      }
    }
  }

  // 4. Secure Development / Test Console Gateway
  console.log(`
======================================================
[SMS Gateway - Simulated Secure Dispatch]
To:       ${normalizedPhone} (${name})
Purpose:  ${purpose}
Message:  ${message}
OTP Code: ${otp}
Expires:  5 Minutes
======================================================
  `);

  return {
    success: true,
    provider: 'console',
    devOtp: (process.env.NODE_ENV !== 'production' ? otp : undefined),
  };
};
