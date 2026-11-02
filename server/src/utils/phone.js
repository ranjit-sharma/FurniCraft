import { User } from '../models/User.js';

/**
 * Normalizes phone numbers to standard E.164-compatible format (+91XXXXXXXXXX)
 * @param {string} phone
 * @returns {string}
 */
export const normalizePhone = (phone) => {
  if (!phone) return '';
  const digits = phone.replace(/[^0-9]/g, '');
  if (digits.length === 10) {
    return `+91${digits}`;
  }
  if (digits.length === 12 && digits.startsWith('91')) {
    return `+${digits}`;
  }
  if (digits.length > 10 && phone.startsWith('+')) {
    return `+${digits}`;
  }
  return phone.trim();
};

/**
 * Finds user by email or mobile number (with flexible Indian mobile formats)
 * @param {string} identifier
 * @param {object} options
 * @returns {Promise<any>}
 */
export const findUserByIdentifier = async (identifier, { includePassword = false } = {}) => {
  if (!identifier) return null;
  const trimmed = identifier.trim();

  let query;
  if (trimmed.includes('@')) {
    query = User.findOne({ email: trimmed.toLowerCase() });
  } else {
    const digits = trimmed.replace(/[^0-9]/g, '');
    const last10 = digits.length >= 10 ? digits.slice(-10) : digits;
    const normalized = normalizePhone(trimmed);

    query = User.findOne({
      $or: [
        { phone: trimmed },
        { phone: normalized },
        { phone: new RegExp(`${last10}$`) },
      ],
    });
  }

  if (includePassword) {
    query = query.select('+password');
  }

  return query;
};
