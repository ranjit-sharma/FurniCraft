import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock window.matchMedia persistently so vi.restoreAllMocks() does not wipe it out
const createMatchMedia = () => (query) => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: () => {},
  removeListener: () => {},
  addEventListener: () => {},
  removeEventListener: () => {},
  dispatchEvent: () => false,
});

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  configurable: true,
  value: createMatchMedia(),
});
