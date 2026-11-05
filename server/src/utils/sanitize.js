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

/**
 * Recursively strips keys starting with '$' or containing '.' from objects and arrays
 * to prevent MongoDB NoSQL query operator injection.
 * @param {any} target - The input object or array to sanitize
 * @returns {any} - Cleaned input
 */
export const sanitizeNoSql = (target) => {
  if (!target || typeof target !== 'object') return target;

  if (Array.isArray(target)) {
    for (let i = 0; i < target.length; i++) {
      target[i] = sanitizeNoSql(target[i]);
    }
    return target;
  }

  for (const key of Object.keys(target)) {
    if (key.startsWith('$') || key.includes('.')) {
      delete target[key];
    } else if (typeof target[key] === 'object' && target[key] !== null) {
      sanitizeNoSql(target[key]);
    }
  }
  return target;
};

/**
 * Global Express middleware that automatically sanitizes req.body, req.query, and req.params
 */
export const noSqlSanitizeMiddleware = (req, res, next) => {
  if (req.body) sanitizeNoSql(req.body);
  if (req.params) sanitizeNoSql(req.params);
  if (req.query) sanitizeNoSql(req.query);
  next();
};
