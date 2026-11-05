import { WorkerProfile } from '../models/index.js';

/**
 * Robustly generates the next sequential unique workerCode (e.g. FC-WRK-0021).
 * Inspects all existing worker profiles to determine the true arithmetic maximum
 * numeric suffix, preventing collisions caused by document deletions or gaps.
 * Also verifies uniqueness against the database in a loop to guarantee collision-free output.
 *
 * @param {string} prefix Default 'FC-WRK'
 * @returns {Promise<string>} Unique worker code
 */
export const generateUniqueWorkerCode = async (prefix = 'FC-WRK') => {
  const profiles = await WorkerProfile.find({}, 'workerCode').lean();
  let maxNum = 0;
  for (const p of profiles) {
    if (p.workerCode) {
      const match = p.workerCode.match(/\d+$/);
      if (match) {
        const num = parseInt(match[0], 10);
        if (!isNaN(num) && num > maxNum) {
          maxNum = num;
        }
      }
    }
  }

  let nextNum = Math.max(maxNum + 1, profiles.length + 1);
  let candidate = `${prefix}-${String(nextNum).padStart(4, '0')}`;

  // Double-check uniqueness against DB in loop
  while (await WorkerProfile.exists({ workerCode: candidate })) {
    nextNum++;
    candidate = `${prefix}-${String(nextNum).padStart(4, '0')}`;
  }

  return candidate;
};
