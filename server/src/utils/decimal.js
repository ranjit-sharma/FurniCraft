/**
 * Precise financial arithmetic utilities to prevent IEEE 754 floating-point inaccuracies
 */

export const toCents = (amount) => {
  if (amount === null || amount === undefined || isNaN(amount)) return 0;
  return Math.round(Number(amount) * 100);
};

export const fromCents = (cents) => {
  return Number((cents / 100).toFixed(2));
};

export const addMoney = (...amounts) => {
  const sumCents = amounts.reduce((acc, curr) => acc + toCents(curr), 0);
  return fromCents(sumCents);
};

export const subtractMoney = (minuend, ...subtrahends) => {
  const diffCents = subtrahends.reduce((acc, curr) => acc - toCents(curr), toCents(minuend));
  return fromCents(diffCents);
};

export const multiplyMoney = (amount, multiplier) => {
  const cents = Math.round(toCents(amount) * Number(multiplier));
  return fromCents(cents);
};

export const roundRupee = (amount) => {
  if (amount === null || amount === undefined || isNaN(amount)) return 0;
  return Math.round(Number(amount));
};

export const formatINR = (amount) => {
  const val = Number(amount || 0);
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(val);
};
