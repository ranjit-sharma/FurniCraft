import { AuditLog } from '../models/index.js';

// Sensitive keys to redact
const SENSITIVE_KEYS = ['password', 'passwordHash', 'token', 'resetPasswordToken', 'jwtSecret'];

const sanitizeData = (data) => {
  if (!data || typeof data !== 'object') return data;
  const sanitized = Array.isArray(data) ? [...data] : { ...data };
  for (const key of Object.keys(sanitized)) {
    if (SENSITIVE_KEYS.includes(key)) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
      sanitized[key] = sanitizeData(sanitized[key]);
    }
  }
  return sanitized;
};

export const recordAuditLog = async ({
  req,
  actorId,
  actorName,
  actorRole,
  action,
  targetType,
  targetId,
  oldValues = null,
  newValues = null,
  reason = null,
  correlationId = null,
}) => {
  try {
    const finalActorId = actorId || req?.user?._id || null;
    const finalActorName = actorName || req?.user?.name || 'SYSTEM';
    const finalActorRole = actorRole || req?.user?.role || 'SYSTEM';
    const ipAddress = req?.ip || req?.headers?.['x-forwarded-for'] || '127.0.0.1';
    const userAgent = req?.headers?.['user-agent'] || 'API';

    await AuditLog.create({
      actorId: finalActorId,
      actorName: finalActorName,
      actorRole: finalActorRole,
      action,
      targetType,
      targetId: targetId ? targetId.toString() : null,
      ipAddress,
      userAgent,
      oldValues: sanitizeData(oldValues),
      newValues: sanitizeData(newValues),
      reason,
      correlationId: correlationId || req?.headers?.['x-correlation-id'],
    });
  } catch (error) {
    console.error('[AuditService] Error logging audit event:', error.message);
    // Never fail the main business transaction due to audit write failure
  }
};
