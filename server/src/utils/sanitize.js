/**
 * Utility functions for input sanitization and security
 */

/**
 * Escapes regex special characters to prevent Regular Expression Denial of Service (ReDoS)
 * and unintended wildcard matching.
 * @param {string} str - Raw user search input
 * @returns {string} - Escaped string safe for RegExp or MongoDB $regex
 */
export const escapeRegex = (str = '') => {
  if (typeof str !== 'string') return '';
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};
